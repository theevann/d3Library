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
            xExt = [0,0],
            yLeftExt = [0,0],
            yRightExt = [0,0];
		
		that._ = {};
		that.twoSeries = false;

        //Required arguments
		if (args.container.nodeName === 'g') {
			that.containerGroup = d3.select(args.container);
		} else {
			that.container = d3.select(args.container);
		}
        that.series = args.series;
        that.series.forEach(function (d) {
			if (!d.serieId) {
				d.serieId = 0;
			} else if (d.serieId === 1) {
				that.twoSeries = true;
			}
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
        that.showLegend = args.showLegend || false;
        that.highlight = args.highlight || false;
		that.optimizeYScale = args.optimizeYScale === false ? false : true;
        m = that.margin = args.margin || [0.05, 0.05, 0.05, 0.05, true]; // [Top, Right, Bottom, Left, proportional]
        that.serieFollowed = args.serieFollowed || -1;
		that.parseTime = args.parseTime || false;
		that.legendPosition = args.legendPosition || [0.8, 0];
		that.transitionDuration = args.transitionDuration || 100;
		
		that.fontFamily = args.fontFamily || "sans-serif";
        that.fontSize = args.fontSize || 11;
		that.axisColor = args.axisColor || "black";
        that.zoomable = args.zoomable || false;

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
			labelPosition : args.x.labelPosition || "out"
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
			yLeftExt[0] -= 0.1 * (yLeftExt[1] - yLeftExt[0]);
			yLeftExt[1] += 0.1 * (yLeftExt[1] - yLeftExt[0]);
			if (that.twoSeries) {
				yRightExt[0] -= 0.1 * (yRightExt[1] - yRightExt[0]);
				yRightExt[1] += 0.1 * (yRightExt[1] - yRightExt[0]);
			}
		}
		
		var mapper = function (attr, def) {
			return that.series.map(function (d, i) {
				return (d[attr] !== undefined) ? d[attr] : (args[attr] !== undefined) ? args[attr] : typeof def !== "function" ? def : def(d, i);
			});
		};
		
        that.fill = mapper("fill", false);
        that.sort = mapper("sort", false);
        that.strokeWidth = mapper("strokeWidth", 2);
        that.opacity = mapper("opacity", 1);
        that.interpolate = mapper("interpolate", "linear");
        that.color = mapper("color", function (d, i) {return colors(i % 10);});
        that.fillColor = mapper("fillColor", function (d, i) {return that.color[i];});
        that.label = mapper("label", function (d, i) {return ('Serie ' + i);});

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
		
		if (that.parseTime) {
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
			.attr("id", "clip")
			.append('rect')
            .attr('width', that.width)
            .attr('height', that.height);
		
	//Append overlay to receive mouse events
		
		that.overlay = that.graph.append('rect')
            .attr('id', 'overlay')
            .attr('width', that.width)
            .attr('height', that.height)
            .attr('fill', 'none')
			.style('pointer-events', 'all');
				
        if (that.zoomable) {
            that.overlay.call(that.zoom);
        }

        that.graphs = that.graph.append('g').attr('id', 'graphs').style('pointer-events', 'none').attr("clip-path", "url(#clip)");
		
	// Create Charts lines and areas
		
		var getSide = (function (i) {return that.series[i].serieId === 0 ? "left" : "right"});

        that.graphs.selectAll('path.area').data(that.series).enter()
            .append('svg:path')
            .filter( function (d, i) {return that.fill[i];})
            .classed('area', true)
            .attr('number', function (d, i) {return i;})
            .attr('d', function (d, i) {return that.y[getSide(i)].area.interpolate(that.interpolate[i])(d.data);})
            .style('pointer-events', 'none')
            .style('fill', function (d, i) {return that.fillColor[i];});

        that.graphs.selectAll('path.line').data(that.series).enter()
            .append('path')
            .classed('line', true)
            .attr('number', function (d, i) {return i;})
            .attr('d', function (d, i) {return that.y[getSide(i)].line.interpolate(that.interpolate[i])(d.data);})
            .style('opacity', function (d, i) {return that.opacity[i];})
            .style('stroke', function (d, i) {return that.color[i];})
            .style('stroke-width', function (d, i) {return that.strokeWidth[i];});

        that.graphs.selectAll('.area')
            .style('stroke', 'none')
            .style('opacity', '0.5');

        that.graphs.selectAll('.line')
            .style('fill', 'none');
		
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
			labelPosition[1] = that.height + (that.x.labelPosition === "in" ? (- 15) : that.x.labelPosition === "right" ? 0 : (that.margin[2] * 0.7));
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
				labelPosition[0] = that.width - that.y.right.labelPosition === "in" ? 15 : that.y.right.labelPosition === "top" ? 0 : (-that.margin[3] * 0.7);
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
				dataLegend = that.label.map(function (d, i) {return [d, that.color[i], getTextHeight(d, style), getTextWidth(d, style)]; }),
				maxH = d3.max(dataLegend, function (d) {return d[2];}), // -1 => getTextHeight inaccurate
				maxW = d3.max(dataLegend, function (d) {return d[3];}),
				maxOnColumn = ~~(that.height / maxH),
				lineSize = 15,
				textOffset = 5;
				
			var gLegend = that.graph.append("g")
				.attr("id", "chart-legend")
				.attr("transform", "translate(" + [that.width * that.legendPosition[0], that.height * that.legendPosition[1]] + ")")
				.selectAll("g")
				.data(dataLegend)
				.enter()
				.append("g")
				.attr("transform", function (d,i) { return "translate(" + [~~(i / maxOnColumn) * (maxW + lineSize + textOffset), (i % maxOnColumn) * (maxH)] + ")"; });
					
			gLegend
				.append("line")
				.attr('x1', 0)
				.attr('y1', (maxH) / 2 + 4) // +4 For strokeWidth
				.attr('x2', lineSize)
				.attr('y2', (maxH) / 2 + 4) // +4 For strokeWidth
				.attr('stroke', function (d) {return d[1];})
				.attr('stroke-width', 2);
			
			gLegend
				.append("text")
				.attr('x', lineSize + textOffset)
				.attr('y', function (d) {return (maxH) / 2 + d[2] / 2;})
				.attr('fill', function (d) {return d[1];})
				.text(function (d) {return d[0];});
				
		}
		
		that.graph.selectAll("text").style('font', that.fontSize + 'px ' + that.fontFamily);
		
        if (that.showGuideLine) {
            that.initGuideLine();
        }

        if (that.highlight) {
            that.initHightligth();
        }
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
			that.rescale(rescaleX, rescaleY, scalingMethod);
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
			that.rescale(rescaleX, rescaleY, scalingMethod);
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
			that.rescale(rescaleX, rescaleY, scalingMethod);
		}
		
		return removedValues;
	}
	
	chart.prototype.clear = function () {
		this.series.forEach(function (d) {
			d.data = [];
		});
	};
	
	chart.prototype.rescale = function (x, y, scalingMethod) {
		x = x === undefined ? true : x;
		y = y === undefined ? true : y;
		var that = this,
			currentExtent,
			scalingMethod = scalingMethod || "fit",
			rx1 = (x === true || (x && x[0]) === true) ?  true : (x && x[0]) === false ? that.x.extent[0] : x[0],
			rx2 = (x === true || (x && x[1]) === true) ?  true : (x && x[1]) === false ? that.x.extent[1] : x[1],
			ryl1 = (y === true || (y && y[0]) === true) ?  true : (y && y[0]) === false ? that.y.left.extent[0] : y[0],
			ryl2 = (y === true || (y && y[1]) === true) ?  true : (y && y[1]) === false ? that.y.left.extent[1] : y[1];
			ryr1 = (y === true || (y && y[0]) === true) ?  true : (y && y[0]) === false ? that.y.right.extent[0] : y[0],
			ryr2 = (y === true || (y && y[1]) === true) ?  true : (y && y[1]) === false ? that.y.right.extent[1] : y[1];
		
		if (y) {
			currentExtent = [d3.min(that.series.filter(function (d) {return d.serieId === 0;}), function (d) {
				return d3.min(d.data, function (d) {
					return d[1];
				});
			}) || 0, d3.max(that.series.filter(function (d) {return d.serieId === 0;}), function (d) {
				return d3.max(d.data, function (d) {
					return d[1];
				});
			}) || 0];
			
			that.y.left.extent[0] = ry1 !== true ? ry1 : scalingMethod === "fit" ? currentExtent[0] : Math.min(currentExtent[0], that.y.left.extent[0]);
			that.y.left.extent[1] = ry2 !== true ? ry2 : scalingMethod === "fit" ? currentExtent[1] : Math.max(currentExtent[1], that.y.left.extent[1]);
			
			if (that.optimizeYScale) {
				that.y.left.extent[0] -= 0.1 * (that.y.left.extent[1] - that.y.left.extent[0]);
				that.y.left.extent[1] += 0.1 * (that.y.left.extent[1] - that.y.left.extent[0]);
			}
			
			if (that.twoSeries) {
				currentExtent = [d3.min(that.series.filter(function (d) {return d.serieId === 1;}), function (d) {
					return d3.min(d.data, function (d) {
						return d[1];
					});
				}) || 0, d3.max(that.series.filter(function (d) {return d.serieId === 1;}), function (d) {
					return d3.max(d.data, function (d) {
						return d[1];
					});
				}) || 0];
				
				that.y.right.extent[0] = ry1 !== true ? ry1 : scalingMethod === "fit" ? currentExtent[0] : Math.min(currentExtent[0], that.y.right.extent[0]);
				that.y.right.extent[1] = ry2 !== true ? ry2 : scalingMethod === "fit" ? currentExtent[1] : Math.max(currentExtent[1], that.y.right.extent[1]);
				
				if (that.optimizeYScale) {
					that.y.right.extent[0] -= 0.1 * (that.y.left.extent[1] - that.y.left.extent[0]);
					that.y.right.extent[1] += 0.1 * (that.y.left.extent[1] - that.y.left.extent[0]);
				}
			}
		}
		
		if (x) {
			currentExtent = [
				d3.min(that.series, function (d) {
					return d3.min(d.data, function (d) {
						return d[0];
					});
				}),
				d3.max(that.series, function (d) {
					return d3.max(d.data, function (d) {
						return d[0];
					});
				})
			];
			
			that.x.extent[0] = rx1 !== true ? rx1 : scalingMethod === "fit" ? currentExtent[0] : Math.min(currentExtent[0], that.x.extent[0]);
			that.x.extent[1] = rx2 !== true ? rx2 : scalingMethod === "fit" ? currentExtent[1] : Math.max(currentExtent[1], that.x.extent[1]);
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

    chart.prototype.initGuideLine = function () {
        var that = this;

        that.helpGroup = that.graph.append('g').attr('class', 'helpGroup').style('display', 'none');

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

        that.helpGroups = that.helpGroup.selectAll("g.helpGroup")
			.data(d3.range(that.seriesLength))
			.enter()
			.append("g")
			.classed("helpGroup", true);
		
		that.helpGroups.append('rect')
			.style('opacity', 0.65)
			.style('fill', 'lightgrey')
			.style('stroke', 'grey')
			.style('stroke-width', 1)
			.style('pointer-events', 'none')
			.attr('x', 10)
			.attr('y', function () {return  - getTextHeight('0', that.fontSize + 'px ' + that.fontFamily);})
			.attr('height', function () {return 4 + getTextHeight('0',  that.fontSize + 'px ' + that.fontFamily);});

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
                that.helpGroup.style('display', null);
            })
            .on('mouseout', function () {
                //If the focus is taken by a line => it means we didn't go out of the graph
                if (d3.select(d3.event.toElement).node() && !d3.select(d3.event.toElement).classed('line'))
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
            d3.select(this).style('stroke-width', (stw * 1.5)).style('opacity', 1);
            that.showGuideLine ? updateGuideLine.call(that) : "";
        };

        mouseout = function (i) {
            var stw = parseInt(d3.select(this).style('stroke-width'), 10);
            d3.select(this).style('stroke-width', (stw / 1.5)).style('opacity', that.opacity[i]);
            that.showGuideLine ? updateGuideLine.call(that) : "";
        };

        that.graphs.selectAll('.line')
            .style('pointer-events', 'stroke')
            .on('mouseover', mouseover)
            .on('mouseout', function (d, i) { return mouseout.call(this, i);})
            .on('mousemove', that.showGuideLine ? updateGuideLine.call(that) : "");
		
		that.graph.select('#chart-legend').selectAll("text").data(d3.range(that.seriesLength))
			.style('pointer-events', 'stroke')
			.style('cursor', 'pointer')
            .on('mouseover', function (i) { var ctx = that.graphs.select('.line[number="' + i + '"]').node(); return mouseover.call(ctx);})
            .on('mouseout', function (i) { var ctx = that.graphs.select('.line[number="' + i + '"]').node(); return mouseout.call(ctx, i);});
			
		that.graph.select('#chart-legend').selectAll("line").data(d3.range(that.seriesLength))
			.style('pointer-events', 'stroke')
			.style('cursor', 'pointer')
            .on('mouseover', function (i) { var ctx = that.graphs.select('.line[number="' + i + '"]').node(); return mouseover.call(ctx);})
            .on('mouseout', function (i) { var ctx = that.graphs.select('.line[number="' + i + '"]').node(); return mouseout.call(ctx, i);});
    };

    chart.prototype.guideLineFollow = function (serieNumber) {
        this.serieFollowed = serieNumber;
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
		
		var getSide = (function (i) {return that.series[i].serieId === 0 ? "left" : "right"});
        t.selectAll('path.area').attr('d', function (d, i) {return that.y[getSide(i)].area.interpolate(that.interpolate[i])(d.data);});
        t.selectAll('path.line').attr('d', function (d, i) {return that.y[getSide(i)].line.interpolate(that.interpolate[i])(d.data);});
		
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
            },
			getSide = (function (i) {return that.series[i].serieId === 0 ? "left" : "right"});

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

        that.guideLine
            .attr('x1', that.x.scale(dd[serieFollowed][0]))
            .attr('x2', that.x.scale(dd[serieFollowed][0]));

        that.helpGroups
            .attr('transform', function (d, i) {
                return 'translate(' + that.x.scale(dd[i][0]) + ', ' + that.y[getSide(i)].scale(dd[i][1]) + ')';
			});
		
		that.helpGroup.selectAll("text")
            .attr('dx', function () {
			return that.width - d3.transform(d3.select(this.parentElement).attr("transform")).translate[0] > 50 ? 12 : -12;
			})
            .attr('text-anchor', function () {return that.width - d3.transform(d3.select(this.parentElement).attr("transform")).translate[0] > 50 ? 'start' : 'end';})
            .text(function (d, i) {
                return d3.format(',.2f')(dd[i][1]);
            });
	
		that.helpGroup.selectAll('rect')
			.attr('x', function (d, i) {
				return that.width - d3.transform(d3.select(this.parentElement).attr("transform")).translate[0] > 50 ? 10 :
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

		//var height = text.node().getBBox().height;
		var height = text.node().offsetHeight;
		
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

    d3lib.chart = chart;
})();