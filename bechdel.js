var timeworm = {};

var json = {
    "database":"movies",
    "plotType":"pointchart",
    "method":"return_json",
    "search_limits":{
	"medium":["movie"],
        "word":["argument"],
        "primary_genre__id":{"$lte":8,"$ne":4}
    },
    "aesthetic":{
        "x":"WordsPerMillion",
        "y":"primary_genre",
        "color":"bechdelPass"
    }
}


var dbookworm = Bookworm(json)


d3.selectAll(".btn").on("click",function() {
    console.log("removing")
    d3.select("#svg").selectAll("element").transition().duration(100).style("opacity",0).remove()
    setTimeout(updateChart,30)
})

function updateChart() {
    limits = dbookworm.query.search_limits
    var word = d3.select("#word").node().value
    word = word.replace(", ",",").split(",")
    limits.word = word

    negType = d3.select("#whichTest").selectAll(".btn.active").attr("id")

    console.log(negType)

    if (negType=="justBechdel") {
        dbookworm.query.aesthetic['y'] = 'bechdelScore'
        dbookworm.query.aesthetic['color'] = 'bechdelScore'
	dbookworm.query.plotType = "barchart"
	desparatelyFixBox()
    } else    if (negType=="binary") {
        dbookworm.query.aesthetic['y'] = 'primary_genre'
        dbookworm.query.aesthetic['color'] = 'bechdelPass'
	dbookworm.query.plotType = "pointchart"
	desparatelyFixBox()
    } else if (negType=="multi") {
        dbookworm.query.aesthetic['y'] = 'primary_genre'
        dbookworm.query.aesthetic['color'] = 'bechdelScore'
	dbookworm.query.plotType = "pointchart"
	desparatelyFixBox()
    } 
    else if (negType=="none") {
        dbookworm.query.aesthetic['y'] = 'primary_genre'
        dbookworm.query.aesthetic['color'] = 'primary_genre'
	dbookworm.query.plotType = "barchart"
	desparatelyFixBox()
    } else {console.log("yikes, nothing checked",negType)}
    var viewport = d3.select("#svg")
    dbookworm(viewport)

    function fixBox() {
	var axis = d3.select(".color.scale.axis"); var w = axis.node().getBBox()['width']; axis.transition().attr("transform","translate(" + (d3.select("#svg").attr("width") - w) + "," + 20 + ")")
	if (dbookworm.query.plotType != "pointchart") {d3.selectAll(".color.scale.axis").transition().style("opacity",0).remove()}
    }

    function desparatelyFixBox () {
	[10,100,600,1000,3000,6000].forEach(function(n) {	setTimeout(fixBox,n)})
    }


}

updateChart()

d3.select("#word").on("change",updateChart)
