//(function(){
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
        ,guideLine : false
        ,margin : [5,5,25,35]
		,tickSize : [6,6]
        //,margin : [0.01,0.01,0.05,0.05, true]
		,parseTime : false
        ,zoomable : true
        ,y : {extent : false, textTickOffset : [-7,0], tickSize : [0,0]}
		,x : {extent : false}
    };
    
    var myChart = new d3lib.chart(myArgs);
    myChart.createVisualization();
	
// 	})();