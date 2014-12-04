var timeworm = {};

var json = {
    "database":"RMP",
    "plotType":"pointchart",
    "method":"return_json",
    "search_limits":{
	"word":["funny"],
	"department__id":{"$lte":25}
    },
    "aesthetic":{
	"x":"WordsPerMillion",
	"y":"department",
	"color":"gender"
    },

    "counttype":["WordCount","TotalWords"],
    "groups":["unigram"]
}


var dbookworm = Bookworm(json)


d3.selectAll(".btn").on("click",function() {setTimeout(updateChart,30)})

function updateChart() {
    limits = dbookworm.query.search_limits;
    var word = d3.select("#word").node().value
    word = word.replace(", ",",").split(",")
    limits.word = word
    
    negType = d3.select("#negativity").selectAll(".btn.active").attr("id")


    console.log(negType)
    
    if (negType=="all") {
	limits.rHelpful=undefined
	limits.rClarity=undefined
    } else if (negType=="positive") {
	limits.rHelpful=[4,5]
	limits.rClarity=[4,5]
    } else if (negType=="negative") {
	limits.rHelpful=[1,2]
	limits.rClarity=[1,2]
    } else {console.log("yikes, nothing checked",negType)}
	
    
    var viewport = d3.select("#svg")
    dbookworm(viewport)
}

updateChart()

d3.select("#word").on("change",updateChart)

var a = Bookworm(JSON.parse(JSON.stringify(dbookworm.query)))

a.query.search_limits['topic']=undefined
a.query['counttype'] = "SumWords"
a.query.aesthetic={"size":"SumWords","key":"topic","label":"topic_label"}
a.alignAesthetic()

a.updateData(callback = function() {

    var Topics = a.data.sort(function(a,b) {return a.SumWords-b.SumWords})

    var topicSelector = d3.select("#selectors").append("div").attr("class","dropdown")

    var button = topicSelector.append("button").attr("class","btn btn-default dropdown-toggle").attr("type","button").attr("id","dd1").attr("data-toggle","dropdown").text("Look at a Different Topic")

    button.append("span").attr("class","caret")

    var menu = topicSelector.append("ul").attr("class","dropdown-menu").attr("role","menu").attr("aria-labelledby","dd1")

    var selectors = menu.selectAll("li.presentation").data(Topics)

    selectors.enter().append("li").attr("role","presentation").append("span").attr("tabindex","-1").attr("role","menuitem").text(function(d) {return d.topic_label})

    selectors.on("click",function(d) {
        dbookworm.query.search_limits.topic[0] = d.topic
        dbookworm.query.compare_limits.topic[0] = d.topic
        button.text(d.topic_label)
        dbookworm.updatePlot()
        buildTimeChart()
    })
})

function buildTimeChart() {
    d3.select("#timechart").attr("width",$("#timechart").parent().width()).attr("height",240)
    var newquery = JSON.parse(JSON.stringify(dbookworm.query))
    newquery.aesthetic = {"x":"MovieYear","y":"WordsPerMillion"}
    newquery.search_limits = {"*topic":newquery.search_limits.topic,"MovieYear":{"$gt":1930}}
    newquery.compare_limits = undefined
    newquery.plotType="linechart"
    timeworm = Bookworm(newquery)
    timeworm(d3.select("#timechart"))
}

//buildTimeChart()
