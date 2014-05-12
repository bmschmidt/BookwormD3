//There should always be a query variable present: from that, it should be possible to derive anything else we'll ever need, and any changes can update it directly.
//This is the cardinal rule of the architecture here: absolutely any state must DRAW FROM and UPDATE the query variable if it pertains to any higher-level architecture
//about what's being displayed.
//Violating this rule, ever, will pretty much instantly make the code un-maintable. I promise.


dquery = BookwormClasses.guessAtQuery()

var width=window.innerWidth,height=window.innerHeight

var svg = d3.select("#svg")
    .attr("width", width)
    .attr("height", height*.8)
    .append("g")

dataTypes = {};


if(window.location.hash) {
    var hash = window.location.hash.substring(1);
    decoded = decodeURIComponent(hash)
    dquery =  JSON.parse(decoded)
    dquery=dquery
} else {
    dquery = dquery
}


d3.select("body").on("keypress",function(e){
    if(d3.event.keyCode == 13){
        bookworm.updatePlot()
    }
});



d3.selectAll("[bindTo]")
    .on('change',function() {
        bookworm.updateQuery(d3.select(this))
    })
    .on('keyup',function() {
        bookworm.updateQuery(d3.select(this))
    })


var bookworm = Bookworm(dquery)
var query = bookworm.query
bookworm.updateQuery()
bookworm.alignAesthetic()
bookworm.updatePlot()
