//
//-- Defining our collections
//
NodeCollection = Backbone.Collection.extend({
    model : Node,
    initialize: function() {
      //-- This add is for the seed node alone.
      this.on("add",function(){
        updatepositions();
        $json_structure.html( prettyPrint(this.toJSON()[0]) );
        render_network(this.toJSON()[0]);
      });
      this.on("remove",function() {
        updatepositions();
        $json_structure.html( prettyPrint(this.toJSON()[0]) );
        render_network(this.toJSON()[0]);
      });
    }
});

//
//-- Defining our models
//
Node = Backbone.RelationalModel.extend({
  defaults : {
    'name' : '',
    'options' : {
      content:''
    }
  },
  url: "./",
  initialize: function() {
    this.bind("add:children", function() {
      updatepositions();
      $json_structure.html( prettyPrint(network_coll.toJSON()[0]) );
      render_network(network_coll.toJSON()[0]);
    });
    this.bind("change:name", function() {
      $json_structure.html( prettyPrint(network_coll.toJSON()[0]) );
      render_network(network_coll.toJSON()[0]);
    });
    network_coll.add(this);
  },
  relations: [{
    type: Backbone.HasMany,
    key: 'children',
    relatedModel: 'Node',
    reverseRelation: {
      key: 'parentNode',
      includeInJSON: false
    }
  }]
});

//
//-- Defining our templates
//
var html = $("#nodeTemplate").html(),
    nodeTemplate = _.template(html);

//
//-- Defining our views
//
NodeElement = Backbone.View.extend({
  //-- View to manipulate each single node
  tagName: 'div',
  className: 'node-element',
  events: {
    'click button.addchildren'  : 'addChildren',
    'click button.delete'       : 'remove',
    'dblclick .name'            : 'edit',
    'keypress .edit'            : 'updateOnEnter',
    'blur .edit'                : 'close'
  },
  initialize: function(){
    _.bindAll(this, 'render', 'remove', 'addChildren');
    this.model.bind('change', this.render);
    this.model.bind('remove', this.remove);
  },
  render: function(){
    $(this.el).html(nodeTemplate({'name':this.model.get('name')}));
    if( this.model.get('x0') != undefined) {
      $(this.el).css({'margin-left' : this.model.get('x0')+"px", 
                      'margin-top'  : this.model.get('y0')+"px"});
    }
    $(this.el).stop(false,true).animate({ 'margin-left' : this.model.get('x')+"px", 
                                          'margin-top'  : this.model.get('y')+"px"}, "fast");
    this.input = this.$('.edit');
    return this;
  },
  updateOnEnter: function(e){
    if(e.which == 13){
      this.close();
    }
  },
  close: function(){
    var value = this.input.val().trim();
    if(value) {
      this.model.set('name', value);
    }
    this.$el.removeClass('editing');
  },
  edit: function(){
    this.$el.addClass('editing');
    this.input.focus();
  },
  remove: function(){
    if(network_coll.length > 1) {
      $(this.el).remove();
      delete_all_children(this.model); 
      this.model.destroy();
    }
  },
  addChildren: function(){
    var name = 0;
    if(this.model.parentNode==null) {
      name = branch;
      branch++;
    } else {
      name = this.model.get('name')+"."+this.model.get('children').length;
    }
    var newNode = new Node({'name' : name, 'id':'node'+name, 'options':{ 'content': '' }});
    newNode.parentNode = this.model;
    this.model.get('children').add(newNode);
  }
});

NodeList = Backbone.View.extend({
  //-- View to manipulate and display list of all nodes in collection
  el: $('#svgwrapper'),
  initialize: function() {
    this.collection.bind('add', this.onModelAdded);
  },
  onModelAdded: function(addedModel) {
    var newNodeElement = new NodeElement({ model: addedModel });
    $('#svgwrapper',this.el).append(newNodeElement.render().el);
  }
});

//
//-- Utilities / Helpers
//

