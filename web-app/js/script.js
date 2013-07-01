//author gkarthik
var json = {name: "1", children : [{name:"2",children : [{name:"4",children : [] },{name:"5",children : [] }] },{name:"3",children : [] }]};
var ctr = 6;
var width = 500,
    height = 400;
    
var cluster = d3.layout.tree()
    .size([height, width-160]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.x, d.y]; });

var duration = 500;

var svg = d3.select("body").append("svg").attr("width", width)
				    .attr("height", height)
				    .append("svg:g")
				    .attr("transform", "translate(0,40)");
render_tree(json);

function render_tree(dataset)
    {
      var nodes = cluster.nodes(dataset),
          links = cluster.links(nodes);
          
      nodes.forEach(function(d) { d.y = d.depth * 130; });
       
      var node = svg.selectAll("g.node")
        .data(nodes);
      
      var nodeEnter= node.enter().append("svg:g")
        .attr("class", "node")
        .attr("id",function(d){ return "node"+d.name; })
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
      
      nodeEnter.append("svg:rect")
        .attr("x", -25)
        .attr("y", -15)
        .attr("height", 30)
        .attr("width", 50)
        .style("fill","steelblue");
    
      nodeEnter.append("text")
        .attr("dx",3)
        .attr("dy",3.5)
        .style("fill","#FFF")
        .style("text-anchor", function(d) { return "end";} )
        .text(function(d) { return d.name; });
      
      var nodeUpdate = node.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        
      var link = svg.selectAll(".link")
        .data(links)
     
      link.enter().insert("svg:path", "g")
      .attr("class", "link")
      .attr("d", function(d) {
        var o = {x: dataset.x0, y: dataset.y0};
        return diagonal({source: o, target: o});
      })
    .transition()
      .duration(duration)
      .attr("d", diagonal);
      
      link.transition()
      .duration(duration)
      .attr("d", diagonal);
      
      nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
    }

d3.selectAll(".node").on("dblclick",function(d){
    console.log(d3.selectAll("#node"+d.name).data());
    d3.selectAll("#node"+d.name).data()[0].children.push({'name': ctr,'children':[]});
    ctr++;
    render_tree(json);
});

function add_to_json(source,name)
{
	if(source["name"]==name)
	{
	   source["children"].push({'name': ctr, 'children' : [] }); 
	   ctr++;
	}
	
	if(source["children"].length>0)
	{
	    for(var temp in source["children"])
	    {
		add_to_json(source["children"][temp],name);
	    }
	}
}
