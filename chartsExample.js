(function(){
    var current = 70;
    var myData = [
                {
                    data : d3.range(0,60,2).map(function(d){current += (Math.random()*20 - 10); return [d, current];}),
                    sort : true,
                    interpolate : "monotone",
                    fill : true,
                },
                {
                    data : d3.range(0,60,0.5).map(function(d){current += (Math.random()*6 - 3); return [d, current];}),
                    sort : true,
                    interpolate : "monotone",
                },
                {
                    data : d3.range(0,60,1).map(function(d){current += (Math.random()*26 - 13); return [d, current];}),
                    sort : true,
                    interpolate : "monotone",
                    fill : false
                }
                ];
		
    var myArgs = {
        container: currentContainer.charts
        ,series : myData
        ,grid : {show : false, color : "grey"}
        ,fill : false
        ,guideLine : true
        ,highlight : true
        ,showLegend : true
        ,margin : [5,35,25,35]
		,tickSize : [6,6]
        //,margin : [0.01,0.01,0.05,0.05, true]
		,autoParseTime : false
        ,zoomable : true
		,name : "My graph"
		,nameInBackground : {show : true}
        ,y : {left : {extent : false, label : "Temperature", textTickOffset : [-7,0]}, tickSize : [0,0]}
		,x : {extent : false}
    };
    
    var myChart = new d3lib.chart(myArgs);
    myChart.createVisualization();
	
})();