//-- Pretty Print JSON.
//-- @Karthik do you have a reference/source for this function?
function prettyPrint(json) {
  if (typeof json != 'string') {
       json = JSON.stringify(json, undefined, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    var cls = 'number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
            cls = 'key';
        } else {
            cls = 'string';
        }
    } else if (/true|false/.test(match)) {
        cls = 'boolean';
    } else if (/null/.test(match)) {
        cls = 'null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

//
//-- Get JSON from d3 to BackBone
//
function updatepositions()
{
  console.log()
  var d3nodes = cluster.nodes(network_coll.toJSON()[0]);
  d3nodes.forEach(function(d) { d.y = d.depth * 130; });
  d3nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
  for(var temp in network_coll["models"])
  {
    for(var innerTemp in d3nodes)
    {
      if(String(d3nodes[innerTemp].name)==String(network_coll["models"][temp].get('name')))
      {
        network_coll["models"][temp].set("x",d3nodes[innerTemp].x);
        network_coll["models"][temp].set("y",d3nodes[innerTemp].y);
        network_coll["models"][temp].set("x0",d3nodes[innerTemp].x0);
        network_coll["models"][temp].set("y0",d3nodes[innerTemp].y0);
      }
    }
  }  
}

//
//-- Function to delete all children of a node
//
function delete_all_children(seednode)
{
  var children = seednode.get('children');
  if(seednode.get('children').length>0)
  {
    for(var temp in children.models)
    {
      delete_all_children(children.models[temp]);
      children.models[temp].destroy();
    }
  }
}

//
//-- Render d3 Network
//
function render_network(dataset)
{
  var nodes = cluster.nodes(dataset),
      links = cluster.links(nodes);
  nodes.forEach(function(d) { d.y = d.depth * 130; });
  var link = svg.selectAll(".link")
    .data(links);
  link.enter()
    .insert("svg:path", "g")
    .attr("class", "link")
    .attr("d", function(d) {
      var o = {x: dataset.x0, y: dataset.y0};
      return diagonal({source: o, target: o});
      });
    link.transition()
      .duration(duration)
      .attr("d", diagonal);
    link.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {x: dataset.x, y: dataset.y};
        return diagonal({source: o, target: o});
      })
    .remove();
    nodes.forEach(function(d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  //
  //-- App init!
  //
  var width = $("#svgwrapper").width(),
      height = $("#svgwrapper").height(),
      duration = 500,
      cluster = d3.layout.tree()
                  .size([height, width]),
      diagonal = d3.svg.diagonal()
                  .projection(function(d) { return [d.x, d.y]; });
      svg = d3.select("svg").attr("width", width)
              .attr("height", height)
              .append("svg:g")
              .attr("transform", "translate(0,40)");
  var $json_structure = $('#json_structure'),
      network_coll = new NodeCollection,
      MyNodeList = new NodeList({ collection: network_coll }),
      node = new Node({'name':'ROOT'})
      branch = 1;

  //-- TASKS / IDEAS:
  //-- Might be fun to have a 'autogenerate network with X nodes and X tiers' random function, not exactly
  //-- relevant to the exact task at hand but might make you more comertable with how to leverage this collection/model structure

  //-- To note, please look at the formatting differences I made, we want to make sure the code says clean (and to help with the fact that I need to read it)
  //-- (WILL DO)

  //-- (TODO) Question to ask yourself about network_coll.counter, do you really need it? Hint: http://puff.me.uk/ss/B0DvC.png.
  //-- (DONE) - Used network_coll.length to monitor number of models in the collection. I just have to ask, what is puff.me.uk? Some ftp server?
  //-- ALMOST THERE
  //-- (DONE)

  //-- (TODO) _ templates not in a big string but using a script
  //-- (DONE)

  //-- (TODO) - "smarter" name convention to suggest depth level as well
  //          - also currently parentNode == null so that will have to be fixed to 
  //          - to access parent
  //-- (DONE)

  //-- (TODO) - keep this.options around on node to act as a storage area for metadata
  //-- (DONE)

  //-- (TODO) - convert $json_structure.html() into d3 drawing
  //-- (DONE)

  //-- (TODO) - On click of d3 node, get the model repersentation of that in Backbone collection

  //-- (TODO) - input event for name update

  //-- (TODO) - attributes to literal objects

  //-- (TODO) - question of d3 >> search through backbone || backbone with paths to draw networks

  //-- AWESOME START!


