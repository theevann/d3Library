(function(){
  // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
  var b = {
    w: 75, h: 30, s: 3, t: 10
  };
  
  // Mapping of step names to colors.
  var colors = d3.scale.category20c();
  var arc = d3.svg.arc()
      .startAngle(function(d) { return d.x; })
      .endAngle(function(d) { return d.x + d.dx; })
      .innerRadius(function(d) { return Math.sqrt(d.y); })
      .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });
    
  sequenceSunburst = function (args){
    this.container = d3.select(args.container);
    this.data = args.data;
    this.activeBreadcrumb = args.activeBreadcrumb || true;
    this.explanationText = args.explanationText || "";
    this.useSize = args.useSize || true;
    
    this.width = parseFloat(this.container.style("width"));
    this.height = parseFloat(this.container.style("height"));
    this.radius = Math.min(this.width, this.height) / 2;
    
    this.totalSize = 0;
    
    //Creating div containers ...
    this.container.append("div").attr("id","sequence");
    var exp = this.container.append("div").attr("id","chart").append("div").attr("id","explanation");
    exp.style("visibility", "hidden").style("position","absolute").style("top",0.43*this.height + "px").style("left",0.4*this.width + "px").style("text-align","center").style("color","#666").style("width",0.19*this.width + "px");
    exp.append("span").attr("id","percentage").style("font-size","2.5em");
    exp.append("br");
    exp.append("span").attr("id","percentageText");
    
    this.chart = this.container.select("#chart").append("svg:svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .append("svg:g")
      .attr("id", "svg_container")
      .attr("transform", "translate(" + this.width / 2 + "," + this.height / 2 + ")");
      
    this.partition = d3.layout.partition()
      .size([2 * Math.PI, this.radius * this.radius]);
    this.useSize?this.partition.value(function(d) { return d.size; }):this.partition.value(function(d) { return 1; });

    /*
    #sequence text, #legend text {
      font-weight: 600;
      fill: #fff;
    }
    
    #chart {
      position: relative;
    }
    
    #chart path {
      stroke: #fff;
    }
    
    */
  };
  
  // Main function to draw and set up the visualization, once we have the data.
  sequenceSunburst.prototype.createVisualization = function(){
    var that = this;
    // Basic setup of page elements.
    if(this.activeBreadcrumb)
      this.initializeBreadcrumbTrail();
  
    // Bounding circle underneath the sunburst, to make it easier to detect
    // when the mouse leaves the parent g.
    this.chart.append("svg:circle")
        .attr("r", this.radius)
        .style("opacity", 0);
  
    // For efficiency, filter nodes to keep only those large enough to see.
    var nodes = this.partition.nodes(this.data)
        .filter(function(d) {
        return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
        });
  
    var path = this.chart.data([this.data]).selectAll("path")
        .data(nodes)
        .enter().append("svg:path")
        .attr("display", function(d) { return d.depth ? null : "none"; })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("fill", function(d) { return colors(d.name); })
        .style("opacity", 1)
        .on("mouseover", function(d){that.mouseover.call(that,d)});
  
    // Add the mouseleave handler to the bounding circle.
    this.container.select("#svg_container").on("mouseleave", function(d){that.mouseleave.call(that,d)});
  
    // Get total size of the tree = value of root node from partition.
    this.totalSize = path.node().__data__.value;
   };
  
  // Fade all but the current sequence, and show it in the breadcrumb trail.
  sequenceSunburst.prototype.mouseover = function(d) {

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
        .style("visibility", "");
  
    var sequenceArray = this.getAncestors(d);
    
    if(this.activeBreadcrumb)
      this.updateBreadcrumbs(sequenceArray, percentageString);
  
    // Fade all the segments.
    this.container.selectAll("path")
        .style("opacity", 0.3);
  
    // Then highlight only those that are an ancestor of the current segment.
    this.chart.selectAll("path")
        .filter(function(node) {
                  return (sequenceArray.indexOf(node) >= 0);
                })
        .style("opacity", 1);
  };
  
  // Restore everything to full opacity when moving off the visualization.
 sequenceSunburst.prototype.mouseleave = function(d) {
  
    // Hide the breadcrumb trail
    if(this.activeBreadcrumb)
      this.container.select("#trail")
        .style("visibility", "hidden");
  
    // Deactivate all segments during transition.
   var mouseoverFunction = this.container.selectAll("path").on("mouseover");
  this.container.selectAll("path").on("mouseover", null);
  
    // Transition each segment to full opacity and then reactivate it.
   this.container.selectAll("path")
        .transition()
        .duration(500)
        .style("opacity", 1)
        .each("end", function() {
                d3.select(this).on("mouseover", mouseoverFunction);
              });
  
   this.container.select("#explanation")
        .style("visibility", "hidden");
  };
  
  // Given a node in a partition layout, return an array of all of its ancestor
  // nodes, highest first, but excluding the root.
  sequenceSunburst.prototype.getAncestors = function(node) {
    var path = [];
    var current = node;
    while (current.parent) {
      path.unshift(current);
      current = current.parent;
    }
    return path;
  };
  
  
  //-----------------------------------------------
  //What follows is only linked with the BREADCRUMB
  
  sequenceSunburst.prototype.initializeBreadcrumbTrail = function() {
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
  sequenceSunburst.prototype.breadcrumbPoints = function(d, i) {
    var points = [];
    points.push("0,0");
    points.push(b.w + ",0");
    points.push(b.w + b.t + "," + (b.h / 2));
    points.push(b.w + "," + b.h);
    points.push("0," + b.h);
    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
      points.push(b.t + "," + (b.h / 2));
    }
    return points.join(" ");
  };
  
  // Update the breadcrumb trail to show the current sequence and percentage.
  sequenceSunburst.prototype.updateBreadcrumbs = function(nodeArray, percentageString) {
  
    // Data join; key function combines name and depth (= position in sequence).
    var g = this.container.select("#trail")
        .selectAll("g")
        .data(nodeArray, function(d) { return d.name + d.depth; });
  
    // Add breadcrumb and label for entering nodes.
    var entering = g.enter().append("svg:g");
  
    entering.append("svg:polygon")
        .attr("points", this.breadcrumbPoints)
        .style("fill", function(d) { return colors(d.name); });
  
    entering.append("svg:text")
        .attr("x", (b.w + b.t) / 2)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.name; });
  
    // Set position for entering and updating nodes.
    g.attr("transform", function(d, i) {
      return "translate(" + i * (b.w + b.s) + ", 0)";
    });
  
    // Remove exiting nodes.
    g.exit().remove();
  
    // Now move and update the percentage at the end.
    this.container.select("#trail").select("#endlabel")
        .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(percentageString);
  
    // Make the breadcrumb trail visible, if it's hidden.
    this.container.select("#trail")
        .style("visibility", "");
  };
})();
