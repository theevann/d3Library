"use strict";
var d3lib = {};
(function(){
    var bisect = d3.bisector(function (d) {
        return d[0];
    }).left;
    
    var chart = function (args){
        var that = this;
        var m = [];
        var ext;
        
        //Required arguments
        that.container = d3.select(args.container);
        that.data = args.data;
        
        ext = d3.extent(that.data,function(d){return d[1];});
        
        //Optional arguments
        that.fill = args.fill || false;
        that.grid = args.grid || false;
        that.showGuideLine = args.guideLine || false;
        
        that.parseTime = args.parseTime || false;
        that.animate = args.animate || false;
        that.zoomable = args.zoomable || false; 
        
        that.sort = args.sort || false;
        m = that.margin = args.margin || [80,80,80,80]; // [Top, Right, Bottom, Left]
        that.color = args.color || "steelblue";
        that.fillColor = args.fillColor || d3.rgb(that.color).brighter();
        that.strokeWidth = args.strokeWidth || 2;
        that.interpolate = args.interpolate || "linear";
        that.yExtent = args.yExtent || ext;
        
        
        if(that.yExtent[1] < ext[0] || that.yExtent[0] > ext[1] || that.yExtent[1] < that.yExtent[0])
            alert("yExtent seems bad !");
        
        //Computed attributes
        that.containerWidth = parseFloat(that.container.style("width"));
        that.containerHeight = parseFloat(that.container.style("height"));
        that.width = that.containerWidth - (m[1] + m[3]);
        that.height = that.containerHeight - (m[0] + m[2]);
        
        that.x = d3.scale.linear().domain(d3.extent(that.data,function(d){return d[0];})).range([0, that.width]);
        that.y = d3.scale.linear().domain(that.yExtent).range([that.height, 0]);
        that.line = d3.svg.line()
            .x(function(d) {return that.x(d[0]);})
            .y(function(d) {return that.y(d[1]);})
            .interpolate(that.interpolate);
        
        that.area = d3.svg.area()
            .x(function(d) {return that.x(d[0]);})
            .y0(Math.min(that.y(0), that.height))
            .y1(function(d) {return that.y(d[1]);})
            .interpolate(that.interpolate);
            
        
        // Add an SVG element with the desired dimensions and margin.
        that.graph = that.container.append("svg:svg")
              .attr("width", that.containerWidth)
              .attr("height", that.containerHeight)
              .append("svg:g")
              .attr("transform", "translate(" + m[3] + "," + m[0] + ")");
              
        if(that.sort)
            that.data.sort(function(a, b) {
                return a[0] - b[0];
            });
    } 
    
    //Function to plot the chart - Public
    chart.prototype.createVisualization = function() {
        var that = this;
        
        if(that.grid)
            displayGrid.call(this);
        
        if(that.fill){
            that.graph.append("svg:path")
                .attr("d", that.area(that.data))
                .style("fill",that.color)
                .style("stroke","none")
                .style("opacity","0.5");
        }
        
        that.graph.append("svg:path")
            .attr("d", that.line(that.data))
            .style("fill","none")
            .style("stroke",that.color)
            .style("stroke-width",that.strokeWidth);
            
        var xAxis = d3.svg.axis().scale(that.x).tickSubdivide(true);
        that.graph.append("svg:g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + that.height + ")")
            .call(xAxis);

        var yAxisLeft = d3.svg.axis().scale(that.y).orient("left");
        that.graph.append("svg:g")
            .attr("class", "y axis")
            .call(yAxisLeft);
        
        if(that.showGuideLine)
            that.initGuideLine();
    };
    
    chart.prototype.initGuideLine = function() {
        var that = this;
        
        var mousemove = function() {
            var x0 = that.x.invert(d3.mouse(that.graph.node())[0]);
            var i = bisect(that.data, x0,1);
            var d0 = that.data[i - 1];
            var d1 = that.data[i];
            var d = x0 - d0[0] > d1[0] - x0 ? d1 : d0;
            
            that.guideLine
                .attr("x1", that.x(d[0]))
                .attr("x2", that.x(d[0]));
                
            that.focus
                .attr("cx", that.x(d[0]))
                .attr("cy", that.y(d[1]));
                
            that.helpGroup.select("text")
                .attr("x", that.x(d[0]))
                .attr("y", that.y(d[1]))
                .attr("dx", 10)
                .text(d3.format(",.2f")(d[1]));
        };
        that.helpGroup = that.graph.append("g");
        
        that.guideLine = that.helpGroup.append("line")
            .attr("id", "guideline")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", that.height)
            .style("fill","none")
            .style("stroke","lightgrey")
            .style("stroke-width",2);
        
        that.focus = that.helpGroup.append("circle")
            .attr("id", "guideline")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 5)
            .style("fill","none")
            .style("stroke","steelblue")
            .style("stroke-width",1);
        
        that.helpGroup.append("text").style("font-size","0.8em");
        
        that.graph.append("rect")
            .attr("class", "overlay")
            .attr("width", that.width)
            .attr("height", that.height)
            .attr("fill","none")
            .style("pointer-events","all")
            .on("mouseover", function() {that.helpGroup.style("display", null);})
            .on("mouseout", function() {that.helpGroup.style("display", "none");})
            .on("mousemove", mousemove);  
    };
    
    
    
    var displayGrid = function(){
        var that = this;
        var xGrid = d3.svg.axis().scale(that.x).tickSize(-that.height).tickSubdivide(true).tickFormat(function() { return ""; });
        var yGrid = d3.svg.axis().scale(that.y).orient("left").tickSize(-that.width).tickFormat(function() { return ""; });
        
        var g = that.graph.append("svg:g").attr("id","grid");
        
        g.append("g")
            .attr("class", "x grid")
            .attr("transform", "translate(0," + that.height + ")")
            .call(xGrid)
            .style("fill","none");
            
        g.append("g")
            .attr("class", "y grid")
            .call(yGrid)
            .style("fill","none");
          
        g.selectAll("line")
            .style("fill","none")
            .style("stroke","lightgrey")
            .style("stroke-width",1)
            .style("opacity","0.8");
            
        g.selectAll("path").style("display","none");
    }
   
    d3lib.chart = chart;
})();
