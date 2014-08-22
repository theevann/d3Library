/* global d3: false */
if (d3lib === null || typeof (d3lib) !== "object") { var d3lib = {};}
(function () {
    'use strict';

    var bisect = d3.bisector(function (d) {
            return d[0];
        }).left,
        colors = d3.scale.category10();

    var chart = function (args) {
        var that = this,
            m = [],
            xExt = [],
            yExt = [];

        //Required arguments
        that.container = d3.select(args.container);
        that.series = args.series;

        that.seriesNumber = that.series.length;
        yExt = [d3.min(that.series, function (d) {
            return d3.min(d.data, function (d) {
                return d[1];
            });
        }), d3.max(that.series, function (d) {
            return d3.max(d.data, function (d) {
                return d[1];
            });
        })];
        xExt = [d3.min(that.series, function (d) {
            return d3.min(d.data, function (d) {
                return d[0];
            });
        }), d3.max(that.series, function (d) {
            return d3.max(d.data, function (d) {
                return d[0];
            });
        })];
        
        //So that the curves do not touch the border
        yExt[0] -= 0.1 * (yExt[1] - yExt[0]);
        yExt[1] += 0.1 * (yExt[1] - yExt[0]);     
   
        //Optional arguments
        that.grid = args.grid || false;
        that.showGuideLine = args.guideLine || false;
        that.hightLight = args.hightLight || false;
        m = that.margin = args.margin || [80, 80, 80, 80]; // [Top, Right, Bottom, Left]
        that.yExtent = args.yExtent || yExt;
        that.serieFollowed = args.serieFollowed || -1;

        that.fill = that.series.map(function (d) {
            return (d.fill === 'undefined') ? args.fill || false : d.fill;
        });
        that.sort = that.series.map(function (d) {
            return (d.sort === 'undefined') ? args.sort || false : d.sort;
        });
        that.color = that.series.map(function (d, i) {
            return d.color || args.color || colors(i % 10);
        });
        that.fillColor = that.series.map(function (d, i) {
            return d.fillColor || args.fillColor || that.color[i];
        });
        that.strokeWidth = that.series.map(function (d) {
            return d.strokeWidth || args.strokeWidth || 2;
        });
        that.interpolate = that.series.map(function (d) {
            return d.interpolate || args.interpolate || 'linear';
        });
        that.name = that.series.map(function (d, i) {
            return d.name || ('Serie ' + i);
        });

        that.parseTime = args.parseTime || false;
        that.animate = args.animate || false;
        that.zoomable = args.zoomable || false;

        if (that.yExtent[1] < yExt[0] || that.yExtent[0] > yExt[1] || that.yExtent[1] < that.yExtent[0]) {
            alert('yExtent seems bad !');
        }

        //Computed attributes
        that.containerWidth = parseFloat(that.container.style('width'));
        that.containerHeight = parseFloat(that.container.style('height'));
        that.width = that.containerWidth - (m[1] + m[3]);
        that.height = that.containerHeight - (m[0] + m[2]);

        if (that.width === 0 || that.height === 0) {
            alert('Please give width / height to the container');
            throw 'No dimension set to container';
        }

        that.x = d3.scale.linear().domain(xExt).range([0, that.width]);
        that.y = d3.scale.linear().domain(that.yExtent).range([that.height, 0]);

        that.line = d3.svg.line()
            .x(function (d) {
                return that.x(d[0]);
            })
            .y(function (d) {
                return that.y(d[1]);
            });

        that.area = d3.svg.area()
            .x(function (d) {
                return that.x(d[0]);
            })
            .y0(Math.min(that.y(0), that.height))
            .y1(function (d) {
                return that.y(d[1]);
            });

        that.series.forEach(function (d, i) {
            if (d.sort[i]) {
                d.data.sort(function (a, b) {
                    return a[0] - b[0];
                });
            }
        });

        window.addEventListener('resize', resize.bind(that));
    };

    //Function to plot the chart - Public
    chart.prototype.createVisualization = function () {
        var that = this;

        // Add an SVG element with the desired dimensions and margin.
        that.container.selectAll('svg').remove();
        that.graph = that.container.append('svg:svg')
            .attr('width', that.containerWidth)
            .attr('height', that.containerHeight)
            .append('svg:g')
            .attr('transform', 'translate(' + that.margin[3] + ',' + that.margin[0] + ')');

        if (that.grid) {
            displayGrid.call(this);
        }

        that.overlay = that.graph.append('rect')
            .attr('class', 'overlay')
            .attr('width', that.width)
            .attr('height', that.height)
            .attr('fill', 'none');

        that.graphs = that.graph.append('g').attr('id', 'graphs').style('pointer-events', 'none');
        that.series.forEach(function (d, i) {
            if (that.fill[i]) {
                that.area.interpolate(that.interpolate[i]);
                that.graphs.append('svg:path').classed('area', true)
                    .attr('d', that.area(d.data))
                    .style('pointer-events', 'none')
                    .style('fill', that.color[i]);
            }
        });

        that.series.forEach(function (d, i) {
            that.line.interpolate(that.interpolate[i]);
            that.graphs.append('svg:path').classed('line', true)
                .attr('d', that.line(d.data))
                .style('stroke', that.fillColor[i])
                .style('stroke-width', that.strokeWidth[i]);
        });

        that.graphs.selectAll('.area')
            .style('stroke', 'none')
            .style('opacity', '0.5');

        that.graphs.selectAll('.line')
            .style('fill', 'none');

        var xAxis = d3.svg.axis().scale(that.x).tickSubdivide(true);
        that.graph.append('svg:g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + that.height + ')')
            .call(xAxis);

        var yAxisLeft = d3.svg.axis().scale(that.y).orient('left');
        that.graph.append('svg:g')
            .attr('class', 'y axis')
            .call(yAxisLeft);

        d3.selectAll('.axis line, .axis path')
            .style('stroke', '#000')
            .style('fill', 'none');
            
        d3.selectAll(".axis text").style("font","11px sans-serif");

        d3.selectAll('.axis')
            .style('shape-rendering', 'crispEdges');

        if (that.showGuideLine) {
            that.initGuideLine();
        }

        if (that.hightLight) {
            that.initHightligth();
        }
    };

    chart.prototype.initGuideLine = function () {
        var that = this;

        that.helpGroup = that.graph.append('g').attr('id', 'helpGroup').style('display', 'none');

        that.guideLine = that.helpGroup.append('line')
            .attr('id', 'guideline')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 0)
            .attr('y2', that.height)
            .style('pointer-events', 'none')
            .style('fill', 'none')
            .style('stroke', 'lightgrey')
            .style('stroke-width', 2);

        that.focus = that.series.map(function () {
            that.helpGroup.append('text').style('font-size', '0.8em').style('pointer-events', 'none');
            return that.helpGroup.append('circle')
                .attr('id', 'guideline')
                .attr('cx', 0)
                .attr('cy', 0)
                .attr('r', 5)
                .style('pointer-events', 'none')
                .style('fill', 'none')
                .style('stroke', 'steelblue')
                .style('stroke-width', 1);
        });

        that.overlay
            .style('pointer-events', 'all')
            .on('mouseover', function () {
                that.helpGroup.style('display', null);
            })
            .on('mouseout', function () {
                //If the focus is taken by a line => it means we didn't go out of the graph
                if (!d3.select(d3.event.toElement).classed('line'))
                    that.helpGroup.style('display', 'none');
            })
            .on('mousemove', updateGuideLine.bind(that));
    };

    chart.prototype.initHightligth = function () {
        var that = this,
            mouseover,
            mouseout;

        mouseover = function () {
            var stw = parseInt(d3.select(this).style('stroke-width'), 10);
            d3.select(this).style('stroke-width', (stw * 1.5));
            updateGuideLine.call(that);
        };

        mouseout = function () {
            var stw = parseInt(d3.select(this).style('stroke-width'), 10);
            d3.select(this).style('stroke-width', (stw / 1.5));
            updateGuideLine.call(that);
        };

        that.graphs.selectAll('.line')
            .style('pointer-events', 'stroke')
            .on('mouseover', mouseover)
            .on('mouseout', mouseout)
            .on('mousemove', updateGuideLine.bind(that));
    };

    chart.prototype.guideLineFollow = function (serieNumber) {
        this.serieFollowed = serieNumber;
    };

    var displayGrid = function () {
        var that = this;
        var xGrid = d3.svg.axis().scale(that.x).tickSize(-that.height).tickSubdivide(true).tickFormat(function () {
            return '';
        });
        var yGrid = d3.svg.axis().scale(that.y).orient('left').tickSize(-that.width).tickFormat(function () {
            return '';
        });

        var g = that.graph.append('svg:g').attr('id', 'grid');

        g.append('g')
            .attr('class', 'x grid')
            .attr('transform', 'translate(0,' + that.height + ')')
            .call(xGrid)
            .style('fill', 'none');

        g.append('g')
            .attr('class', 'y grid')
            .call(yGrid)
            .style('fill', 'none');

        g.selectAll('line')
            .style('fill', 'none')
            .style('stroke', 'lightgrey')
            .style('stroke-width', 1)
            .style('opacity', '0.8');

        g.selectAll('path').style('display', 'none');
    };

    var resize = function () {
        var that = this;
        that.containerWidth = parseFloat(that.container.style('width'));
        that.containerHeight = parseFloat(that.container.style('height'));
        that.width = that.containerWidth - (that.margin[1] + that.margin[3]);
        that.height = that.containerHeight - (that.margin[0] + that.margin[2]);
        that.x.range([0, that.width]);
        that.y.range([that.height, 0]);
        that.createVisualization();
    };

    var updateGuideLine = function () {
        var that = this,
            min = function (array) {
                var currentMin = 0;
                for (var i = 0; i < array.length; i++)
                    currentMin = array[i] < array[currentMin] ? i : currentMin;
                return currentMin;
            };

        var x0 = that.x.invert(d3.mouse(that.graph.node())[0]),
            index = that.series.map(function (d) {
                return bisect(d.data, x0, 1);
            }),
            d0 = that.series.map(function (d, i) {
                return d.data[index[i] - 1];
            }),
            d1 = that.series.map(function (d, i) {
                return d.data[index[i]];
            }),
            dd = that.series.map(function (d, i) {
                return d1[i] ? (x0 - d0[i][0] > d1[i][0] - x0 ? d1[i] : d0[i]) : d0[i];
            }),
            serieFollowed = that.serieFollowed != -1 ? that.serieFollowed : min(dd.map(function (d, i) {
                return Math.abs(x0 - dd[i][0]);
            }));

        that.guideLine
            .attr('x1', that.x(dd[serieFollowed][0]))
            .attr('x2', that.x(dd[serieFollowed][0]));

        that.focus.forEach(function (d, i) {
            d.attr('cx', that.x(dd[i][0]))
                .attr('cy', that.y(dd[i][1]));
        });

        that.helpGroup.selectAll('text')
            .attr('x', function (d, i) {
                return that.x(dd[i][0]);
            })
            .attr('y', function (d, i) {
                return that.y(dd[i][1]);
            })
            .attr('dx', 10)
            .text(function (d, i) {
                return d3.format(',.2f')(dd[i][1]);
            });
    };

    d3lib.chart = chart;
})();