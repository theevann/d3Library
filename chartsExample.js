(function(){
    var current = 75;
    var myData = [
                {
                    data : d3.range(0,60,2).map(function(d){current += (Math.random()*20-10); return [d, current];}),
                    sort : true,
                    interpolate : "monotone",
                    parseTime : true,
                    fill : true,
                },
                {
                    data : d3.range(3,60,5).map(function(d){current += (Math.random()*10-5); return [d, current];}),
                    sort : true,
                    interpolate : "monotone",
                    parseTime : true,
                },
                {
                    data : d3.range(0,60,1).map(function(d){current += (Math.random()*26-13); return [d, current];}),
                    sort : true,
                    interpolate : "monotone",
                    parseTime : true,
                    fill : false
                }
                ];
    
    var myArgs = {
        container: currentContainer.charts
        ,series : myData
        ,grid : true
        ,fill : false
        ,guideLine : true
        ,margin : [5,5,25,35]
        ,yExtent : false//[50,250]
    };
    
    var myChart = new d3lib.chart(myArgs);
    myChart.createVisualization();
})();