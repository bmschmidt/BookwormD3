//There should always be a query variable present: from that, it should be possible to derive anything else we'll ever need, and any changes can update it directly.
//This is the cardinal rule of the architecture here: absolutely any state must DRAW FROM and UPDATE the query variable if it pertains to any higher-level architecture
//about what's being displayed.
//Violating this rule, ever, will pretty much instantly make the code un-maintable. I promise.


//Really, the query should be factory so we could have multiple ones present at a time--but that would create all sorts of weird visualization cases we don't need actually to worry about.


dquery = {
    "method":"return_json",
    "words_collation":"Case_Sensitive",
    "database":"ol",
    "search_limits":{
        "lc0":{"$ne":""},
        "word":["glaube"]
    },
    "aesthetic":{"x":"lc0","y":"lc1","color":"WordCount"},
    "plotType":"heatmap"
}

dquery = {
    "method":"return_json",
    "words_collation":"Case_Sensitive",
    "database":"ol",
    "search_limits":{
        "lc0":{"$ne":""},
        "word":["gegen"]
    },
    "aesthetic":{"x":"WordCount","level1":"publish_country","level2":"publish_places","level3":"lc0"},
    "plotType":"sunburst"
}



var width=window.innerWidth,height=window.innerHeight*2

var svg = d3.select("#svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")

dataTypes = {};



/**
var h = window.innerHeight

var bottomLevel = svg.append("g").attr("id", "#bottomLevel")

var maplevel = svg.append("g").attr("id", "#maplevel")

var title = svg.append('g').attr('id','title').attr('transform','translate(' + w*.4+ ',' + 25  +')');


//Pull query from hash location iff supplied

// And for now I'm just having that query live in a text box. We can use the real Bookworm query entries instead, but no use reinventing that wheel here.

//Well, one re-invention: a word box at the top that automatically updates the text box, and vice-versa.



//    mapSelector = d3.select("#lastOptions").append('select').attr('id',"mapChoice").attr('class',"chartSpecific mapChart")
//    pointSelector = mapSelector.selectAll('option').data(mapOptions)

//    pointSelector.enter()
//      .append('option')
//    .attr('value',function(d){return d.value})
//  .text(function(d) {return(d.text)})

var options = $('<div />');
//executeButtons.appendTo($('body'));


nwords = d3.scale.sqrt().range([0,100]);
var sizescale = nwords
var colorscale = d3.scale.log().range(greenToRed);

//Have to keep the data the same for subsequent calls, but this will transform them
plotTransformers = {};


var legendData = [];

//var currentPlot=myPlot()
//currentPlot()
//d3.selectAll(".debugging").style('display','none')
**/


//pull location hash:

console.log(window.location.hash)
if(window.location.hash) {
    var hash = window.location.hash.substring(1);
    decoded = decodeURIComponent(hash)
    dquery =  JSON.parse(decoded)
    dquery=dquery
} else {
    dquery = dquery
}
var bookworm = Bookworm(dquery)


bookworm.updatePlot()
