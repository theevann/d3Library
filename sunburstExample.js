(function () {
    var myData = 
    {
     "name": "food",
     "children": [
      {
       "name": "To eat",
       "children": [
        {
         "name": "Vegetables",
         "children": [
          {"name": "Potatoes", "size": 3938},
          {"name": "Carrots", "size": 3812},
          {"name": "Pees", "size": 6714},
          {"name": "Salad", "size": 743}
         ]
        },
        {
         "name": "Meat",
         "children": [
          {"name": "Beef", "size": 3534},
          {"name": "Lamb", "size": 5731},
          {"name": "Fish", "size": 7840},
          {"name": "Sausage", "size": 5914},
          {"name": "Sheep", "size": 3416}
         ]
        },
        {
         "name": "Fruit",
         "children": [
          {"name": "Banane", "size": 7074},
          {"name": "Apple", "size": 7074},
          {"name": "Orange", "size": 7074}
         ]
        }
       ]
      },
      {
       "name": "To drink",
       "children": [
        {
         "name": "Without Alcohol",
         "children": [
            {
              "name": "Without gaz",
              "children": [
                  {"name": "Water", "size": 1983},
                  {"name": "Juice", "size": 2047},
                  {"name": "Sirop", "size": 1375},
                  {"name": "Soup", "size": 8746}
             ]
            },
            {
              "name": "With gaz",
              "children": [
                  {"name": "Coca", "size": 1983},
                  {"name": "Fanta", "size": 2047},
                  {"name": "Sprite", "size": 1375},
                  {"name": "Sparkling water", "size": 8746}
             ]
            }]
        },
        {
         "name": "With Alcohol",
         "children": [
          {"name": "Wine", "size": 1983},
          {"name": "Beer", "size": 2047},
          {"name": "Vodka", "size": 1375},
          {"name": "Rhum", "size": 8746},
          {"name": "Pastis", "size": 2202},
          {"name": "Whisky", "size": 1382},
          {"name": "Wow - So many others", "size": 1629}
         ]
        }
       ]
      }
     ]
    };
    
    var myArgs = {
        container: currentContainer.sunburst,
        data : myData,
        desactiveBreadcrumb : false,
        notUseSize : true,
        bilevel : false,
        hidePercentage : false,
        explanationText: "from the FOOD we have"
    };

    var mySunburst = new d3lib.sunburst(myArgs);
    mySunburst.createVisualization();
})();
