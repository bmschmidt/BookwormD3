var timeworm = {};

var json = {"database":"moments","plotType":"slopegraph","method":"return_json","search_limits":{
    "topic":[6],"MovieYear":{"$lte":1990,"$ne":0}
    //,   "primary_country":["USA"]
},
            "compare_limits":{"topic":[6],
                              "MovieYear":{"$gt":1990}
                              //,                              "primary_country":{"$ne":"USA"}
                             },
            "aesthetic":{"left":"WordCount","right":"TotalWords","label":"unigram"},"counttype":["WordCount","TotalWords"],"groups":["unigram"]}

var dbookworm = Bookworm(json)

dbookworm(d3.select("#svg"))

var a = Bookworm(JSON.parse(JSON.stringify(dbookworm.query)))

a.query.search_limits['topic']=undefined
a.query.compare_limits['topic']=undefined
a.query['counttype'] = "SumWords"
a.query.aesthetic={"size":"SumWords","key":"topic","label":"topic_label"}
a.alignAesthetic()

a.updateData(callback = function() {
    setSparkWatcher()

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
        dbookworm.updatePlot(callback = setSparkWatcher)
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


var globalSparkBookworm = Bookworm(dbookworm.query)

function timeSpark(query) {
    console.log("watching")
    var x = d3.event.x
    var y = d3.event.y

    var a = d3.selectAll("svg.sparkline").data([1])

    a.enter().append("svg").attr("width",100).attr("height",35).attr("class","sparkline").style("position","absolute")

    console.log(query)

    globalSparkBookworm.query = query;
    globalSparkBookworm(a)

    return a

}

function setSparkWatcher() {
    console.log("setting sparkline observer")
    d3.select("#svg").selectAll("text")
        .on("mouseover",function(d) {
	    console.log(d3.select(this).attr("x"))
            d3.selectAll("svg.sparkline")
                .style("top",d3.event.pageY + "px")
                .style("left",d3.event.pageX + "px")
		.style("background","none")
	    .selectAll("element").remove()
            var quer = {"database": "movies","method":"return_json",
                        "plotType": "sparkline",
                        "search_limits": {"MovieYear":{"$lte":2013,"$gte":1945},
                                          "word": [d.unigram]
                                         },
                        "aesthetic": {
                            "x": "MovieYear",
                            "y": "WordsPerMillion"
                        } }
            var svg = timeSpark(quer)
//        }).on("mouseover",function() {

        })
}

buildTimeChart()

setTimeout(setSparkWatcher,1000)
