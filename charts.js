/* global d3: false */
if (d3lib === null || typeof (d3lib) !== "object") { var d3lib = {};}
(function () {
    'use strict';
	
	var idGraphs = 0,
		bisect = d3.bisector(function (d) {
            return d[0];
        }).left,
        colors = d3.scale.category10();

    var chart = function (args) {
        var that = this,
            m = [],
            xExt = [0,0],
            yLeftExt = [0,0],
            yRightExt = [0,0];
		
		that._ = {};
		that.twoSeries = false;
		that.idGraph = idGraphs++;

        //Required arguments
		if (args.container.nodeName === 'g' || args.container.nodeName === 'G') {
			that.containerGroup = d3.select(args.container);
		} else {
			that.container = d3.select(args.container);
		}
        that.series = args.series;
        that.series.forEach(function (d, i) {
			if (!d.serieId) {
				d.serieId = 0;
			} else if (d.serieId === 1) {
				that.twoSeries = true;
			}
			d.id = i;
		});

        that.seriesLength = that.series.length;
        yLeftExt = [d3.min(that.series.filter(function (d) {return d.serieId === 0;}), function (d) {
            return d3.min(d.data, function (d) {
                return d[1];
            });
        }) || 0, d3.max(that.series.filter(function (d) {return d.serieId === 0;}), function (d) {
            return d3.max(d.data, function (d) {
                return d[1];
            });
        }) || 0];
        yRightExt = [d3.min(that.series.filter(function (d) {return d.serieId === 1;}), function (d) {
            return d3.min(d.data, function (d) {
                return d[1];
            });
        }) || 0, d3.max(that.series.filter(function (d) {return d.serieId === 1;}), function (d) {
            return d3.max(d.data, function (d) {
                return d[1];
            });
        }) || 0];
        xExt = [d3.min(that.series, function (d) {
            return d3.min(d.data, function (d) {
                return d[0];
            });
        }) || 0, d3.max(that.series, function (d) {
            return d3.max(d.data, function (d) {
                return d[0];
            });
        }) || 0];

        //Optional arguments
        that.showGuideLine = args.guideLine || false;
        that.highlight = args.highlight || false;
        that.showLegend = args.showLegend || false;
		that.legendPosition = args.legendPosition || [true, 0];
		that.limitRowLegend = args.limitRowLegend || 0;
		that.optimizeYScale = args.optimizeYScale === false ? false : true;
        m = that.margin = args.margin || [0.05, 0.05, 0.05, 0.05, true]; // [Top, Right, Bottom, Left, proportional]
        that.serieFollowed = args.serieFollowed || -1;
		that.autoParseTime = args.autoParseTime || false;
		that.transitionDuration = args.transitionDuration || 100;
		that.name = args.name;
		
		that.fontFamily = args.fontFamily || "sans-serif";
        that.fontSize = args.fontSize || 11;
		that.axisColor = args.axisColor || "black";
        that.zoomable = args.zoomable || false;
		that.onZoom = args.onZoom || function () {};
		
		args.nameInBackground = args.nameInBackground || {};
		that.nameInBackground = {
			show : args.nameInBackground.show || false,
			fontColor : args.nameInBackground.fontColor || "lightgrey",
			fontSize : args.nameInBackground.fontSize || that.fontSize * 3,
			fontFamily : args.nameInBackground.fontFamily || that.fontFamily
		};
		
        args.grid = args.grid || {};
		that.grid = {
			show : args.grid.show || false,
			opacity : args.grid.opacity || 0.8,
			color : args.grid.color || 'lightgrey',
			strokeWidth : args.grid.strokeWidth || 1
		};
		
		args.x = args.x || {};
		that.x = {
			extent : args.x.extent || xExt,
			format : args.x.format || null,
			ticks : args.x.ticks || 10,
			tickSize : args.x.tickSize || args.tickSize || [6,6],
			textTickOffset : args.x.textTickOffset || [false, false],
			label : args.x.label || "",
			labelPosition : args.x.labelPosition || "out",
			guideLineFormat : args.x.guideLineFormat || function (d) {return d;},
		};
		
		args.y = args.y || {};
		args.y.left = args.y.left || {};
		args.y.right = args.y.right || {};
		
		that.y = {
			left : {
				extent : args.y.left.extent || args.y.extent || yLeftExt,
				format : args.y.left.format || args.y.format || null,
				ticks : args.y.left.ticks || args.y.ticks || 10,
				tickSize : args.y.left.tickSize || args.y.tickSize || args.tickSize || [6,6],
				textTickOffset : args.y.left.textTickOffset || args.y.textTickOffset || [false, false],
				label : args.y.left.label || args.y.label || "",
				labelPosition : args.y.left.labelPosition || args.y.labelPosition || "out"
			},
			right : {
				extent : args.y.right.extent || args.y.extent || yRightExt,
				format : args.y.right.format || args.y.format || null,
				ticks : args.y.right.ticks || args.y.ticks || 10,
				tickSize : args.y.right.tickSize || args.y.tickSize || args.tickSize || [6,6],
				textTickOffset : args.y.right.textTickOffset || args.y.textTickOffset || [false, false],
				label : args.y.right.label || "",
				labelPosition : args.y.right.labelPosition || args.y.labelPosition || "out"
			}
		};

        //So that the curves do not touch the border
		if (that.optimizeYScale) {
			that.y.left.extent[0] -= 0.1 * (that.y.left.extent[1] - that.y.left.extent[0]);
			that.y.left.extent[1] += 0.1 * (that.y.left.extent[1] - that.y.left.extent[0]);
			if (that.twoSeries) {
				that.y.right.extent[0] -= 0.1 * (that.y.left.extent[1] - that.y.left.extent[0]);
				that.y.right.extent[1] += 0.1 * (that.y.left.extent[1] - that.y.left.extent[0]);
			}
		}
		
		if (that.y.left.extent[0] === that.y.left.extent[1]) {
			that.y.left.extent[0] -= 1;
			that.y.left.extent[1] += 1;
		}
		
		if (that.y.right.extent[0] === that.y.right.extent[1]) {
			that.y.right.extent[0] -= 1;
			that.y.right.extent[1] += 1;
		}
		
		var mapper = function (attr, def) {
			return that.series.map(function (d, i) {
				return (d[attr] !== undefined) ? d[attr] : (args[attr] !== undefined) ? args[attr] : typeof def !== "function" ? def : def(d, i);
			});
		};
		
        that.fill = mapper("fill", false);
        that.visibility = mapper("visibility", "show");
        that.sort = mapper("sort", false);
        that.strokeWidth = mapper("strokeWidth", 2);
        that.opacity = mapper("opacity", 1);
        that.interpolate = mapper("interpolate", "linear");
        that.color = mapper("color", function (d, i) {return colors(i % 10);});
        that.fillColor = mapper("fillColor", function (d, i) {return that.color[i];});
        that.label = mapper("label", function (d, i) {return ('Graph ' + i);});
		that.guideLineInitiated = false;
		
		
        //Computed attributes
        that.containerWidth = args.width || parseFloat(that.container.style('width'));
        that.containerHeight = args.height || parseFloat(that.container.style('height'));
		
		if (m[4]) { // IF it is proportional
			m = that.margin = d3.range(4).map(function (d, i) { return m[i] * (i % 2 === 0 ? that.containerHeight : that.containerWidth); });
		}
		
        that.width = that.containerWidth - (m[1] + m[3]);
        that.height = that.containerHeight - (m[0] + m[2]);

        if (that.width === 0 || that.height === 0) {
            throw 'No dimension set to container';
        }
		
		if (that.autoParseTime) {
			that.x.scale = d3.time.scale().domain(that.x.extent).range([0, that.width]);
		} else {
			that.x.scale = d3.scale.linear().domain(that.x.extent).range([0, that.width]);
		}
        that.y.left.scale = d3.scale.linear().domain(that.y.left.extent).range([that.height, 0]);
        that.y.right.scale = d3.scale.linear().domain(that.y.right.extent).range([that.height, 0]);
		
		var yRightDomain = that.y.right.scale.domain();
		that._.initialScale = d3.scale.linear().domain(that.y.right.extent).range([that.height, 0]),
		that._.initialExtent = yRightDomain[1] - yRightDomain[0];
		
        that.zoom = d3.behavior.zoom()
            .x(that.x.scale)
            .y(that.y.left.scale)
			.on("zoomend", that.onZoom.bind(that))
            .on("zoom", function () {
				var upYScale = that._.initialScale.invert(-d3.event.translate[1] / d3.event.scale),
					downYScale = upYScale - that._.initialExtent / d3.event.scale;
				that.y.right.scale.domain([downYScale, upYScale]);
				that.update.call(that, d3.event.sourceEvent.constructor.name === "WheelEvent" ? that.transitionDuration : 0);
			});

        that.y.left.line = d3.svg.line()
            .x(function (d) { 
                return that.x.scale(d[0]);
            })
            .y(function (d) {
                return that.y.left.scale(d[1]);
            });
			
        that.y.right.line = d3.svg.line()
            .x(function (d) {
                return that.x.scale(d[0]);
            })
            .y(function (d) {
                return that.y.right.scale(d[1]);
            });

        that.y.left.area = d3.svg.area()
            .x(function (d) {
                return that.x.scale(d[0]);
            })
            .y0(function (d) {return Math.min(that.y.left.scale(0), that.height);})
            .y1(function (d) {
                return that.y.left.scale(d[1]);
            });
			
        that.y.right.area = d3.svg.area()
            .x(function (d) {
                return that.x.scale(d[0]);
            })
            .y0(function (d) {return Math.min(that.y.right.scale(0), that.height);})
            .y1(function (d) {
                return that.y.right.scale(d[1]);
            });

        that.series.forEach(function (d, i) {
            if (that.sort[i]) {
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
		if (that.container) {
			that.container.selectAll('svg').remove();
			that.graph = that.container.append('svg:svg')
				.attr('width', that.containerWidth)
				.attr('height', that.containerHeight)
				.append('svg:g')
				.attr('transform', 'translate(' + that.margin[3] + ',' + that.margin[0] + ')');
		} else {
			that.graph = that.containerGroup
				.attr('width', that.containerWidth)
				.attr('height', that.containerHeight)
				.append('g')
				.attr('transform', 'translate(' + that.margin[3] + ',' + that.margin[0] + ')');
		}

        if (that.grid.show) {
            displayGrid.call(this);
        }
		
	// Append clipPath to restrain graph to the center rectangle
		
        that.graph.append("clipPath")
			.attr("id", "clip-" + that.idGraph)
			.append('rect')
            .attr('width', that.width)
            .attr('height', that.height);
		
	//Append overlay to receive mouse events
		
		that.overlay = that.graph.append('rect')
            .attr('id', 'overlay-' + that.idGraph)
            .attr('width', that.width)
            .attr('height', that.height)
            .attr('fill', 'none')
			.style('pointer-events', 'all');
				
        if (that.zoomable) {
            that.overlay.call(that.zoom);
        }
	
	// Put Name In background
	
		if (that.nameInBackground.show) {
			that.graph
				.append("text")
				.classed("background", true)
				.attr('transform', 'translate(' + that.width / 2 + ',' + that.height / 2 + ')')
				.style('text-anchor', 'middle')
				.style('dominant-baseline', 'middle')
				.style('fill', that.nameInBackground.fontColor)
				.text(that.name);
		}
	
        that.graphs = that.graph.append('g').attr('class', 'graphs').style('pointer-events', 'none').attr("clip-path", "url(#clip-" + that.idGraph + ")");
	
	// Create Charts lines and areas
				
        that.graphs.selectAll('path.area').data(that.series, function (d) {return d.id;}).enter()
            .append('svg:path')
            .filter( function (d, i) {return that.fill[i];})
            .classed('area', true)
            .attr('number', function (d, i) {return i;})
            .attr('d', function (d, i) {return that.y[getSide.call(that, i)].area.interpolate(that.interpolate[i])(d.data);})
            .style('pointer-events', 'none')
            .style('fill', function (d, i) {return that.fillColor[i];})
			.style("display", function (d, i) {return that.visibility[i] === "hide" ? "none" : "";});
			
        that.graphs.selectAll('path.line').data(that.series, function (d) {return d.id;}).enter()
            .append('path')
            .classed('line', true)
            .attr('number', function (d, i) {return i;})
            .attr('d', function (d, i) {return that.y[getSide.call(that, i)].line.interpolate(that.interpolate[i])(d.data);})
            .style('opacity', function (d, i) {return that.opacity[i];})
            .style('stroke', function (d, i) {return that.color[i];})
            .style('stroke-width', function (d, i) {return that.strokeWidth[i];})
			.style("display", function (d, i) {return that.visibility[i] === "hide" ? "none" : "";});

        that.graphs.selectAll('.area')
            .style('stroke', 'none')
            .style('opacity', '0.5');

        that.graphs.selectAll('.line')
            .style('fill', 'none');
		
		 that.graphs.selectAll('.area')
		
	// Create Axis
		
        that.xAxis = d3.svg.axis().scale(that.x.scale).tickFormat(that.x.format).ticks(that.x.ticks).tickSize(that.x.tickSize[0], that.x.tickSize[1]);
        that.graph.append('svg:g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + that.height + ')')
            .call(that.xAxis);

        that.yAxisLeft = d3.svg.axis().scale(that.y.left.scale).orient('left').tickFormat(that.y.left.format).ticks(that.y.left.ticks).tickSize(that.y.left.tickSize[0], that.y.left.tickSize[1]);
        that.graph.append('svg:g')
            .attr('class', 'y axis left')
            .call(that.yAxisLeft);
		
		if (that.twoSeries) {
			that.yAxisRight = d3.svg.axis().scale(that.y.right.scale).orient('right').tickFormat(that.y.right.format).ticks(that.y.right.ticks).tickSize(that.y.right.tickSize[0], that.y.right.tickSize[1]);
			that.graph.append('svg:g')
				.attr('class', 'y axis right')
				.attr('transform', 'translate(' + that.width + ',0)')
				.call(that.yAxisRight);
		}
		
	// Style the Axis
			
        that.graph.selectAll('.axis line, .axis path')
            .style('stroke', that.axisColor)
            .style('fill', 'none');
		
		if (that.x.textTickOffset[0] === false) {
			that.x.textTickOffset[0] = that.graph.selectAll('.x.axis text').attr('x');
		}
		if (that.x.textTickOffset[1] === false) {
			that.x.textTickOffset[1] = that.graph.selectAll('.x.axis text').attr('y');
		}
		
		that.graph.selectAll('.x.axis text')
			.attr('x', that.x.textTickOffset[0])
			.attr('y', that.x.textTickOffset[1]);
		
		if (that.y.left.textTickOffset[0] === false) {
			that.y.left.textTickOffset[0] = that.graph.selectAll('.y.axis.left text').attr('x');
		}
		if (that.y.left.textTickOffset[1] === false) {
			that.y.left.textTickOffset[1] = that.graph.selectAll('.y.axis.left text').attr('y');
		}
		
		that.graph.selectAll('.y.axis.left text')
			.attr('x', that.y.left.textTickOffset[0])
			.attr('y', that.y.left.textTickOffset[1]);
		
		if (that.twoSeries) {
			if (that.y.right.textTickOffset[0] === false) {
				that.y.right.textTickOffset[0] = that.graph.selectAll('.y.axis.right text').attr('x');
			}
			if (that.y.right.textTickOffset[1] === false) {
				that.y.right.textTickOffset[1] = that.graph.selectAll('.y.axis.right text').attr('y');
			}
			
			that.graph.selectAll('.y.axis.right text')
				.attr('x', that.y.right.textTickOffset[0])
				.attr('y', that.y.right.textTickOffset[1]);
		}
		
        that.graph.selectAll('.axis text').style('fill', that.axisColor);
 
        that.graph.selectAll('.axis')
            .style('shape-rendering', 'crispEdges');
			
	// Create Labels
		
		var rotate, labelPosition = [], textAnchor;
		
		// X
		
		if (that.x.labelPosition.length > 0 && typeof that.x.labelPosition !== "string" ) {
			labelPosition = that.x.labelPosition.slice(0,2);
			rotate = that.x.labelPosition[2] || 0;
			textAnchor = that.x.labelPosition[3] || 'middle';
		} else {
			rotate = 0;
			textAnchor = that.y.left.labelPosition === "right" ? 'start' : 'middle';
			labelPosition[0] = that.x.labelPosition === "in" ? (that.width / 2) : that.x.labelPosition === "right" ? that.width : (that.width / 2);
			labelPosition[1] = that.height + (that.x.labelPosition === "in" ? (-5) : that.x.labelPosition === "right" ? 0 : (that.margin[2] * 0.7));
		}
		
		that.graph.append("text")
			.attr("transform", "translate(" + labelPosition + ")" + "rotate(" + rotate + ")")
			.style('text-anchor', textAnchor)
			.style('fill', that.axisColor)
			.text(that.x.label);
		
		// Y left
		
		if (that.y.left.labelPosition.length > 0 && typeof that.y.left.labelPosition !== "string" ) {
			labelPosition = that.y.left.labelPosition.slice(0,2);
			rotate = that.y.left.labelPosition[2] || 0;
			textAnchor = that.y.left.labelPosition[3] || 'middle';
		} else {
			rotate = that.y.left.labelPosition === "top" ? 0 : -90;
			textAnchor = 'middle';
			labelPosition[0] = that.y.left.labelPosition === "in" ? 15 : that.y.left.labelPosition === "top" ? 0 : (-that.margin[3] * 0.7);
			labelPosition[1] = that.y.left.labelPosition === "in" ? (that.height / 2) : that.y.left.labelPosition === "top" ? -10 : (that.height / 2);
		}
		
		that.graph.append("text")
			.attr("transform", "translate(" + labelPosition + ")" + "rotate(" + rotate + ")")
			.style('text-anchor', textAnchor)
			.style('fill', that.axisColor)
			.text(that.y.left.label);
		
		// Y Right
		
		if (that.twoSeries) {
			if (that.y.right.labelPosition.length > 0 && typeof that.y.right.labelPosition !== "string" ) {
				labelPosition = that.y.right.labelPosition.slice(0,2); // Minimum 2 arg
				rotate = that.y.right.labelPosition[2] || 0;
				textAnchor = that.y.right.labelPosition[3] || 'middle';
			} else {
				rotate = that.y.right.labelPosition === "top" ? 0 : -90;
				textAnchor = 'middle';
				labelPosition[0] = that.width - (that.y.right.labelPosition === "in" ? 15 : that.y.right.labelPosition === "top" ? 0 : (-that.margin[3] * 0.7));
				labelPosition[1] = that.y.right.labelPosition === "in" ? (that.height / 2) : that.y.right.labelPosition === "top" ? -10 : (that.height / 2);
			}
			
			that.graph.append("text")
				.attr("transform", "translate(" + labelPosition + ")" + "rotate(" + rotate + ")")
				.style('text-anchor', textAnchor)
				.style('fill', that.axisColor)
				.text(that.y.right.label);
		}
		
	// Create Legend
		
		if (that.showLegend) {
			var style = that.fontSize + 'px ' + that.fontFamily,
				dataLegend = that.label.map(function (d, i) {return [d, that.color[i], that.visibility[i], getTextHeight(d, style), getTextWidth(d, style)]; }),
				maxH = d3.max(dataLegend, function (d) {return d[3];}), // -1 => getTextHeight inaccurate
				maxW = d3.max(dataLegend, function (d) {return d[4];}),
				maxOnColumn = ~~that.limitRowLegend || ~~(that.height * (1 - that.legendPosition[1]) / maxH),
				numberOfColumn = Math.ceil(dataLegend.length / maxOnColumn),
				lineSize = 15,
				textOffset = 5;
			
			if (that.legendPosition[0] === true) {
				that.legendPosition[0] = 1 - (numberOfColumn * (maxW + lineSize + 2 * textOffset) / that.width);
			}
				
			var gLegend = that.graph.append("g")
				.attr("id", "chart-legend-" + that.idGraph)
				.attr("class", "chart-legend-" + that.idGraph)
				.attr("transform", "translate(" + [that.width * that.legendPosition[0], that.height * that.legendPosition[1]] + ")")
				.selectAll("g")
				.data(dataLegend)
				.enter()
				.append("g")
				.attr("transform", function (d,i) { return "translate(" + [~~(i / maxOnColumn) * (maxW + lineSize + 2 * textOffset), (i % maxOnColumn) * (maxH)] + ")"; });
					
			gLegend
				.append("rect")
				.attr('x', 0)
				.attr('y', (maxH) / 2) // +4 For strokeWidth
				.attr('width', lineSize)
				.attr('height', (maxH) / 2) // +4 For strokeWidth
				.attr('fill', function (d) {return d[2] !== "hide" ? d[1] : "none";})
				.attr('stroke', function (d) {return d[1];})
				.attr('stroke-width', 2);
			
			gLegend
				.append("text")
				.attr('x', lineSize + textOffset)
				.attr('y', function (d) {return (maxH) / 2 + d[3] / 2;})
				.attr('fill', function (d) {return d[1];})
				.text(function (d) {return d[0];});
				
		}
		
		that.graph.selectAll("text").style('font', that.fontSize + 'px ' + that.fontFamily).style('pointer-events', 'none');
		that.graph.selectAll("text.background").style('font', that.nameInBackground.fontSize + 'px ' + that.nameInBackground.fontFamily);
		
        if (that.showGuideLine) {
            that.initGuideLine();
        }

        if (that.highlight) {
            that.initHightligth();
        }
    };
		
    chart.prototype.initGuideLine = function () {
        var that = this,
			heightText = getTextHeight('0',  that.fontSize + 'px ' + that.fontFamily);

        that.helpGroup = that.graph.append('g').attr('id', 'helpGroup-' + that.idGraph).style('display', 'none').attr("clip-path", "url(#clip-" + that.idGraph + ")");

        that.guideLine = that.helpGroup.append('line')
            .attr('class', 'guideline')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 0)
            .attr('y2', that.height)
            .style('pointer-events', 'none')
            .style('fill', 'none')
            .style('stroke', 'lightgrey')
            .style('stroke-width', 2);
		
		//Time Group
		
		that.timeGroup = that.helpGroup.append("g")
			.classed("time", true);
			
		that.timeGroup.append("rect")
			.attr('y', -(heightText + 4))
			.attr('x', -2)
			.attr('height', 2 + heightText)
			.style('opacity', 0.65)
			.style('fill', 'lightgrey')
			.style('stroke', 'grey')
			.style('stroke-width', 1)
			.style('pointer-events', 'none');
		
		that.timeGroup.append('text').attr('y', -6).style('font',  that.fontSize + 'px ' + that.fontFamily).style('fill', that.axisColor).style('pointer-events', 'none');

		// Values groups
		
        that.helpGroups = that.helpGroup.selectAll("g.helpGroup")
			.data(d3.range(that.seriesLength))
			.enter()
			.append("g")
			.classed("helpGroup", true);
		
		that.helpGroups.append('rect')
			.classed('textbg', true)
			.style('opacity', 0.65)
			.style('fill', 'lightgrey')
			.style('stroke', 'grey')
			.style('stroke-width', 1)
			.style('pointer-events', 'none')
			.attr('x', 10)
			.attr('y', -heightText)
			.attr('height', 4 + heightText);

		that.helpGroups.append('text').style('font',  that.fontSize + 'px ' + that.fontFamily).style('fill', that.axisColor).style('pointer-events', 'none');
		
		that.helpGroups.append('circle')
			.attr('class', 'guideline')
			.attr('cx', 0)
			.attr('cy', 0)
			.attr('r', 5)
			.style('pointer-events', 'none')
			.style('fill', 'none')
			.style('stroke', function (d,i) {return that.color[i];})
			.style('stroke-width', 1);

        that.overlay
            .on('mouseover', function () {
                 that.showGuideLine ? that.helpGroup.style('display', null) : "";
            })
            .on('mouseout', function () {
                //If the focus is taken by a line => it means we didn't go out of the graph
                if (d3.select(d3.event.toElement).node() && !d3.select(d3.event.toElement).classed('line'))
                    that.helpGroup.style('display', 'none');
            })
            .on('mousemove', function () { that.showGuideLine ? updateGuideLine.call(that) : ""; });
		
		that.guideLineInitiated = true;
    };
	
	chart.prototype.toggleGuideLine = function (state) {
		var that = this;
		that.showGuideLine = state || !that.showGuideLine;
		
		if (!that.showGuideLine && that.guideLineInitiated) {
			that.helpGroup.style('display', 'none');
		} else if (that.showGuideLine && !that.guideLineInitiated) {
			that.initGuideLine();
		} else if (that.showGuideLine && that.guideLineInitiated) {
			that.helpGroup.style('display', '');
		}
	};

    chart.prototype.initHightligth = function () {
        var that = this,
            mouseover,
            mouseout;

        mouseover = function (i) {
            that.graph.selectAll('#chart-legend-' + that.idGraph + ' text').filter(function (d) {return d === i;}).style('text-decoration', "underline");
			that.graphs.selectAll('.line').style('opacity', function (d, i) { return that.opacity[i] / 2;});
			d3.select(this).style('stroke-width', (that.strokeWidth[i] * 1.5)).style('opacity', 1);
			if (that.visibility[i] === "hide") {
				that.dash(i);
			}
			that.showGuideLine ? updateGuideLine.call(that) : "";
        };

        mouseout = function (i) {
			that.graph.selectAll('#chart-legend-' + that.idGraph + ' text').filter(function (d) {return d === i;}).style('text-decoration', "none");
				that.graphs.selectAll('.line').style('opacity', function (d, i) { return that.opacity[i];});
				d3.select(this).style('stroke-width', that.strokeWidth[i]).style('opacity', that.opacity[i]);
				that.showGuideLine ? updateGuideLine.call(that) : "";
			if (that.visibility[i] === "dashed") {
				that.hide(i);
			}
        };

        that.graphs.selectAll('.line')
            .style('pointer-events', 'stroke')
			.on('click', function (d, i) { that.visibility[i] === "show" ? that.hide(i) : that.show(i);})
            .on('mouseover', function (d, i) { return mouseover.call(this, i);})
            .on('mouseout', function (d, i) { return mouseout.call(this, i);})
            .on('mousemove', that.showGuideLine ? updateGuideLine.bind(that) : "");
		
		that.graph.select('#chart-legend-' + that.idGraph).selectAll("text").data(d3.range(that.seriesLength))
			.style('pointer-events', 'stroke')
			.style('cursor', 'pointer')
			.on('click', function (i) { that.visibility[i] === "show" ? that.hide(i) : that.show(i);})
            .on('mouseover', function (i) { var ctx = that.graphs.select('.line[number="' + i + '"]').node(); mouseover.call(ctx, i);})
            .on('mouseout', function (i) { var ctx = that.graphs.select('.line[number="' + i + '"]').node(); mouseout.call(ctx, i);});
			
		that.graph.select('#chart-legend-' + that.idGraph).selectAll("rect").data(d3.range(that.seriesLength))
			.style('pointer-events', 'all')
			.style('cursor', 'pointer')
            .on('click', function (i) { that.visibility[i] === "show" ? that.hide(i) : that.show(i);})
            .on('mouseover', function (i) { var ctx = that.graphs.select('.line[number="' + i + '"]').node(); mouseover.call(ctx, i);})
            .on('mouseout', function (i) { var ctx = that.graphs.select('.line[number="' + i + '"]').node(); mouseout.call(ctx, i);});
    };

	chart.prototype.addPointsAt = function (xValue, yValues, rescaleX, rescaleY, scalingMethod) {
		var that = this,
			bisect = d3.bisector(function(d) { return d[0]; }).left,
			index;
		rescaleX = rescaleX === undefined ? true : rescaleX;
		rescaleY = rescaleY === undefined ? true : rescaleY;
		
		that.series.forEach(function (d, i) {
			if (yValues[i] === undefined) {return;}
			
			if (that.sort[i]) {
                index = bisect(d.data, xValue);
				d.data.splice(index, 0, [xValue, yValues[i]]);
            } else {
				d.data.push([xValue, yValues[i]]);
			}
        });
		
		if (rescaleX || rescaleY) {
			that.rescale(rescaleX, rescaleY, rescaleY, scalingMethod);
		}
	};
	
	chart.prototype.addPointsForSerie = function (serie, points, rescaleX, rescaleY, scalingMethod) {
		var that = this,
			bisect = d3.bisector(function(d) { return d[0]; }).left,
			index;
		rescaleX = rescaleX === undefined ? true : rescaleX;
		rescaleY = rescaleY === undefined ? true : rescaleY;
		
		points.forEach(function (d) {			
			if (that.sort[serie]) {
                index = bisect(that.series[serie].data, d[0]);
				that.series[serie].data.splice(index, 0, d);
            } else {
				that.series[serie].data.push(d);
			}
        });
		
		
		if (rescaleX || rescaleY) {
			that.rescale(rescaleX, rescaleY, rescaleY, scalingMethod);
		}
	};
	
	chart.prototype.removePointsBetween = function (xExtent, rescaleX, rescaleY, scalingMethod) {
		var that = this,
			bisectL = d3.bisector(function(d) { return d[0]; }).left,
			bisectR = d3.bisector(function(d) { return d[0]; }).right,
			indexL, indexR,
			removedValues = [];
		rescaleX = rescaleX === undefined ? true : rescaleX;
		rescaleY = rescaleY === undefined ? true : rescaleY;
		
		that.series.forEach(function (d, i) {
			indexL = xExtent[0] === undefined ? 0 : bisectL(d.data, xExtent[0]);
			indexR = xExtent[1] === undefined ? d.data.length : bisectR(d.data, xExtent[1]);
			removedValues[i] = d.data.splice(indexL, indexR - indexL);
		});
		
		if (rescaleX || rescaleY) {
			that.rescale(rescaleX, rescaleY, rescaleY, scalingMethod);
		}
		
		return removedValues;
	}
	
	chart.prototype.clear = function () {
		this.series.forEach(function (d) {
			d.data = [];
		});
	};
	
	chart.prototype.rescale = function (x, y1, y2, scalingMethod) {
		x = x === undefined ? true : x;
		y1 = y1 === undefined ? true : y1;
		y2 = y2 === undefined ? true : y2;
		var that = this,
			currentExtent,
			scalingMethod = scalingMethod || "fit",
			rx1 = (x === true || (x && x[0]) === true) ?  true : (x && x[0]) === false ? that.x.extent[0] : x[0],
			rx2 = (x === true || (x && x[1]) === true) ?  true : (x && x[1]) === false ? that.x.extent[1] : x[1],
			ryl1 = (y1 === true || (y1 && y1[0]) === true) ?  true : (y1 && y1[0]) === false ? that.y.left.extent[0] : y1[0],
			ryl2 = (y1 === true || (y1 && y1[1]) === true) ?  true : (y1 && y1[1]) === false ? that.y.left.extent[1] : y1[1],
			ryr1 = (y2 === true || (y2 && y2[0]) === true) ?  true : (y2 && y2[0]) === false ? that.y.right.extent[0] : y2[0],
			ryr2 = (y2 === true || (y2 && y2[1]) === true) ?  true : (y2 && y2[1]) === false ? that.y.right.extent[1] : y2[1];
		
		if (y1) {
			currentExtent = [d3.min(that.series.filter(function (d, i) {return d.serieId === 0 && that.visibility[i] !== "hide";}), function (d) {
				return d3.min(d.data, function (d) {
					return d[1];
				});
			}) || 0, d3.max(that.series.filter(function (d, i) {return d.serieId === 0 && that.visibility[i] !== "hide";}), function (d) {
				return d3.max(d.data, function (d) {
					return d[1];
				});
			}) || 0];
			
			if (that.optimizeYScale) {
				currentExtent[0] -= 0.1 * (currentExtent[1] - currentExtent[0]);
				currentExtent[1] += 0.1 * (currentExtent[1] - currentExtent[0]);
			}
			
			that.y.left.extent[0] = ryl1 !== true ? ryl1 : scalingMethod === "fit" ? currentExtent[0] : Math.min(currentExtent[0], that.y.left.extent[0]);
			that.y.left.extent[1] = ryl2 !== true ? ryl2 : scalingMethod === "fit" ? currentExtent[1] : Math.max(currentExtent[1], that.y.left.extent[1]);
		}
		
		if (y2 && that.twoSeries) {
			currentExtent = [d3.min(that.series.filter(function (d, i) {return d.serieId === 1 && that.visibility[i] !== "hide";}), function (d) {
				return d3.min(d.data, function (d) {
					return d[1];
				});
			}) || 0, d3.max(that.series.filter(function (d, i) {return d.serieId === 1 && that.visibility[i] !== "hide";}), function (d) {
				return d3.max(d.data, function (d) {
					return d[1];
				});
			}) || 0];
			
			if (that.optimizeYScale) {
				currentExtent[0] -= 0.1 * (currentExtent[1] - currentExtent[0]);
				currentExtent[1] += 0.1 * (currentExtent[1] - currentExtent[0]);
			}
			
			that.y.right.extent[0] = ryr1 !== true ? ryr1 : scalingMethod === "fit" ? currentExtent[0] : Math.min(currentExtent[0], that.y.right.extent[0]);
			that.y.right.extent[1] = ryr2 !== true ? ryr2 : scalingMethod === "fit" ? currentExtent[1] : Math.max(currentExtent[1], that.y.right.extent[1]);
		}
		
		if (x) {
			currentExtent = [
				d3.min(that.series.filter(function (d, i) {return that.visibility[i] !== "hide";}), function (d) {
					return d3.min(d.data, function (d) {
						return d[0];
					});
				}),
				d3.max(that.series.filter(function (d, i) {return that.visibility[i] !== "hide";}), function (d) {
					return d3.max(d.data, function (d) {
						return d[0];
					});
				})
			];
			
			that.x.extent[0] = rx1 !== true ? rx1 : scalingMethod === "fit" ? currentExtent[0] : Math.min(currentExtent[0], that.x.extent[0]);
			that.x.extent[1] = rx2 !== true ? rx2 : scalingMethod === "fit" ? currentExtent[1] : Math.max(currentExtent[1], that.x.extent[1]);
		}
		
		if (that.y.left.extent[0] === that.y.left.extent[1]) {
			that.y.left.extent[0] -= 1;
			that.y.left.extent[1] += 1;
		}
		
		if (that.y.right.extent[0] === that.y.right.extent[1]) {
			that.y.right.extent[0] -= 1;
			that.y.right.extent[1] += 1;
		}
		
		that.x.scale.domain(that.x.extent);
		that.y.left.scale.domain(that.y.left.extent);
		that.y.right.scale.domain(that.y.right.extent);
		
		var yRightDomain = that.y.right.scale.domain();
		that._.initialScale = d3.scale.linear().domain(that.y.right.extent).range([that.height, 0]),
		that._.initialExtent = yRightDomain[1] - yRightDomain[0];
		
		that.zoom
			.x(that.x.scale)
			.y(that.y.left.scale);
	};
	
	chart.prototype.rezoom = function (zoom, translate) {
		this.zoom
			.scale(zoom)
			.translate(translate);
			
		var upYScale = this._.initialScale.invert(-translate[1] / zoom),
			downYScale = upYScale - this._.initialExtent / zoom;
		this.y.right.scale.domain([downYScale, upYScale]);
	};

    chart.prototype.guideLineFollow = function (serieNumber) {
        this.serieFollowed = serieNumber;
    };

	chart.prototype.show = function (serieNumber) {
		var that = this;
		this.visibility[serieNumber] = "show";
		this.graph.selectAll('path.area').filter(function (d) {return d.id === serieNumber;}).style("display", "").classed("chart-hidden", false).attr('d', function (d) {return that.y[getSide.call(that, d.id)].area.interpolate(that.interpolate[d.id])(d.data);});
		this.graph.selectAll('path.line').filter(function (d) {return d.id === serieNumber;}).style("display", "").style("stroke-dasharray", null).classed("chart-hidden", false).attr('d', function (d) {return that.y[getSide.call(that, d.id)].line.interpolate(that.interpolate[d.id])(d.data);});
		this.graph.selectAll('#chart-legend-' + this.idGraph + ' rect').filter(function (d) {return d === serieNumber;}).style("fill", this.color[serieNumber])
	};
	
	chart.prototype.dash = function (serieNumber) {
		var that = this;
		this.visibility[serieNumber] = "dashed";
		this.graph.selectAll('path.area').filter(function (d) {return d.id === serieNumber;}).style("display", "").classed("chart-hidden", false).attr('d', function (d) {return that.y[getSide.call(that, d.id)].area.interpolate(that.interpolate[d.id])(d.data);});
		this.graph.selectAll('path.line').filter(function (d) {return d.id === serieNumber;}).style("display", "").style("stroke-dasharray", "5,5").classed("chart-hidden", false).attr('d', function (d) {return that.y[getSide.call(that, d.id)].line.interpolate(that.interpolate[d.id])(d.data);});
		this.graph.selectAll('#chart-legend-' + this.idGraph + ' rect').filter(function (d) {return d === serieNumber;}).style("fill", "none");
	};
	
	chart.prototype.hide = function (serieNumber) {
		this.visibility[serieNumber] = "hide";
		this.graph.selectAll('path.area').filter(function (d) {return d.id === serieNumber;}).style("display", "none").classed("chart-hidden", true);
		this.graph.selectAll('path.line').filter(function (d) {return d.id === serieNumber;}).style("display", "none").style("stroke-dasharray", null).classed("chart-hidden", true);
		this.graph.selectAll('#chart-legend-' + this.idGraph + ' rect').filter(function (d) {return d === serieNumber;}).style("fill", "none");
	};
	
	chart.prototype.showAll = function () {
		var that = this;
		this.visibility.forEach( function (d, i) { that.visibility[i] = "show"; });
		this.graph.selectAll('path.area').style("display", "").classed("chart-hidden", false).attr('d', function (d) {return that.y[getSide.call(that, d.id)].area.interpolate(that.interpolate[d.id])(d.data);});
		this.graph.selectAll('path.line').style("display", "").style("stroke-dasharray", null).classed("chart-hidden", false).attr('d', function (d) {return that.y[getSide.call(that, d.id)].line.interpolate(that.interpolate[d.id])(d.data);});
		this.graph.selectAll('#chart-legend-' + that.idGraph + ' rect').style("fill", function (d) { return that.color[d]; }).style("stroke-dasharray", null);
	};
	
	chart.prototype.hideAll = function () {
		var that = this;
		this.visibility.forEach( function (d, i) { that.visibility[i] = "hide"; });
		this.graph.selectAll('path.area').style("display", "none").classed("chart-hidden", true);
		this.graph.selectAll('path.line').style("display", "none").style("stroke-dasharray", null).classed("chart-hidden", true);
		this.graph.selectAll('#chart-legend-' + that.idGraph + ' rect').style("fill", "none").style("stroke-dasharray", null);
	};
	
    chart.prototype.update = function (time, ease) {
        var that = this,
			t = that.graph.transition().duration(time || 0).ease(ease || 'linear');
			
        t.select(".x.axis").call(that.xAxis);
        t.select(".y.axis.left").call(that.yAxisLeft);
        that.twoSeries ? t.select(".y.axis.right").call(that.yAxisRight) : "";
        
		t.selectAll('.axis text').style('font', that.fontSize + 'px ' + that.fontFamily).style('fill', that.axisColor);
        t.selectAll('.x.axis text').attr('x', that.x.textTickOffset[0]).attr('y', that.x.textTickOffset[1]);
		t.selectAll('.y.axis.left text').attr('x', that.y.left.textTickOffset[0]).attr('y', that.y.left.textTickOffset[1]);
		that.twoSeries ? t.selectAll('.y.axis.right text').attr('x', that.y.right.textTickOffset[0]).attr('y', that.y.right.textTickOffset[1]) : "";
		t.selectAll('.axis line, .axis path').style('stroke', that.axisColor).style('fill', 'none');	
		
        t.selectAll('path.area:not(.chart-hidden)').attr('d', function (d) {return that.y[getSide.call(that, d.id)].area.interpolate(that.interpolate[d.id])(d.data);});
        t.selectAll('path.line:not(.chart-hidden)').attr('d', function (d) {return that.y[getSide.call(that, d.id)].line.interpolate(that.interpolate[d.id])(d.data);});

		if (that.grid.show) {
			updateGrid.call(that, time, ease);
		}
		
		if (that.showGuideLine && d3.event) {
			updateGuideLine.call(that);
		}
    };
	
	var updateGrid = function (time, ease) {
		var that = this,
			t = that.graph.transition().duration(time || 0).ease(ease || 'linear');
		
		t.select(".x.grid").call(that.xGrid);
        t.select(".y.grid").call(that.y.leftGrid);
		
		var g = that.graph.select(".chart-grid");
		
		g.selectAll('line')
            .style('pointer-events', 'none')
            .style('fill', 'none')
            .style('stroke', that.grid.color)
            .style('stroke-width', that.grid.strokeWidth)
            .style('opacity', that.grid.opacity);

        g.selectAll('path').style('display', 'none');
	};
	
    var displayGrid = function () {
        var that = this;
			
        that.xGrid = d3.svg.axis().scale(that.x.scale).tickSize(-that.height).tickSubdivide(true).tickFormat(function () {
            return '';
        });
        that.y.leftGrid = d3.svg.axis().scale(that.y.left.scale).orient('left').tickSize(-that.width).tickFormat(function () {
            return '';
        });

        var g = that.graph.append('svg:g').attr('class', 'chart-grid').style('pointer-events', 'none');

        g.append('g')
            .attr('class', 'x grid')
            .attr('transform', 'translate(0,' + that.height + ')')
            .call(that.xGrid)
            .style('pointer-events', 'none')
            .style('fill', 'none');

        g.append('g')
            .attr('class', 'y grid')
            .call(that.y.leftGrid)
            .style('pointer-events', 'none')
            .style('fill', 'none');

        g.selectAll('line')
            .style('pointer-events', 'none')
            .style('fill', 'none')
            .style('stroke', that.grid.color)
            .style('stroke-width', that.grid.strokeWidth)
            .style('opacity', that.grid.opacity);

        g.selectAll('path').style('display', 'none');
    };

    var resize = function () {
        var that = this;
        that.containerWidth = that.container ? parseFloat(that.container.style('width')) : that.containerWidth;
        that.containerHeight = that.container ? parseFloat(that.container.style('height')) : that.containerHeight;
        that.width = that.containerWidth - (that.margin[1] + that.margin[3]);
        that.height = that.containerHeight - (that.margin[0] + that.margin[2]);
        that.x.scale.range([0, that.width]);
        that.y.left.scale.range([that.height, 0]);
        that.y.right.scale.range([that.height, 0]);
        that.createVisualization();
    };

    var updateGuideLine = function () {
        var that = this,
            min = function (array) {
                var currentMin = 0;
                for (var i = 1; i < array.length; i++)
                    currentMin = array[i] < array[currentMin] ? i : currentMin;
                return currentMin;
            };
			
        var x0 = that.x.scale.invert(d3.mouse(that.graph.node())[0]),
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
		
		var xValue = dd[serieFollowed][0];
		
        that.guideLine
            .attr('x1', that.x.scale(xValue))
            .attr('x2', that.x.scale(xValue));
		
		// Time Group
		
		that.timeGroup.attr('transform', function (d, i) {
				return 'translate(' + (that.x.scale(xValue) - getTextWidth(that.x.guideLineFormat(xValue), that.fontSize + 'px ' + that.fontFamily) / 2) + ', ' + that.height + ')';
			})
			.select("text")
			.text(that.x.guideLineFormat(xValue));
		
		that.timeGroup
			.select("rect")
			.attr('width', 4 + getTextWidth(that.x.guideLineFormat(xValue), that.fontSize + 'px ' + that.fontFamily));
		
		// Values Group	
			
        that.helpGroups
			.style("display", function (d, i) {return that.visibility[i] === "hide" ? "none" : "";})
            .attr('transform', function (d, i) {
                return 'translate(' + that.x.scale(dd[i][0]) + ', ' + that.y[getSide.call(that, i)].scale(dd[i][1]) + ')';
			});
		
		that.helpGroup.selectAll(".helpGroup text")
            .attr('dx', function () {
			return that.width - d3.transform(d3.select(this.parentNode).attr("transform")).translate[0] > 50 ? 12 : -12;
			})
            .attr('text-anchor', function () {return that.width - d3.transform(d3.select(this.parentNode).attr("transform")).translate[0] > 50 ? 'start' : 'end';})
            .text(function (d, i) {
                return d3.format(',.2f')(dd[i][1]);
            });
	
		that.helpGroup.selectAll('.textbg')
			.attr('x', function (d, i) {
				return that.width - d3.transform(d3.select(this.parentNode).attr("transform")).translate[0] > 50 ? 10 :
				-14 - getTextWidth(d3.format(',.2f')(dd[i][1]), that.fontSize + 'px ' + that.fontFamily);
			})
			.attr('width', function (d, i) {
				return 4 + getTextWidth(d3.format(',.2f')(dd[i][1]), that.fontSize + 'px ' + that.fontFamily);
			});
    };
	
	var getTextHeight = function (text, style) {
		var svg = d3.select("body").append("svg:svg")
			.attr("width", 0)
			.attr("height", 0)
			.attr("opacity", 0);

		var text = svg.append("svg:text")
			.attr("opacity", 0)
			.style("font", style)
			.text(text);

		var height = text.node().offsetHeight || text.node().getBBox().height;
		
		text.remove();
		svg.remove();
		
		return height;
	};
	
	var getTextWidth = function (text, style) {
		var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        ctx.font = style;
        var w = ctx.measureText(text).width;
		return w;
	};

	var getSide = function (i) {return this.series[i].serieId === 0 ? "left" : "right"};
	
    d3lib.chart = chart;
})();