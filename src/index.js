import cytoscape from "cytoscape";
import mousetrap from "mousetrap";

// +-----------------------------+
// |        INITIALISATION       |
// +-----------------------------+

let BLACK = "black";
let WHITE = "white";
let UUID = 1;
let EDITOR_ID = "editor";
let DATA_ID = "text";

let u = vertex("u");
let v = vertex("v");
let w = vertex("w");
let x = vertex("x");

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
  container: document.getElementById(EDITOR_ID),
  layout: { name: "cose" },
  style: [
    {
      selector: "node",
      style: {
        "border-color": (elem) => elem.selected() ? "blue" : "black",
        "border-width": (elem) => elem.selected() ? "2px" : "1px",
        "background-color": "gray",
        "label": "data(id)"
      }
    },
    {
      selector: ".black",
      style: {
        "background-color": "#303030"
      }
    },
    {
      selector: ".white",
      style: {
        "background-color": "white"
      }
    },
  ]
});

cy.on("tap", createVertexOnTap);

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
        alert("Invariant failed in edge.other().");
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
      let vertices = [
        ...this.vertices.filter(v => v.id != vertex.id),
        vertex,
      ];

      return graph(vertices, this.edges);
    },

    removeVertex: function(vertex) {
      let vertices = this.vertices.filter(v => v.id !== vertex.id);
      let edges = this.edges.filter(e => !e.contains(vertex));

      return graph(vertices, edges);
    },

    containsVertex: function(vertex) {
      return this.vertices.map(v => v.id).includes(vertex.id);
    },

    addEdge: function(vertexA, vertexB) {
      if (this.containsEdge(vertexA, vertexB)) {
        return this;
      }

      let e = edge(`${vertexA.id}_${vertexB.id}`, vertexA, vertexB);
      return graph(this.vertices, [...this.edges, e]);
    },

    removeEdge: function(edge) {
      let edges = this.edges.filter(e => e.id !== edge.id);

      return graph(this.vertices, edges);
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

    disconnect: function(edge) {
      return colouring(this.graph.removeEdge(edge), this.colours);
    },

    add: function(colour, x, y) {
      let vertex = vertexAt(getUUID(), x, y);
      let graph = this.graph.addVertex(vertex);
      return colouring(graph, { ...this.colours, [vertex.id]: colour });
    },

    remove: function(vertex) {
      let { [vertex.id]: _, ...colours } = this.colours;
      return colouring(this.graph.removeVertex(vertex), colours);
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

updateDataText();

// +-----------------------------+
// |    UTILITIES                |
// +-----------------------------+

function mutateColouring(fn) {
  let c = cy.data();
  let _c = fn(c);

  // Remove colours from all of c"s vertices.
  for (let vertex of c.graph.vertices) {
    cy.$(`#${vertex.id}`).removeClass(c.colours[vertex.id]);
  }

  // Delete vertices and edges that aren"t present in the new colouring.
  for (let edge of c.graph.edges) {
    if (!_c.graph.containsEdge(edge.source, edge.target)) {
      cy.$(`#${edge.id}`)[0].remove();
    }
  }

  for (let vertex of c.graph.vertices) {
    if (!_c.graph.containsVertex(vertex)) {
      cy.$(`#${vertex.id}`)[0].remove();
    }
  }

  // Add in new vertices and edges that aren"t present in the old colouring.
  cy.data(_c);
  cy.add(_c.toCytoscape());

  // Recolor vertices to reflect possibly new labels.
  for (let vertex of _c.graph.vertices) {
    cy.$(`#${vertex.id}`).addClass(_c.colours[vertex.id]);
  }

  // Regenerate data for user.
  updateDataText();
}

function getSelectedVertices() {
  let res = [];
  for (let elem of cy.nodes()) {
    if (elem.selected()) {
      res.push(vertexAt(elem.id(), elem.position.x, elem.position.y));
    }
  }

  return res;
}

function getSelectedEdges() {
  let res = [];
  for (let elem of cy.edges()) {
    if (elem.selected()) {
      res.push(edge(elem.id(), vertex(elem.source().id()), vertex(elem.target().id())));
    }
  }

  return res;
}

function colourSelectedVertices(colour) {
  return (c) => {
    let vertices = getSelectedVertices();
    for (let v of vertices) {
      c = c.setColour(v, colour);
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

function deleteSelected() {
  return (c) => {
    for (let v of getSelectedVertices()) {
      c = c.remove(v);
    }

    for (let e of getSelectedEdges()) {
      c = c.disconnect(e);
    }

    return c;
  };
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

function biconnectSelectedVertices() {
  return (c) => {
    let vertices = getSelectedVertices();
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i+1; j < vertices.length; j++) {
        let colourI = c.colours[vertices[i].id];
        let colourJ = c.colours[vertices[j].id];

        if (colourI !== colourJ) {
          c = c.connect(vertices[i], vertices[j]);
        }
      }
    }

    return c;
  };
}

function serialiseColouring() {
  let c = cy.data();

  let res = {
    vertices: [],
    edges: [...c.graph.edges],
    colours: { ...c.colours }
  };

  for (let elem of cy.nodes()) {
    res.vertices.push(vertexAt(elem.id(), elem.position().x, elem.position().y)); 
  }

  return JSON.stringify(res, null, 0);
}

function deserialiseColouring(json) {
  let data = JSON.parse(json);

  let vertices = [];
  for (let v of data.vertices) {
    vertices.push(vertexAt(v.id, v.x, v.y));
  }
  
  let edges = [];
  for (let e of data.edges) {
    edges.push(edge(e.id, vertex(e.source.id), vertex(e.target.id)));
  }

  return colouring(graph(vertices, edges), data.colours);
}

function updateDataText() {
  document.getElementById(DATA_ID).textContent = serialiseColouring();
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
// |   HOOKS AND HOTKEYS         |
// +-----------------------------+

window.cy = cy;
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

window.biconnectSelected = () => {
  mutateColouring(biconnectSelectedVertices());
  unselectSelected();
}

window.deleteSelected = () => {
  mutateColouring(deleteSelected());
}

window.updateColouring = () => {
  mutateColouring((c) => c.updateColouring());
}

window.saveDataToClipboard = () => {
  if (!navigator.clipboard) {
    alert("Saving to clipboard is not supported in your browser.");
    return;
  }

  let data = serialiseColouring();
  navigator.clipboard.writeText(data).then(
    success => alert("Saved data to clipboard."),
    err => console.error("Error saving to clipboard: " + err)
  );
}

window.loadDataFromPrompt = () => {
  let data = prompt("Paste graph data below:");

  try {
    mutateColouring((_) => deserialiseColouring(data));
  } catch (err) {
    console.error("Error deserialising colouring: " + err);
    alert("Invalid graph data.");
  }
}

mousetrap.bind(["W", "w"], () => window.colourSelected(WHITE));
mousetrap.bind(["B", "b"], () => window.colourSelected(BLACK));
mousetrap.bind(["C", "c"], () => window.connectSelected());
mousetrap.bind(["n", "N"], () => window.biconnectSelected());
mousetrap.bind(["U", "u"], () => window.updateColouring());
mousetrap.bind(["d", "D", "backspace"], () => window.deleteSelected());
mousetrap.bind(["s", "S"], () => window.saveDataToClipboard());
mousetrap.bind(["l", "L"], () => window.loadDataFromPrompt());
