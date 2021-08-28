import cytoscape from 'cytoscape';

// +-----------------------------+
// |        INITIALISATION       |
// +-----------------------------+

let BLACK = "black";
let WHITE = "white";

let u = vertex('u');
let v = vertex('v');
let w = vertex('w');

let g = graph([u, v, w], [])
  .addEdge(edge('uv', u, v))
  .addEdge(edge('vw', v, w))
  .addEdge(edge('wu', w, u));

let c = colouring(g, {
  [u.id]: WHITE,
  [v.id]: BLACK,
  [w.id]: WHITE,
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

// +-----------------------------+
// |    DATA STRUCTURES          |
// +-----------------------------+

function vertex(id) {
  return {
    id
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
      return graph([...this.vertices, vertex], this.edges);
    },

    addEdge: function(edge) {
      return graph(this.vertices, [...this.edges, edge]);
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

    toCytoscape: function() {
      let elements = [];

      for (let vertex of this.graph.vertices) {
        elements.push({
          data: {
            id: vertex.id
          },

          classes: [this.colours[vertex.id]],
        });
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
// |    UTILITIES AND HOOKS      |
// +-----------------------------+

function mutateColouring(fn) {
  let c = cy.data();
  for (let vertex of c.graph.vertices) {
    cy.$('#' + vertex.id).removeClass(c.colours[vertex.id]);
  }

  c = fn(c);
  for (let vertex of c.graph.vertices) {
    cy.$('#' + vertex.id).addClass(c.colours[vertex.id]);
  }

  cy.data(c);
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

window.WHITE = WHITE;
window.BLACK = BLACK;
window.colourSelected = (colour) => mutateColouring(colourSelectedVertices(colour));
window.updateColouring = () => mutateColouring((c) => c.updateColouring());
