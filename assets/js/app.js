    //
    //-- Defining the App
    //
    Cure = new Backbone.Marionette.Application();
    
    //
    //-- Defining our collections
    //
    NodeCollection = Backbone.Collection.extend({
        model : Node,
        initialize: function() {
          //This add is for the seed node alone.      
          this.on("add",function(){
            Cure.updatepositions();
            Cure.render_network(this.toJSON()[0]);
          });
          this.on("remove",function() {
            Cure.updatepositions();
            Cure.render_network(this.toJSON()[0]);
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
          Cure.updatepositions();
          Cure.render_network(Cure.NodeCollection.toJSON()[0]);          
        });
        this.bind("change:name", function() {
          Cure.render_network(Cure.NodeCollection.toJSON()[0]);
        });          
        Cure.NodeCollection.add(this);
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
    //-- Defining our views
    //
    NodeView = Backbone.Marionette.ItemView.extend({
      //-- View to manipulate each single node
      tagName: 'div',
      ui: {
        input: ".edit"
      },
      template: "#nodeTemplate",
      events: {
        'click button.addchildren'  : 'addChildren',
        'click button.delete'       : 'remove',
        'dblclick .name': 'edit',
        'keypress .edit' : 'updateOnEnter',
        'blur .edit' : 'close'
      },
      initialize: function(){
        _.bindAll(this, 'remove', 'addChildren');
        this.model.bind('change', this.render);
        this.model.bind('remove', this.remove);
        this.$el.addClass("node");
      },
      onBeforeRender: function(){
        if(this.model.get('x0')!=undefined)
        {
          $(this.el).css({'margin-left': this.model.get('x0')+"px", 
                          'margin-top': this.model.get('y0')+"px"});          
        }    
        $(this.el).stop(true,false).animate({'margin-left': (this.model.get('x')-(($(this.el).width())/2))+"px", 
                                             'margin-top': (this.model.get('y')+10)+"px"},500);        
      },
      updateOnEnter: function(e){
        if(e.which == 13){
          this.close();
        }
      },
      close: function(){
        var value = this.ui.input.val().trim();
        if(value) {
          this.model.set('name', value);
        }
        this.$el.removeClass('editing');
      },
      edit: function(){
        this.$el.addClass('editing');
        this.ui.input.focus();
      },
      remove: function(){
        if(Cure.NodeCollection.length > 1) {
          $(this.el).remove();
          Cure.delete_all_children(this.model); 
          this.model.destroy();
        }
      },
      addChildren: function(){
        var name = 0;
        if(this.model.parentNode==null) {
          name = Cure.branch;
          Cure.branch++;
        } else {
          name = this.model.get('name')+"."+this.model.get('children').length;
        }
        var newNode = new Node({'name' : name, 'id':'node'+name, 'options':{ 'content': '' }});
        newNode.parentNode = this.model;
        this.model.get('children').add(newNode);
      }
    });

    NodeCollectionView = Backbone.Marionette.CollectionView.extend({
      //-- View to manipulate and display list of all nodes in collection
      itemView: NodeView,
      initialize: function() {
        this.collection.bind('add', this.onModelAdded);
      },
      onModelAdded: function(addedModel) {
        var newNodeview = new NodeView({ model: addedModel });
        newNodeview.render();
      }
    });
    
    var template_html = $("#JSONtemplate").html();
    JSONItemView = Backbone.Marionette.ItemView.extend({
      //-- View to render JSON
      model: Node,
      ui:{
        jsondata: ".jsonview_data",
        showjson: ".showjson"
      },
      events:{
        'click .showjson': 'ShowJSON',
        'blur .jsonview_data' : 'HideJSON'
      },
      tagName: 'tr',
      initialize: function() {
        this.model.bind('add:children', this.render);
        this.model.bind('change:name', this.render);
      },
      template : function(serialized_model) {
        var name = serialized_model.name;
        var jsondata = Cure.prettyPrint(serialized_model);
        return _.template(template_html, {name : name,jsondata : jsondata}, {variable: 'args'});
      },
      ShowJSON: function(){
        this.ui.showjson.addClass("disabled");
        this.ui.jsondata.css({'display':'block'});
        this.ui.jsondata.focus();
      },
      HideJSON: function(){
        this.ui.jsondata.css({'display':'none'});
        this.ui.showjson.removeClass("disabled");
      }
    });

    JSONCollectionView = Backbone.Marionette.CollectionView.extend({
      //-- View to render JSON
      itemView: JSONItemView, 
      collection: NodeCollection,
      initialize: function() {
        this.collection.bind('remove', this.render);
      }
    });
    //
    //-- Utilities / Helpers
    //

    //-- Pretty Print JSON.
    //-- Ref : http://stackoverflow.com/questions/4810841/json-pretty-print-using-javascript
    Cure.prettyPrint = function (json) {
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
        return match;
      });
    }
    
    //
    //-- Get JSON from d3 to BackBone
    //
    Cure.updatepositions = function ()
    {
      var d3nodes = Cure.cluster.nodes(Cure.NodeCollection.toJSON()[0]);
      d3nodes.forEach(function(d) { d.y = d.depth * 130 ;});
      d3nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });
      for(var temp in Cure.NodeCollection["models"])
      {
        for(var innerTemp in d3nodes)
        {
          if(String(d3nodes[innerTemp].name)==String(Cure.NodeCollection["models"][temp].get('name')))
          {
            Cure.NodeCollection["models"][temp].set("x",d3nodes[innerTemp].x);
            Cure.NodeCollection["models"][temp].set("y",d3nodes[innerTemp].y);
            Cure.NodeCollection["models"][temp].set("x0",d3nodes[innerTemp].x0);
            Cure.NodeCollection["models"][temp].set("y0",d3nodes[innerTemp].y0);   
          }
        }
      }  
    }
    
    //
    //-- Function to delete all children of a node
    //
    Cure.delete_all_children = function (seednode)
    {
      var children = seednode.get('children');
      if(seednode.get('children').length>0)
      {
        for(var temp in children.models)
        {
          Cure.delete_all_children(children.models[temp]);
          children.models[temp].destroy();
        }
      }
    }
    
    //
    //-- Render d3 Network
    //
    Cure.render_network = function(dataset)
    {
      var nodes = Cure.cluster.nodes(dataset),
          links = Cure.cluster.links(nodes);
      nodes.forEach(function(d) { d.y = d.depth * 130; });
      var link = Cure.svg.selectAll(".link")
        .data(links);
      link.enter()
        .insert("svg:path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
          var o = {x: dataset.x0, y: dataset.y0};
          return Cure.diagonal({source: o, target: o});
        });
      link.transition()
        .duration(Cure.duration)
        .attr("d", Cure.diagonal);
      link.exit().transition()
        .duration(Cure.duration)
        .attr("d", function(d) {
          var o = {x: dataset.x, y: dataset.y};
          return Cure.diagonal({source: o, target: o});
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
        
    Cure.addInitializer(function(options){
      //Declaring D3 Variables
      Cure.width = $("#svgwrapper").width(),
      Cure.height = $("#svgwrapper").height(),
      Cure.duration = 500,
      Cure.cluster = d3.layout.tree()
                    .size([Cure.width, Cure.height]),
      Cure.diagonal = d3.svg.diagonal()
                    .projection(function(d) { return [d.x, d.y]; });
      Cure.svg = d3.select("svg").attr("width", Cure.width)
                .attr("height", Cure.height)
                .append("svg:g")
                .attr("transform", "translate(0,40)");
                
      
      Cure.NodeCollection = new NodeCollection();
      Cure.NodeCollectionView = new NodeCollectionView({ collection: Cure.NodeCollection }),
      Cure.JSONCollectionView = new JSONCollectionView({ collection: Cure.NodeCollection });
      
      //Assign View to Region
      Cure.addRegions({
        TreeRegion: "#svgwrapper",
        JsonRegion: "#json_structure"
      });
      Cure.TreeRegion.show(Cure.NodeCollectionView);
      Cure.JsonRegion.show(Cure.JSONCollectionView);
        
      //Add Root Node to Collection
      Cure.RootNode = new Node({'name':'ROOT'})
      Cure.branch = 1;
    });
    
    Cure.start();
    
    //-- TASKS / IDEAS:
    //-- Might be fun to have a 'autogenerate network with X nodes and X tiers' random function, not exactly
    //-- relevant to the exact task at hand but might make you more comertable with how to leverage this collection/model structure

    //-- To note, please look at the formatting differences I made, we want to make sure the code says clean (and to help with the fact that I need to read it)
    //-- (WILL DO)

    //-- (TODO) Question to ask yourself about Cure.NodeCollection.counter, do you really need it? Hint: http://puff.me.uk/ss/B0DvC.png.
    //-- (DONE) - Used Cure.NodeCollection.length to monitor number of models in the collection. I just have to ask, what is puff.me.uk? Some ftp server?
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
    //-- (DONE - ItemView Linked with every node)

    //-- (TODO) - input event for name update

    //-- (TODO) - attributes to literal objects
    //-- (DONE) - Most of the d3 removed since nodes are rendered by Marionette.
    
    //-- (TODO) - question of d3 >> search through backbone || backbone with paths to draw networks
    //-- (DONE) - D3 renders Paths. BackBone renders the nodes.

    //-- AWESOME START!