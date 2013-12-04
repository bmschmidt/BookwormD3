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

console.log(window.location.hash)
if(window.location.hash) {
    var hash = window.location.hash.substring(1);
    console.log(hash)
    decoded = decodeURIComponent(hash)
    dquery =  JSON.parse(decoded)
    dquery=dquery
} else {
    dquery = dquery
}

var bookworm = Bookworm(dquery)
bookworm.updatePlot()
