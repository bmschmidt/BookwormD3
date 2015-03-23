

var width=window.innerWidth,height=window.innerHeight
var chartCompression = chartCompression || 0.8
console.log(width,height)

var svg = d3.select("#svg")
    .attr("width", width)
    .attr("height", height*chartCompression)
    .style("width", width)
    .style("height", height*chartCompression)



dataTypes = {};


// Set a query, either as a default 

var dquery
if(window.location.hash) {
    var hash = window.location.hash.substring(1);
    decoded = decodeURIComponent(hash)
    dquery =  JSON.parse(decoded)
    dquery=dquery
} else {
    dquery = BookwormClasses.guessAtQuery()
}

//update the plot on return key.
d3.select("body").on("keypress",function(e){
    if(d3.event.keyCode == 13){
        bookworm.updatePlot()
    }
});


//Some special methods to update bindings that will be deprecated.
d3.selectAll("[bindTo]")
    .on('change',function() {
        bookworm.updateQuery(d3.select(this))
    })
    .on('keyup',function() {
        bookworm.updateQuery(d3.select(this))
    })



//Initialize a Bookworm object with the query.
var bookworm = Bookworm(dquery)

//Actually run it, on the created svg element
bookworm(svg)

