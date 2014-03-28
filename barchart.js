//There should always be a query variable present: from that, it should be possible to derive anything else we'll ever need, and any changes can update it directly.
//This is the cardinal rule of the architecture here: absolutely any state must DRAW FROM and UPDATE the query variable if it pertains to any higher-level architecture
//about what's being displayed.
//Violating this rule, ever, will pretty much instantly make the code un-maintable. I promise.


//Really, the query should be factory so we could have multiple ones present at a time--but that would create all sorts of weird visualization cases we don't need actually to worry about.


query = {
    "method":"return_json",
    "words_collation":"Case_Sensitive",
    "database":"rateMyProfessors",
    "search_limits":{
        "word":["I learned"]
    },
    "aesthetic":{"x":"WordsPerMillion","y":"department"},

    "plotType":"barchart"
}

query = BookwormClasses.guessAtQuery()
query.plotType="barchart"

var width=window.innerWidth,height=window.innerHeight

var svg = d3.select("#svg")
    .attr("width", width)
    .attr("height", height*.8)
    .append("g")

dataTypes = {};

d3.select("body").on("keypress",function(e){
    if(d3.event.keyCode == 13){
        bookworm.updatePlot()
    }
});



d3.selectAll("[bindTo]")
    .on('change',function() {
        console.log("change registered")
        bookworm.updateQuery(d3.select(this))
    })
    .on('keyup',function() {
        console.log("keyup registered")
        bookworm.updateQuery(d3.select(this))
    })

var bookworm = Bookworm(query)

bookworm.updateQuery()
bookworm.alignAesthetic()
bookworm.updatePlot()
