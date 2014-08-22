(function () {
    var myData=[];
    
    var getFile = function(file) {
        d3.json("http://wikisensing.org/WikiSensingServiceAPI/DCESensorDeployment2f7M76vkKdRlvm7vVWg/Node_" + (file + 1), function(error, json) {
            if (error) {
                return console.warn(error);
            }
            myData[file]=json;
            if (file==14) {
                var myArgs = {
                    container : currentContainer.timeViz,
                    xOffset : [0, 25, 50, 75, 100],
                    yOffset : [0, 50, 100],
                    speed : 500,
                    valueArrayAccessor : function (d) {
                        return d.sensorRecords;
                    },
                    valueAccessor : function (d) {
                        return d.sensorObject[10].value;
                    },
                    scalingPeriod : 1,
                    color : ["blue", "#27f600", "yellow", "orange", "red"],
                    data : myData
                }
                ;
                myTest = new d3lib.time2DVisualisation(myArgs);
                myTest.play();
            }
            else if(file < 14) {
                getFile(file + 1);
            }
        }
        );
    };
    
    getFile(0);
        
  	
  	/*
  	data: [
			{sensorRecord : [{date:"0",val:"10"},{date:"1",val:"9"},{date:"2",val:"8"}]},{sensorRecord : [{date:"0",val:"10"},{date:"1",val:"9"},{date:"2",val:"8"}]},{sensorRecord : [{date:"0",val:"10"},{date:"1",val:"9"},{date:"2",val:"8"}]},
			{sensorRecord : [{date:"0",val:"7"},{date:"1",val:"7"},{date:"2",val:"7"}]},{sensorRecord : [{date:"0",val:"10"},{date:"1",val:"9"},{date:"2",val:"8"}]},{sensorRecord : [{date:"0",val:"10"},{date:"1",val:"9"},{date:"2",val:"8"}]},
			{sensorRecord : [{date:"0",val:"5"},{date:"1",val:"5"},{date:"2",val:"5"}]},{sensorRecord : [{date:"0",val:"10"},{date:"1",val:"9"},{date:"2",val:"8"}]},{sensorRecord : [{date:"0",val:"10"},{date:"1",val:"9"},{date:"2",val:"8"}]}
		]
  	*/
})();