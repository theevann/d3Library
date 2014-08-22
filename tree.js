var d3lib = {};
(function() {
    "use strict";
    var tree = function (args){
        var that = this;
        
        //Required arguments
        that.container = d3.select(args.container);
        that.data = args.data;
        
        //Optional arguments
        that.duration = args.duration || 750;
        that.initScale = args.initScale || 1;
        that.nodeSpacing = args.nodeSpacing || 0;
        that.initialExpandLevel = args.initialExpandLevel || 0;
        that.stickToContainer = args.stickToContainer || false;
        that.interactive = !(args.disableInteraction || false);
        that.zooming = !(args.disableZoom || false);
        that.overlayColor = args.overlayColor || "#EEE";
   
        //Computed attributes
        that.width = parseFloat(that.container.style("width"));
        that.height = parseFloat(that.container.style("height"));
        that.data.x0 = that.height / 2;
        that.data.y0 = 0;
        
        that.tree_ = d3.layout.tree()
            .size([that.height, that.width]);

        // define a d3 diagonal projection for use by the node paths later on.
        that.diagonal = d3.svg.diagonal()
            .projection(function(d) {
                return [d.y, d.x];
            });
        
        
        
        // === INITIALISING TREE ===
        
        // Call visit function to establish maxLabelLength
        that.visit(that.data, 0, function(parent,depth) {
            var that = this;
            that.totalNodes++;
            that.maxLabelLength = Math.max(parent.name.length, that.maxLabelLength);
            that.maxLabelLengths[depth] = (parent.name.length < that.maxLabelLengths[depth])? that.maxLabelLengths[depth] : parent.name.length;
        });
        
        // Sort the tree initially incase the JSON isn't in a sorted order.
        that.sortTree();
        
        // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
        that.zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", function(d){that.zoom.call(that,d);});
        that.zoomListener.scale(that.initScale);
    };
    
    
    //  === Define prototype properties ===
    
    
    tree.prototype.lastID = 0;
    tree.prototype.maxDepth = 0;
    tree.prototype.totalNodes = 0;
    tree.prototype.maxLabelLength = 0;
    tree.prototype.maxLabelLengths = [0];
    
    
    // === Define public methods ===
    
    //Function to plot the tree - Public
    tree.prototype.createVisualization = function() {
        var that = this;
        
        // Define the baseSvg, attaching a class for styling and the zoomListener
        // Append a group which holds all nodes and which the zoom Listener can act upon.
        that.container.selectAll("svg").remove();
        that.svgGroup = that.container.append("svg")
            .attr("width", that.width)
            .attr("height", that.height)
            .attr("class", "overlay")
            .style("background-color",that.overlayColor)
            .call(that.zoomListener)
            .append("g");
        
        // Layout the tree initially and center on the root node.
        that.update(that.data);
        if(that.initialExpandLevel >= 0){
            collapse(that.data);
            if(that.initialExpandLevel > 0)
                expand(that.data, that.initialExpandLevel);
            that.update(that.data);
        }
        that.centerNode(that.data);
        window.addEventListener('resize', resize.bind(that));
    };
    
    //Collapse all the nodes - Public
    tree.prototype.collapse = function(){
        var that = this;
        collapse(that.data);
        that.update(that.data);
        that.centerNode(that.data);
    };
    
    //Expand all the nodes - Public
    tree.prototype.expand = function(){
        var that = this;
        collapse(that.data);
        expand(that.data);
        that.update(that.data);
        that.centerNode(that.data);
    };
    
    //Get the ACTUAL maximal depth - Public
    tree.prototype.getMaxDepth = function() {
        var that = this;
        that.maxDepth = 0;
        that.visit(this.data,0,function(parent,depth){var that = this;that.maxDepth = (depth>that.maxDepth)?depth:that.maxDepth;});
    };
    
    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children - Public
    tree.prototype.centerNode = function(source) {
        var that = this;
        var scale = that.zooming?that.zoomListener.scale():that.initScale;
        var x = -source.y0;
        var y = -source.x0;
        x = x * scale + that.width / 2;
        y = y * scale + that.height / 2;
        that.container.select('g').transition()
            .duration(that.duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" +  scale + ")");
        that.zoomListener.translate([x,y]);
    };
       
    // Function to center graph - Public
    tree.prototype.centerGraph = function() {
        var that = this;
        var scale = that.zooming?that.zoomListener.scale():that.initScale;
        var x = 0;
        
        that.getMaxDepth();
        
        if(that.nodeSpacing !== 0)
            x = that.maxDepth * that.nodeSpacing;
        else{
            for( var j = 0 ; j < that.maxDepth ; j++)
                x += (that.maxLabelLengths[j] * 10);
        }
        x /= -2;
        var y = -that.tree_.size()[0] / 2;
        x = x * scale + that.width / 2;
        y = y * scale + that.height / 2;
        that.container.select('g').transition()
            .duration(that.duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" +  scale + ")");
        that.zoomListener.translate([x,y]);
    };
    
    
    //MAIN FUNCTION
    tree.prototype.update = function(source) {
        var that = this;
        // Compute the new height, function counts total children of root node and sets tree height accordingly.
        // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
        // This makes the layout more consistent.
        var levelWidth = [1];
        var childCount = function(level, n) {

            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);

                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) {
                    childCount(level + 1, d);
                });
            }
        };
        childCount(0, that.data);
        
        var newHeight = d3.max(levelWidth) * 25; // 25 pixels per line  
        that.tree_.size([that.stickToContainer?that.height:newHeight, that.width]);

        // Compute the new tree layout.
        var nodes = that.tree_.nodes(that.data).reverse(),
            links = that.tree_.links(nodes);

        // Set widths between levels based on maxLabelLength.
        nodes.forEach(function(d) {
            d.y = 0;

            if(that.nodeSpacing !== 0)
                d.y = d.depth * that.nodeSpacing;
            else{
                for( var j = 0 ; j < d.depth ; j++)
                    d.y += (that.maxLabelLengths[j] * 10);
            }
        });

        // Update the nodes…
        var node = that.svgGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++that.lastID);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .style("cursor","pointer")
            .on('click', that.interactive?function(d){that.click.call(that,d)}:"");

        nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            })
            .style("stroke","steelblue")
            .style("stroke-width","1.5px");



        nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".35em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            })
            .style("font-size","10px")
            .style("font-family","sans-serif")
            .style("fill-opacity", 0);

        // Update the text to reflect whether node has children or not.
        node.select('text').transition()
            .duration(that.duration)
            .attr("x", function(d) {
                return d.children ? -10 : 10;
            })
            .attr("text-anchor", function(d) {
                return d.children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            });

        // Change the circle fill depending on whether it has children and is collapsed
        node.select("circle.nodeCircle")
            .attr("r", 4.5)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(that.duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Fade the text in
        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(that.duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 0);

        nodeExit.select("text")
            .style("fill-opacity", 0);

        // Update the links…
        var link = that.svgGroup.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return that.diagonal({
                    source: o,
                    target: o
                });
            })
            .style("fill","none")
            .style("stroke","#ccc")
            .style("stroke-width","1.5px");

        // Transition links to their new position.
        link.transition()
            .duration(that.duration)
            .attr("d", that.diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(that.duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return that.diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    };
    
    // A recursive helper function for establishing maxLabelLength/maxLabelLengths
    tree.prototype.visit = function(parent, depth, fn) {
        var that = this;
        if (!parent) return;
        
        fn.call(that,parent, depth);
        
        var children = parent.children && parent.children.length > 0 ? parent.children : null;
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                that.visit(children[i], depth+1, fn);
            }
        }
    };

    // A  function to sort the tree according to the node names
    tree.prototype.sortTree = function() {
        var that = this;
        that.tree_.sort(function(a, b) {
            return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
        });
    };

    // Define the zoom function for the zoomable tree
    tree.prototype.zoom = function() {
        var that = this;

        if(!that.zooming && (d3.event.sourceEvent.type === "wheel")){
            var transRegex = /.*translate\((-?[\d\.]*),(-?[\d\.]*)\)/i;
            var trans = transRegex.exec(that.svgGroup.attr("transform")).slice(1);
            that.zoomListener.translate([trans[0],trans[1]]);
        }
        var scale = that.zooming?d3.event.scale:that.initScale;

        that.svgGroup.attr("transform", "translate(" + that.zoomListener.translate() + ")scale(" + scale + ")");
    };
    
    // Toggle children on click.
    tree.prototype.click = function(d) {
        var that = this;
        if (d3.event.defaultPrevented) return; // click suppressed
        d = toggleChildren(d);
        that.update(d);
        that.centerNode(d);
    };
    
    // === Define private functions ===
    
    //Redraw if resize
    var resize = function () {
        var that = this;
        that.width = parseFloat(that.container.style('width'));
        that.height = parseFloat(that.container.style('height'));
        that.createVisualization();
    };
    
    // Helper functions for collapsing and expanding nodes
    var collapse = function(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    };

    var expand = function(d, depth) {
        if (d._children) {
            d.children = d._children;
            if(typeof(depth) == "undefined" || d.depth < (depth-1))
                d.children.forEach(function(d){expand(d,depth)});
            d._children = null;
        }
    };

    // Toggle children function
    var toggleChildren = function(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    };
    
    d3lib.tree = tree;
})();