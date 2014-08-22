﻿(function () {
    
        var matrix = [
          [0,  5871, 8916, 2868, 2150],
          [ 1951, 0, 2060, 6171, 6945],
          [ 8010, 16145, 0, 8045, 6658],
          [ 1013,   990,  940, 0, 8451],
          [ 10013, 9290,  540, 4907, 0]
        ];
        
        var myArgs = {
            container : currentContainer.chord,
            data : matrix,
            names : ["Helena","Roger","Evann","David","Caroline"],
            margin : [20, 20, 50, 20],
            /*colors : ["black","red","orange","blue","#EEE"],*/
            disableInteraction : false
        };
        
        var myChord = new d3lib.chord(myArgs);
        myChord.createVisualization();
        
        /*
        // Returns an array of tick angles and labels, given a group.
        function groupTicks(d) {
          var k = (d.endAngle - d.startAngle) / d.value;
          return d3.range(0, d.value, 1000).map(function(v, i) {
            return {
              angle: v * k + d.startAngle,
              label: i % 5 ? null : v / 1000 + "k"
            };
          });
        }
                
        var ticks = svg.append("g").selectAll("g")
            .data(chord.groups)
          .enter().append("g").selectAll("g")
            .data(groupTicks)
          .enter().append("g")
            .attr("transform", function(d) {
              return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
                  + "translate(" + outerRadius + ",0)";
            });

        ticks.append("line")
            .attr("x1", 1)
            .attr("y1", 0)
            .attr("x2", 5)
            .attr("y2", 0)
            .style("stroke", "#000");

        ticks.append("text")
            .attr("x", 8)
            .attr("dy", ".35em")
            .attr("transform", function(d) { return d.angle > Math.PI ? "rotate(180)translate(-16)" : null; })
            .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
            .text(function(d) { return d.label; });
        */   
    
})();