(function(){
	// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
	var b = {
		w: 75, h: 30, s: 3, t: 10
	};
  
	 // Mapping of step names to colors.
	var colors = d3.scale.category10();
	  
	var luminance = d3.scale.sqrt()
		.clamp(true)
		.range([90, 20]);

bilevelSunburst = function (args){
	var that = this;
	
    this.container = d3.select(args.container);
    this.data = args.data;
    this.activeBreadcrumb = !(args.desactiveBreadcrumb || false);
	this.showPercentage = !(args.hidePercentage || false);
    this.explanationText = args.explanationText || "from " + this.data.name;
    this.useSize = !(args.notUseSize || false);
    
    this.width = parseFloat(this.container.style("width"));
    this.height = parseFloat(this.container.style("height"));
    this.radius = Math.min(this.width, this.height) / 2 - 10;
    
    this.totalSize = 0;
	this.arc = d3.svg.arc()
		.startAngle(function(d) { return d.x; })
		.endAngle(function(d) { return d.x + d.dx - .01 / (d.depth + .5); })
		.innerRadius(function(d) { return that.radius / 3 * d.depth; })
		.outerRadius(function(d) { return that.radius / 3 * (d.depth + 1) - 1; });
		
    //Creating div containers ...
    this.container.append("div").attr("id","sequence");
    var exp = this.container.append("div").attr("id","chart").style("position","relative").append("div").attr("id","explanation");
    exp.append("span").attr("id","percentage").style("font-size","2.5em").text(" ");
    exp.append("br");
    exp.append("span").attr("id","percentageText").text(" ");
    
    this.chart = this.container.select("#chart").append("svg:svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .append("svg:g")
      .attr("id", "svg_container")
      .attr("transform", "translate(" + this.width / 2 + "," + this.height / 2 + ")");
    
    exp.style("visibility", "hidden").style("position","absolute").style("top",(0.5*(this.height)-parseFloat(exp.style("height"))/2) + "px").style("left",(0.41*this.width) + "px").style("text-align","center").style("color","#666").style("width",0.19*this.width + "px");  
	 
    this.partition = d3.layout.partition()
						.sort(function(a, b) { return d3.ascending(a.name, b.name); })
						.size([2 * Math.PI, this.radius]);
	
	this.useSize?this.partition.value(function(d) { return d.size; }):this.partition.value(function(d) { return 1; });
	
	var nodes = this.partition
		.nodes(this.data);
		
	luminance.domain([0,nodes[0].value]);
	this.totalSize = nodes[0].value;

	// Compute the initial layout on the entire tree to sum sizes.
	// Also compute the full name and fill color for each node,
	// and stash the children so they can be restored as we descend.
	nodes.forEach(function(d) {
			d._children = d.children;
			d.sum = d.value;
			d.key = key(d);
			d.fill = fill(d); // USE LUMINANCE !!!
		});
		
	this.useSize?this.partition.value(function(d) { return d.value; }):this.partition.value(function(d) { return 1; });

	 // Now redefine the value function to use the previously-computed sum.
	this.partition
		.children(function(d, depth) { return depth < 2 ? d._children : null; })
};

bilevelSunburst.prototype.createVisualization = function(){
	var that = this;
	// Basic setup of page elements.
    if(that.activeBreadcrumb)
      that.initializeBreadcrumbTrail();
	  
	that.center = that.chart.append("circle")
      .attr("r", that.radius / 3)
      .on("click", function(d){that.zoomOut.call(that,d);});

	that.center.append("title")
		.text("zoom out");
	
	var dataToDraw = that.partition.nodes(that.data).slice(1);
	
	that.path = that.chart.selectAll("path")
      .data(dataToDraw)
	  .enter().append("path")
      .attr("d", that.arc)
      .style("fill", function(d) { return d.fill; })
      .each(function(d) { this._current = updateArc(d); })
      .on("click", function(d){that.zoomIn.call(that,d)})
	  .on("mouseover", function(d){that.mouseover.call(that,d);});
	
	that.container.select("#svg_container").on("mouseleave", function(d){that.mouseleave.call(that,d);});

}

// Fade all but the current sequence, and show it in the breadcrumb trail.
bilevelSunburst.prototype.mouseover = function(d) {
	if (document.documentElement.__transition__) return;
	
    var percentage = (100 * d.value / this.totalSize).toPrecision(3);
    var percentageString = percentage + "%";
    if (percentage < 0.1) {
      percentageString = "< 0.1%";
    }
	
    this.container.select("#percentage")
        .text(percentageString);
        
	this.container.select("#percentageText")
        .text(this.explanationText);
    
	
    this.container.select("#explanation")
        .style("visibility", this.showPercentage ? "" : "hidden");
  
    var sequenceArray = getAncestors(d);
    
    if(this.activeBreadcrumb)
      this.updateBreadcrumbs(sequenceArray, percentageString);
  
    // Fade all the segments.
    this.container.selectAll("path")
		.transition()
		.duration(10)
        .style("opacity", 0.3);
  
    // Then highlight only those that are an ancestor of the current segment.
    this.chart.selectAll("path")
        .filter(function(node) {
                  return (sequenceArray.indexOf(node) >= 0);
                })
		.transition()
		.duration(10)
        .style("opacity", 1);
};

// Restore everything to full opacity when moving off the visualization.
bilevelSunburst.prototype.mouseleave = function(d) {
	var that = this;
	
	if (document.documentElement.__transition__){
		setTimeout(function(){that.mouseleave(d);},100);
		return;
	}
	
    // Hide the breadcrumb trail
    if(this.activeBreadcrumb)
      this.container.select("#trail")
        .style("visibility", "hidden");
		
    // Transition each segment to full opacity and then reactivate it.
    this.container.selectAll("path")
        .transition()
        .duration(500)
        .style("opacity", 1);
  
	this.container.select("#explanation")
		.style("visibility", "hidden");
};  

bilevelSunburst.prototype.zoomIn = function(p) {
	if (p.depth > 1) p = p.parent;
	if (!p.children) return;
	this.zoom(p, p);
}

bilevelSunburst.prototype.zoomOut = function(p) {
	if (!p.parent) return;
    this.zoom(p.parent, p);
}

  // Zoom to the specified new root.
bilevelSunburst.prototype.zoom = function(root, p) {
	var that = this;
    if (document.documentElement.__transition__) return;

    // Rescale outside angles to match the new layout.
    var enterArc,
        exitArc,
        outsideAngle = d3.scale.linear().domain([0, 2 * Math.PI]);

    function insideArc(d) {
      return p.key > d.key
          ? {depth: d.depth - 1, x: 0, dx: 0} : p.key < d.key
          ? {depth: d.depth - 1, x: 2 * Math.PI, dx: 0}
          : {depth: 0, x: 0, dx: 2 * Math.PI};
    }

    function outsideArc(d) {
      return {depth: d.depth + 1, x: outsideAngle(d.x), dx: outsideAngle(d.x + d.dx) - outsideAngle(d.x)};
    }

    that.center.datum(root);

    // When zooming in, arcs enter from the outside and exit to the inside.
    // Entering outside arcs start from the old layout.
    if (root === p) enterArc = outsideArc, exitArc = insideArc, outsideAngle.range([p.x, p.x + p.dx]);

    that.path = that.path.data(that.partition.nodes(root).slice(1), function(d) { return d.key; });

    // When zooming out, arcs enter from the inside and exit to the outside.
    // Exiting outside arcs transition to the new layout.
    if (root !== p) enterArc = insideArc, exitArc = outsideArc, outsideAngle.range([p.x, p.x + p.dx]);

    d3.transition().duration(d3.event.altKey ? 7500 : 750).each(function() {
      that.path.exit().transition()
          .style("fill-opacity", function(d) { return d.depth === 1 + (root === p) ? 1 : 0; })
          .attrTween("d", function(d) { return arcTween.call(this, exitArc(d), that.arc); })
          .remove();

      that.path.enter().append("path")
          .style("fill-opacity", function(d) { return d.depth === 2 - (root === p) ? 1 : 0; })
          .style("fill", function(d) { return d.fill; })
          .on("click", function(d){that.zoomIn.call(that,d)})
		  .on("mouseover", function(d){that.mouseover.call(that,d);})
          .each(function(d) { this._current = enterArc(d); });

      that.path.transition()
          .style("fill-opacity", 1)
          .attrTween("d", function(d) { return arcTween.call(this, updateArc(d), that.arc); });
    });
  }
  
  
  
  
   //-----------------------------------------------
  //What follows is only linked with the BREADCRUMB
  
  bilevelSunburst.prototype.initializeBreadcrumbTrail = function() {
    // Add the svg area.
    var trail = this.container.select("#sequence").append("svg:svg")
        .attr("width", this.width)
        .attr("height", 50)
        .attr("id", "trail");
    // Add the label at the end, for the percentage.
    trail.append("svg:text")
      .attr("id", "endlabel")
      .style("fill", "#000");
  };
  
  // Generate a string that describes the points of a breadcrumb polygon.
  bilevelSunburst.prototype.breadcrumbPoints = function(d, i) {
	var canvas = document.createElement('canvas');
	var ctx = canvas.getContext("2d");
	ctx.font = "16px 'Times New Roman'";
	var w = ctx.measureText(d.name).width+20;
  
    var points = [];
    points.push("0,0");
    points.push(w + ",0");
    points.push(w + b.t + "," + (b.h / 2));
    points.push(w + "," + b.h);
    points.push("0," + b.h);
    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
      points.push(b.t + "," + (b.h / 2));
    }
    return points.join(" ");
  };
  
  // Update the breadcrumb trail to show the current sequence and percentage.
  bilevelSunburst.prototype.updateBreadcrumbs = function(nodeArray, percentageString) {
	var that = this;
	var translate = 0;
	var canvas = document.createElement('canvas');
	var ctx = canvas.getContext("2d");
	ctx.font = "16px 'Times New Roman'";
	
    // Data join; key function combines name and depth (= position in sequence).
    var g = this.container.select("#trail")
        .selectAll("g")
        .data(nodeArray, function(d,i) { return d.name + i; });
  
    // Add breadcrumb and label for entering nodes.
    var entering = g.enter().append("svg:g");
  
    entering.append("svg:polygon")
        .attr("points", this.breadcrumbPoints)
        .style("fill", function(d) { return d.fill; });
  
    entering.append("svg:text")
        .attr("x", function(d,i){ var w = ctx.measureText(d.name).width+20; return(w + b.t) / 2})
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
		.style("font-size","16px")
		.style("font-style","'Times New Roman'")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.name; });
	
	this.container.selectAll("#sequence text").style("font-weight","600").style("fill","#fff");
  
    // Set position for entering and updating nodes.
    g.attr("transform", function(d, i) {
		var str = "translate(" + translate + ", 0)"
		translate += ctx.measureText(d.name).width+20+b.t;
		return str;
    });
  
    // Remove exiting nodes.
    g.exit().remove();
  
    // Now move and update the percentage at the end.
    this.container.select("#trail").select("#endlabel")
        .attr("x", translate+30)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(percentageString)
		.style("fill","#000");
  
    // Make the breadcrumb trail visible, if it's hidden.
    this.container.select("#trail")
        .style("visibility", "");
  };
  
  

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.

function getAncestors(node) {
    var path = [];
    var current = node;
    while (current.parent) {
		path.unshift(current);
		current = current.parent;
    }
    return path;
};
  
function key(d) {
  var k = [], p = d;
  while (p.depth) k.push(p.name), p = p.parent;
  return k.reverse().join(".");
}

function fill(d) {
  var p = d;
  while (p.depth > 1) p = p.parent;
  var c = d3.lab(colors(p.name));
  c.l = luminance(d.sum);
  return c;
}

function arcTween(b, arc) {
  var i = d3.interpolate(this._current, b);
  this._current = i(0);
  return function(t) {
    return arc(i(t));
  };
}

function updateArc(d) {
  return {depth: d.depth, x: d.x, dx: d.dx};
}

//d3.select(self.frameElement).style("height", height + "px");
})();
