 /** param: 
    * Object{
    *	container, // required
    *	data, // required
    *	bilevel, // default false
    *   desactiveBreadcrumb, // default false
    *   hidePercentage, // default false
    *   notUseSize, // default false
    *   explanationText, // default "from " + nameOfRoot
    * }
    * 
    *   Expected input data : 
    * 
    * 	{
    *	    "name": "cluster",
    *	    "children": [
    *		    {"name": "Name1", "size": 1},
    *		    {"name": "Name2", "size": 2},
    *		    {"name": "NameN", "size": 698}
    *		]
    *	}
    * 
    */

(function(){
    // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
    var b = {
        w: 75, h: 30, s: 3, t: 10
    };
    var heightDivBC = b.h + 20;
  
     // Mapping of step names to colors.
    var colors = d3.scale.category10();

    sunburst = function (args){
        var that = this;
        
        //Required arguments
        that.container = d3.select(args.container);
        that.data = args.data;
        
        //Optional arguments
        that.normalSunburst = !(args.bilevel || false); // Have a normal or bilevel sunBbrst
        that.activeBreadcrumb = !(args.desactiveBreadcrumb || false);
        that.showPercentage = !(args.hidePercentage || false);
        that.useSize = !(args.notUseSize || false);
        that.explanationText = args.explanationText || "from " + that.data.name;
        
        //Computed attributes
        that.width = parseFloat(that.container.style("width"));
        that.height = parseFloat(that.container.style("height"));
        
        if(that.width === 0 || that.height === 0){
            alert("Please give width / height to the container");
            throw "No dimension set to container";
        }
        
        that.radius = Math.min(that.width, that.height-heightDivBC) / 2 - 10;
        
        that.totalSize = 0;
        
        //Creating div containers ...
        that.container.append("div").attr("id","sequence").style("height",heightDivBC + "px");
        var exp = that.container.append("div").attr("id","chart").style("position","relative").style("height",(this.height - heightDivBC) + "px").append("div").attr("id","explanation");
        exp.append("span").attr("id","percentage").style("font-size","2.5em").text(" ");
        exp.append("br");
        exp.append("span").attr("id","percentageText").text(" ");
        
        that.chart = that.container.select("#chart").append("svg:svg")
            .attr("width", that.width)
            .attr("height", that.height-heightDivBC)
            .append("svg:g")
            .attr("id", "svg_container")
            .attr("transform", "translate(" + that.width / 2 + "," + (that.height-heightDivBC) / 2 + ")");
        
        exp.style("visibility", "hidden").style("position","absolute").style("top",(0.5*(that.height-heightDivBC)-parseFloat(exp.style("height"))/2) + "px").style("left",(0.41*that.width) + "px").style("text-align","center").style("color","#666").style("width",0.19*that.width + "px");  
         
        that.normalSunburst?that.initNormal():that.initBilevel();
        that.useSize?that.partition.value(function(d) { return d.size; }):that.partition.value(function(d) { return 1; });
        
        // Compute the initial layout on the entire tree to sum sizes.
        // Also compute the full name and fill color for each node,
        // and stash the children so they can be restored as we descend.
        
        var nodes = that.partition
            .nodes(that.data); // Compute the nodes
        
        that.luminance = d3.scale.sqrt()
            .clamp(true)
            .range([90, 20])
            .domain([0,nodes[0].value]); // Set luminance bounds
        that.totalSize = nodes[0].value; // Set the totalSize of the graph
    
        nodes.forEach(function(d) {
                d._children = d.children;
                d.sum = d.value;
                d.key = key(d);
                d.fill = fill.call(that,d); // USE LUMINANCE !!!
            });
    };
    
    sunburst.prototype.initNormal = function(){
        var that = this;
        that.arc = d3.svg.arc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) { return Math.sqrt(d.y); })
            .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });
        that.partition = d3.layout.partition()
            .size([2 * Math.PI, that.radius * that.radius]);
    };
    
    sunburst.prototype.initBilevel = function(){
        var that = this;
        that.arc = d3.svg.arc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx - 0.01 / (d.depth + 0.5); })
            .innerRadius(function(d) { return that.radius / 3 * d.depth; })
            .outerRadius(function(d) { return that.radius / 3 * (d.depth + 1) - 1; });
        that.partition = d3.layout.partition()
            .sort(function(a, b) { return d3.ascending(a.name, b.name); })
            .size([2 * Math.PI, that.radius]);
    };
    
    sunburst.prototype.createVisualization = function(){
        this.normalSunburst?this.createNormalVisualization():this.createBilevelVisualization();
    };
    
    sunburst.prototype.createBilevelVisualization = function(){
        var that = this;
        // Basic setup of page elements.
        if(that.activeBreadcrumb)
            that.initializeBreadcrumbTrail();
        
        that.center = that.chart.append("circle")
            .attr("r", that.radius / 3)
            .style("cursor","pointer")
            .style("pointer-events","all")
            .style("fill","none")
            .on("click", function(d){that.zoomOut.call(that,d);});
            
        that.center.append("title")
            .text("zoom out");
            
         // Now redefine the value function to use the previously-computed sum.
        that.partition
            .children(function(d, depth) { return depth < 2 ? d._children : null; })
            .value(function(d) { return d.sum; });
        
        var dataToDraw = that.partition.nodes(that.data).slice(1);
        
        that.path = that.chart.selectAll("path")
            .data(dataToDraw)
            .enter().append("path")
            .attr("d", that.arc)
            .style("fill", function(d) { return d.fill; })
            .style("cursor","pointer")
            .each(function(d) { this._current = updateArc(d); })
            .on("click", function(d){that.zoomIn.call(that,d)})
            .on("mouseover", function(d){that.mouseover.call(that,d);});
        
        that.container.select("#svg_container").on("mouseleave", function(d){that.mouseleave.call(that,d);});
    };
    
    sunburst.prototype.createNormalVisualization = function(){
        var that = this;
        // Basic setup of page elements.
        if(that.activeBreadcrumb)
            that.initializeBreadcrumbTrail();
    
        // For efficiency, filter nodes to keep only those large enough to see.
        var dataToDraw = that.partition.nodes(that.data)
            .filter(function(d) {
                return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
            });
    
        that.chart.data([that.data]).selectAll("path")
            .data(dataToDraw)
            .enter().append("svg:path").style("stroke","#fff")
            .attr("display", function(d) { return d.depth ? null : "none"; })
            .attr("d", that.arc)
            .attr("fill-rule", "evenodd")
            .style("fill", function(d) { return d.fill; })
            .style("opacity", 1)
            .on("mouseover", function(d){that.mouseover.call(that,d)});
    
        // Add the mouseleave handler to the bounding circle.
        that.container.select("#svg_container").on("mouseleave", function(d){that.mouseleave.call(that,d)});
       };
    
    
    /*
     * Functions triggered when mouse in/out and click
     */   
       

    // Fade all but the current sequence, and show it in the breadcrumb trail.
    sunburst.prototype.mouseover = function(d) {
        if (document.documentElement.__transition__) return;
        
        var percentage = (100 * d.value / this.totalSize).toPrecision(3);
        var percentageString = percentage + "%";
        
        if (percentage < 0.01) {
            percentageString = "< 0.01%";
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
    sunburst.prototype.mouseleave = function(d) {
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
    
    sunburst.prototype.zoomIn = function(p) {
        if (p.depth > 1) p = p.parent;
        if (!p.children) return;
        this.zoom(p, p);
    };
    
    sunburst.prototype.zoomOut = function(p) {
        if (!p.parent) return;
        this.zoom(p.parent, p);
    };
    
      // Zoom to the specified new root.
    sunburst.prototype.zoom = function(root, p) {
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
                .style("cursor","pointer")
                .on("click", function(d){that.zoomIn.call(that,d)})
                .on("mouseover", function(d){that.mouseover.call(that,d);})
                .each(function(d) { this._current = enterArc(d); });
    
            that.path.transition()
                .style("fill-opacity", 1)
                .attrTween("d", function(d) { return arcTween.call(this, updateArc(d), that.arc); });
        });
    };
  
  
    /*
     * Functions used to create and modify breadcrumbs
     */   
  
    sunburst.prototype.initializeBreadcrumbTrail = function() {
        // Add the svg area.
        var trail = this.container.select("#sequence").append("svg:svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("id", "trail");
        // Add the label at the end, for the percentage.
        trail.append("svg:text")
          .attr("id", "endlabel")
          .style("fill", "#000");
    };
  
  // Generate a string that describes the points of a breadcrumb polygon.
    sunburst.prototype.breadcrumbPoints = function(d, i) {
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
    sunburst.prototype.updateBreadcrumbs = function(nodeArray, percentageString) {
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
    
    /*
     *  Common Functions not specific to a class
     */

    function getAncestors(node) {
        var path = [];
        var current = node;
        while (current.parent) {
            path.unshift(current);
            current = current.parent;
        }
        return path;
    }
      
    function key(d) {
        var k = [], p = d;
        while (p.depth) k.push(p.name), p = p.parent;
        return k.reverse().join(".");
    }

    function fill(d) {
        var p = d;
        while (p.depth > 1) p = p.parent;
        var c = d3.lab(colors(p.name));
        c.l = this.luminance(d.sum);
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
    
})();
