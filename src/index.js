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
  elements: c.toCytoscape(),
  container: document.getElementById('editor'),

  style: [
    {
      selector: 'node',
      style: {
        'border-color': 'black',
        'border-width': '1px',
        'background-color': 'gray'
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
    target
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
    },

    toCytoscape: function() {
      let elements = [];

      for (let vertex of this.vertices) {
        elements.push({
          data: {
            id: vertex.id
          }
        });
      }

      for (let edge of this.edges) {
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

// Colours is a map from vertex id to colour constant.
function colouring(graph, colours) {
  return {
    graph,
    colours,

    setColour: function(vertex, colour) {
      return colouring(graph, { ...colours, [vertex.id]: colour });
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
