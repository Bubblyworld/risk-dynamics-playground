import cytoscape from 'cytoscape';

// +-----------------------------+
// |        INITIALISATION       |
// +-----------------------------+

let BLACK = "black";
let WHITE = "white";
let UUID = 1;

let u = vertex('u');
let v = vertex('v');
let w = vertex('w');
let x = vertex('x');

let g = graph([u, v, w, x], [])
  .addEdge(u, v)
  .addEdge(u, w)
  .addEdge(u, x)
  .addEdge(w, x);

let c = colouring(g, {
  [u.id]: WHITE,
  [v.id]: BLACK,
  [w.id]: WHITE,
  [x.id]: BLACK,
});

let cy = cytoscape({
  data: c,
  elements: c.toCytoscape(),
  container: document.getElementById('editor'),
  layout: { name: 'cose' },
  style: [
    {
      selector: 'node',
      style: {
        'border-color': (elem) => elem.selected() ? 'blue' : 'black',
        'border-width': (elem) => elem.selected() ? '2px' : '1px',
        'background-color': 'gray',
        'label': 'data(id)'
      }
    },
    {
      selector: '.black',
      style: {
        'background-color': '#303030'
      }
    },
    {
      selector: '.white',
      style: {
        'background-color': 'white'
      }
    },
  ]
});

cy.on('tap', createVertexOnTap);

// +-----------------------------+
// |    DATA STRUCTURES          |
// +-----------------------------+

function vertex(id) {
  return {
    id
  };
}

function vertexAt(id, x, y) {
  return {
    id,
    x,
    y
  };
}

function edge(id, source, target) {
  return {
    id,
    source,
    target,

    contains: function(vertex) {
      return this.source.id == vertex.id || this.target.id == vertex.id;
    },

    connects: function(vertexA, vertexB) {
      return this.contains(vertexA) && this.contains(vertexB);
    },

    other: function(vertex) {
      if (!this.contains(vertex)) {
        alert('Invariant failed in edge.other().');
        return source;
      }

      return (this.source.id == vertex.id) ? this.target : this.source;
    }
  };
}

function graph(vertices, edges) {
  return {
    vertices,
    edges,

    addVertex: function(vertex) {
      if (this.containsVertex(vertex)) {
        return this;
      }

      return graph([...this.vertices, vertex], this.edges);
    },

    containsVertex: function(vertex) {
      return vertex.id in this.vertices.map(v => v.id);
    },

    addEdge: function(vertexA, vertexB) {
      if (this.containsEdge(vertexA, vertexB)) {
        return this;
      }

      let e = edge(`${vertexA.id}_${vertexB.id}`, vertexA, vertexB);
      return graph(this.vertices, [...this.edges, e]);
    },

    containsEdge: function(vertexA, vertexB) {
      for (let edge of this.edges) {
        if (edge.connects(vertexA, vertexB)) {
          return true;
        }
      }

      return false;
    }
  };
}

function colouring(graph, colours) {
  return {
    graph,
    colours,

    setColour: function(vertex, colour) {
      return colouring(graph, { ...colours, [vertex.id]: colour });
    },

    getColourWeight: function(vertex, colour) {
      let weight = (this.colours[vertex.id] == colour) ? 1.5 : 0;

      for (let edge of this.graph.edges) {
        if (!edge.contains(vertex)) continue;

        weight += (this.colours[edge.other(vertex).id] == colour) ? 1.0 : 0;
      }

      return weight;
    },

    updateColouring: function() {
      let colours = {};
      for (let vertex of this.graph.vertices) {
        if (this.getColourWeight(vertex, WHITE) > this.getColourWeight(vertex, BLACK))
          colours[vertex.id] = WHITE;
        else
          colours[vertex.id] = BLACK;
      }

      return colouring(this.graph, colours);
    },

    connect: function(vertexA, vertexB) {
      return colouring(this.graph.addEdge(vertexA, vertexB), this.colours);
    },

    add: function(colour, x, y) {
      let vertex = vertexAt(getUUID(), x, y);
      let graph = this.graph.addVertex(vertex);
      return colouring(graph, { ...this.colours, [vertex.id]: colour });
    },

    toCytoscape: function() {
      let elements = [];

      for (let vertex of this.graph.vertices) {
        let data = {
          data: {
            id: vertex.id
          },

          classes: [this.colours[vertex.id]],
        };

        if (vertex.x !== undefined && vertex.y !== undefined) {
          data.position = {
            x: vertex.x,
            y: vertex.y
          };
        }

        elements.push(data);
      }

      for (let edge of this.graph.edges) {
        elements.push({
          data: { 
            id: edge.id,
            source: edge.source.id,
            target: edge.target.id
          }
        });
      }

      return elements;
    }
  };
}

// +-----------------------------+
// |    UTILITIES                |
// +-----------------------------+

function mutateColouring(fn) {
  let c = cy.data();
  for (let vertex of c.graph.vertices) {
    cy.$('#' + vertex.id).removeClass(c.colours[vertex.id]);
  }

  c = fn(c);
  cy.data(c);
  cy.add(c.toCytoscape());
  for (let vertex of c.graph.vertices) {
    cy.$('#' + vertex.id).addClass(c.colours[vertex.id]);
  }
}

function getSelectedVertices() {
  let res = [];
  for (let elem of cy.nodes()) {
    if (elem.selected()) {
      res.push(vertex(elem.id()));
    }
  }

  return res;
}

function colourSelectedVertices(colour) {
  return (c) => {
    let vertices = getSelectedVertices();
    for (let vertex of vertices) {
      c = c.setColour(vertex, colour);
    }

    return c;
  };
}

function unselectSelected() {
  for (let elem of [...cy.nodes(), ...cy.edges()]) {
    if (elem.selected()) {
      elem.unselect();
    }
  }
}

function connectSelectedVertices() {
  return (c) => {
    let vertices = getSelectedVertices();
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i+1; j < vertices.length; j++) {
        c = c.connect(vertices[i], vertices[j]);
      }
    }

    return c;
  };
}

function createVertexOnTap(event) {
  if (event.target != cy) {
    return; // user clicked on a vertex, not the background
  }

  mutateColouring((c) => c.add(BLACK, event.position.x, event.position.y));
  unselectSelected();
}

function getUUID() {
  return `v${UUID++}`;
}

// +-----------------------------+
// |   HOOKS                     |
// +-----------------------------+

window.WHITE = WHITE;
window.BLACK = BLACK;

window.colourSelected = (colour) => {
  mutateColouring(colourSelectedVertices(colour));
  unselectSelected();
}

window.connectSelected = () => {
  mutateColouring(connectSelectedVertices());
  unselectSelected();
}

window.updateColouring = () => {
  mutateColouring((c) => c.updateColouring());
}
