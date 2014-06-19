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
