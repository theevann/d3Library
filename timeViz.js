/**
 * @author Evann Courdier
 */

/** time2DVisualisation.js
 * CREATED ON 31/07/2014
 * To be used to create graphical time visualisation interpolating data from point creating a rectangle
 */
 
(function(){
	var formatValue = d3.format(",.2f");
	var formatDate = function(d) { return formatValue(d) ; };
	var taillePas = 5; // height of the gradient line => the bigger it is, the less precise it will be ((has to be integer > 0)			
	
	/* param: 
	* Object{
	*	div,
	*	xOffset,
	*	yOffset,
	*	data,
	*	dataName,
	*	scalingPeriod,
	*	speed, (ms per frame)
	* 	step,
	*	colorScale,
	*	window = [startFrom,endAt]
	* }
	* 
	* 	data[
	* 		[{date,value},{date,value},...],
	*		[{date,value},{date,value},...],
	* 		...
	*		]
	*/
	
	time2DVisualisation = function (args){
		
		this.container = d3.select(args.div);
		this.xOffset = args.xOffset;
		this.yOffset = args.yOffset;
		this.data = args.data;
		this.dataName = args.dataName || "";
		this.scalingPeriod = args.scalingPeriod ||  0;
		this.speed = args.speed ||  1000;
		this.colorScale = args.color || ["blue","red"];
		this.step = args.step || 1;
		
		this.width = parseFloat(this.container.style("width"))*0.95,
		this.height = parseFloat(this.container.style("height"))*0.99;
		this.dimension = {x : parseInt(0.9*this.width), y : parseInt(0.95*this.height)};
		
		this.dataStart = 0;
		this.dataEnd = this.data[0].length;
		this.repStart = (args.window && args.window[0]) || 0;
		this.repEnd = (args.window && args.window[1]) || this.data[0].length;
		
		this.numRepresentation = 0;
		this.frame = this.repStart;
		this.active = false;
		
		
		//Remove and create new SVG
		this.container.select("svg").remove();
		this.svg = this.container.append("svg")
				.attr("width", this.width)
				.attr("height", this.height);
	};
	
	
	time2DVisualisation.prototype.play = function(){
		this.createTimeRepresentation(this.frame,this.repEnd,this.step,this.speed);
	};
	
	time2DVisualisation.prototype.pause = function(){
		this.active = false;
	};
	
	time2DVisualisation.prototype.reset = function(){
		this.active = false;
		this.frame = this.repStart;
	};
	
	time2DVisualisation.prototype.getState = function(){
		return this.active;
	};
	
	time2DVisualisation.prototype.setSpeed = function(speed){
		this.speed = parseInt(speed);
		if(this.active)
			createTimeRepresentation(this.frame,this.repEnd,this.step,this.speed);
	};
	
	time2DVisualisation.prototype.setStep = function(step){
		this.step = parseInt(step);
		if(this.active)
			createTimeRepresentation(this.frame,this.repEnd,this.step,this.speed);
	};
	
	//Find extent over specific period of time around a given time
	
	time2DVisualisation.prototype.findExtent = function(frameTime){
		var extentTime = [this.dataStart, this.dataEnd];
		var extentValue = new Array();
		
		if(this.dataEnd - this.dataStart <= this.scalingPeriod){
			extentValue[0] = d3.min(this.data, function(c) { return d3.min(c, function(d) { return d.value; }); });
			extentValue[1] = d3.max(this.data, function(c) { return d3.max(c, function(d) { return d.value; }); });
			return extentValue;
		}
		else if((frameTime - this.dataStart) < parseInt(this.scalingPeriod/2)){
			extentTime[1] = this.dataStart + this.scalingPeriod;
		}
		else if((this.dataEnd - frameTime) < parseInt(this.scalingPeriod/2)){
			extentTime[0] = this.dataEnd - this.scalingPeriod;
		}
		else{
			 extentTime[0] = frameTime-parseInt(this.scalingPeriod/2);
			 extentTime[1] = frameTime+parseInt(this.scalingPeriod/2);
		}
		
		extentValue[0] = d3.min(this.data, function(d) {
			var min = d[0].value;
			for(var j = extentTime[0]+1 ; j < extentTime[1] ; j++){
				min = (d[j].value < min)? d[j].value : min;
			}
			return min;
		});
		
		extentValue[1] = d3.max(this.data, function(d) {
			var max = d[extentTime[0]].value;
			for(var j = extentTime[0]+1 ; j < extentTime[1]; j++){
				max = (d[j].value > max)? d[j].value : max;
			}
			return max;
		});
		
		return extentValue;	
	};
	
	
	//Function creating scale and axis
	
	time2DVisualisation.prototype.initColorAndScale = function(){
		
		var extent = new Array();
		
		//Find the extent of values for the scale depending on the chosen scaling period
		if(this.scalingPeriod == 0){ //Case if scaling period = whole time
			extent[0] = d3.min(this.data, function(c) { return d3.min(c, function(d) { return d.value; }); });
			extent[1] = d3.max(this.data, function(c) { return d3.max(c, function(d) { return d.value; }); });
		}
		else if(this.scalingPeriod == 1){ //Case if scaling period = one frame
			extent[0] = d3.min(this.data, function(d) { return d[this.frame].value; });
			extent[1] = d3.max(this.data, function(d) { return d[this.frame].value; });
		}
		else
			extent = this.findExtent(this.frame);
		
		//If nothing has changed and it's not the beggining, we do not redraw
		if(this.min == extent[0] && this.max == extent[1] && this.frame != this.repStart)
			return;
		
		//Define range and color range
		this.min = parseFloat(extent[0]);
		this.max = parseFloat(extent[1]);
		var domainColor = new Array();
		var crl1 = this.colorScale.length;
		for(var j = 0 ; j < crl1 ; j++){
			domainColor[j] = parseInt(this.min + j*(this.max-this.min)/(crl1-1));
		}
		
		this.color = d3.scale.linear()
			.domain(domainColor)
			.range(this.colorScale);
				
		//Remove gradient and scale if existing
		
		this.container.select("#scale-gradient").remove();
		this.container.select("#scale").remove();
		
		// Draw Scale
		
		var dataGradient = new Array();
		var crl2 = this.color.range().length;
		for(var j = 0 ; j < crl2 ; j++){
			dataGradient[j] = {offset: parseInt(j*100/(crl2-1)) + "%", color: this.color.range()[j]};
		}
		
		this.svg.append("linearGradient")                
			.attr("id", "scale-gradient")            
			.attr("x1", "0%").attr("y1", "100%")         
			.attr("x2", "0%").attr("y2", "0%")
			.selectAll("stop")
			.data(dataGradient)      
			.enter().append("stop")         
			.attr("offset", function(d) { return d.offset; })   
			.attr("stop-color", function(d) { return d.color; });
		
		var heightScale = parseInt(this.dimension.y);
		
		var scaleAxis = d3.svg.axis()
			.ticks(5)
			.scale(d3.scale.linear().domain([this.min,this.max]).range([heightScale,0]))
			.orient("left");
		
		var scale = this.svg.append("g")
		  .attr("id", "scale")
		  .attr("transform", "translate(" + parseInt(10+0.95*this.width) + ",10)")
		  .call(scaleAxis);
		
		scale.append("rect")
			.attr("width", parseInt(0.05*this.width))
			.attr("height", heightScale)
			.attr("fill", "url(#scale-gradient)");  
		
		scale.append("text")
			.attr("transform", "rotate(0)")
			.attr("y", -10)
			.attr("dy", ".71em")
			.style("text-anchor", "start")
			.style("text-align","center")
			.text(this.name);
	};
	
	//Function for creating a color map at the time index given (between 0 and max)
	
	time2DVisualisation.prototype.createRepresentation = function(time){
		
		//Redraw Scale depending on the scaling period
		this.initColorAndScale();
		
		this.container.selectAll(".group").remove();	
		var gr = this.svg.append("g").attr("index",time).attr("class","group");
		
		var vInterpolator = new Array;
		var dataUsed = new Array();
		
		for(var j = 0 ; j < this.xOffset.length*(this.yOffset.length-1); j++){
			var row = parseInt(j/this.xOffset.length);
			var offset = j%this.xOffset.length;
			dataUsed[0] = this.data[offset+this.xOffset.length*row][time].value;
			dataUsed[1] = this.data[offset+this.xOffset.length*(row+1)][time].value;
			vInterpolator[j] = d3.interpolate(dataUsed[0],dataUsed[1]);
		}
		
		var minT = formatValue(d3.min(this.data, function(c) { return c[time].value; }));
		var maxT = formatValue(d3.max(this.data, function(c) { return c[time].value; }));
		d3.select("#date").text(this.data[0][time].date + " / Min : " + minT + ", Max : " + maxT);
		
		var c = new Array();
		var v = new Array();
		var k, row = 0;
		
		for(var i = 0 ; i < this.dimension.y ; i+=taillePas){
			for(var l = 0 ; l < this.yOffset.length-1 ; l++){
				row = (i >= (this.yOffset[l]/100)*this.dimension.y && i < (this.yOffset[l+1]/100)*this.dimension.y)? l : row;
			}
			
			for(var j = 0 ; j < this.xOffset.length ; j++){
				k = (i-(this.yOffset[row]/100)*this.dimension.y)/((this.yOffset[row+1]-this.yOffset[row])/100*this.dimension.y);
				v[j] = parseFloat(vInterpolator[j+row*this.xOffset.length](k));
				c[j] = this.color(v[j]);
			}
			
			var dataGradient = new Array();
			var clr = this.xOffset.length;
			for(var j = 0 ; j < clr ; j++){
				dataGradient[j] = {offset: parseInt(this.xOffset[j]) + "%", color: c[j]};
			}
			
			gr.append("linearGradient")                
				.attr("id", "area-gradient" + i)            
				.attr("x1", "0%").attr("y1", "0%")         
				.attr("x2", "100%").attr("y2", "0%")
				.selectAll("stop")
				.data(dataGradient)      
				.enter().append("stop")         
				.attr("offset", function(d) { return d.offset; })   
				.attr("stop-color", function(d) { return d.color; });
			
			gr.append("rect")
				.attr("x", 10)
				.attr("y", 10+i)
				.attr("width", this.dimension.x)
				.attr("height",taillePas)
				.attr("fill", "url(#area-gradient" + i +")");
				
		}
		
		//Draw cross representing the nodes
		
		for(j = 0 ; j < this.yOffset.length*this.xOffset.length ; j++)
		{
			var row = parseInt(j/this.xOffset.length);
			var offset = j%this.xOffset.length;
			
			gr.append("line")
					.attr("x1",10+(this.dimension.x)*this.xOffset[offset]/100+5)
					.attr("y1",10+(this.dimension.y)*(this.yOffset[row]/100))
					.attr("x2",10+(this.dimension.x)*this.xOffset[offset]/100-5)
					.attr("y2",10+(this.dimension.y)*(this.yOffset[row]/100))
					.attr("stroke","black")
					.attr("stroke-width","2px");
					
			gr.append("line")
					.attr("x1",10+(this.dimension.x)*this.xOffset[offset]/100)
					.attr("y1",10+(this.dimension.y)*(this.yOffset[row]/100)-5)
					.attr("x2",10+(this.dimension.x)*this.xOffset[offset]/100)
					.attr("y2",10+(this.dimension.y)*(this.yOffset[row]/100)+5)
					.attr("stroke","black")
					.attr("stroke-width","2px");
		}
		
	};
	
	// Auxiliary function to stop time representation
	
	time2DVisualisation.prototype.triggeredByTimer = function(time, num, end){
		if(this.numRepresentation == num && this.active == true){
			this.frame = time;
			this.createRepresentation(time);
		}
		if(end-1 == time){
			this.active = false;
		}
	};
	
	//Function to create an Animation, n.b.: here a closure is needed to keep the value of i
	
	time2DVisualisation.prototype.createTimeRepresentation = function(start,end, frameStep, timeStep){
		this.numRepresentation++;
		this.active = true;
		var that = this;
		
		for(var i = start ; i < end ; i+=frameStep)
		{
			setTimeout(
					(function(f,g,h){
						return function(){ that.triggeredByTimer(f,g,h);};
					})(i,this.numRepresentation,end)
					,timeStep*(i-start)/frameStep);	
		}
	};
})();
