/* global d3: false */
if (d3lib === null || typeof (d3lib) !== "object") { var d3lib = {};}
(function () {
    'use strict';
    var colors = d3.scale.category10();

    var chord = function (args) {
        var that = this,
            m = [];

        //Required arguments
        that.container = d3.select(args.container);
        that.data = args.data;

        //Optional arguments
        that.duration = args.duration || 100;
        that.opacity = args.opacity || 0.2;
        that.padding = args.padding || 0.05;
        that.interactive = !(args.disableInteraction || false);
        m = that.margin = args.margin || [20, 20, 20, 20]; // [Top, Right, Bottom, Left]
        that.innerRadius = { user : args.innerRadius || 0 };
        that.outerRadius = { user : args.outerRadius || 0 };
        that.colors = args.colors || d3.range(10).map(function (d, i) {return colors(i);});
        that.names = args.names || [];

        //Computed attributes
        that.containerWidth = parseFloat(that.container.style('width'));
        that.containerHeight = parseFloat(that.container.style('height'));
        that.width = that.containerWidth - (m[1] + m[3]);
        that.height = that.containerHeight - (m[0] + m[2]);
        that.innerRadius = that.innerRadius.user || Math.min(that.width, that.height) * 0.45;
        that.outerRadius = that.outerRadius.user || Math.min(that.innerRadius * 1.1, Math.min(that.width, that.height) / 2);
        that.chord = d3.layout.chord()
            .padding(that.padding)
            .sortSubgroups(d3.descending)
            .matrix(that.data);
    };

    //Function to plot the chart - Public
    chord.prototype.createVisualization = function () {
        var that = this;
        // Add an SVG element with the desired dimensions and margin.
        that.container.selectAll('svg').remove();
        that.innerContainer = that.container.append('svg:svg')
            .attr('width', that.containerWidth)
            .attr('height', that.containerHeight)
            .append('svg:g')
            .attr('transform', 'translate(' + that.margin[3] + ',' + that.margin[0] + ')');

        that.graph = that.innerContainer.append('g')
            .attr('transform', 'translate(' + that.width / 2 + ',' + that.height / 2 + ')');

        that.graph.append('g')
            .selectAll('path')
            .data(that.chord.groups)
            .enter().append('path')
            .style('fill', function (d) { return that.colors[d.index % that.colors.length]; })
            .style('stroke', function (d) { return that.colors[d.index % that.colors.length]; })
            .attr('d', d3.svg.arc().innerRadius(that.innerRadius).outerRadius(that.outerRadius))
            .on('mouseover', that.interactive ? that.fade(that.opacity) : '')
            .on('mouseout', that.interactive ? that.fade(1) : '');

        that.graph.selectAll('text')
            .data(that.chord.groups).enter()
            .append("text")
            .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr("dy", ".35em")
            .attr("transform", function(d) {
                return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
                + "translate(" + (that.innerRadius + 26) + ")"
                + (d.angle > Math.PI ? "rotate(180)" : "");
            })
            .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
            .style("font","11px sans-serif")
            .text(function(d) { return that.names[d.index] || ""; });

            
        that.graph.append('g')
            .attr('class', 'chord')
            .selectAll('path')
            .data(that.chord.chords)
            .enter().append('path')
            .attr('d', d3.svg.chord().radius(that.innerRadius))
            .style('fill', function (d) { return that.colors[d.target.index % that.colors.length]; })
            .style({"fill-opacity": .67, "stroke": "#000", "stroke-width": ".5px"})
            .style('opacity', 1);
            
        window.addEventListener('resize', resize.bind(that));
    };

     // Returns an event handler for fading a given chord group.
    chord.prototype.fade = function (opacity) {
        var that = this;
        return function(g, i) {
            that.graph.selectAll('.chord path')
            .filter(function(d) { return d.source.index != i && d.target.index != i; })
            .transition().duration(that.duration)
            .style('opacity', opacity);
        };
    };
    
    //Redraw if resize
    var resize = function () {
        var that = this,
            m = that.margin;
        clearTimeout(that.timeout);
        that.containerWidth = parseFloat(that.container.style('width'));
        that.containerHeight = parseFloat(that.container.style('height'));
        that.width = that.containerWidth - (m[1] + m[3]);
        that.height = that.containerHeight - (m[0] + m[2]);
        that.innerRadius = that.innerRadius.user || Math.min(that.width, that.height) * 0.45;
        that.outerRadius = that.outerRadius.user || Math.min(that.innerRadius * 1.1, Math.min(that.width, that.height) / 2);
        that.timeout = setTimeout(function(){that.createVisualization();}, 1000);
    };
    
    d3lib.chord = chord;
})();