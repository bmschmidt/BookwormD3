//There should always be a query variable present: from that, it should be possible to derive anything else we'll ever need, and any changes can update it directly.
//This is the cardinal rule of the architecture here: absolutely any state must DRAW FROM and UPDATE the query variable if it pertains to any higher-level architecture
//about what's being displayed.
//Violating this rule, ever, will pretty much instantly make the code un-maintable. I promise.

var query = {};

var defaultQuery = {
    "method":"return_json",
    "words_collation":"Case_Sensitive",
    "database":"ChronAm",
    "search_limits":{
        "date_year":{"$lte":1922,"$gte":1850},
        "word":["Apache"]
    },
    "aesthetic":{'x':'lng','y':'lat',"size":"WordCount","color":"WordsPerMillion"},
    "plotType":"map"
};

if (window.location.host=="melville.seas.harvard.edu") {
    defaultQuery = {
        "method":"return_json",
        "words_collation":"Case_Sensitive",
        "groups":["year","classification"],
        "database":"presidio",
        "counttype":["WordCount","TotalWords","WordsPerMillion"],
        "search_limits":{
            "year":{"$lte":1922,"$gte":1850},
            "word":["chart"]
        },
        "aesthetic":{"x":"yearchunk","y":"classification","color":"WordsPerMillion"},
        "plotType":"heatMap"
    }
}

if (window.location.host=="localhost:8080") {
    console.log("yo, localhost!")
    defaultQuery = {
        "method":"return_json",
        "words_collation":"Case_Sensitive",
        "groups":["publication_date_year","publication_date_month_year"],
        "database":"halftimes",
        "counttype":["WordCount","TotalWords","WordsPerMillion"],
        "search_limits":{
            "word":["war"]
        },
        "plotType":"heatMap"
    }
}

var lastPlotted="None"

//Graphical Elements
var w = window.innerWidth
var h = window.innerHeight

//Things for everywhere
var svg = d3.select("#svg")
    .attr('width',window.innerWidth)
    .attr('height',window.innerHeight*.9)

var width;

//These are the things to delete when a new chart is refreshed.
//They contain the various aspects of the actual plot

var bottomLevel = svg.append("g").attr("id", "#bottomLevel")
var maplevel = svg.append("g").attr("id", "#maplevel")
var paperdiv = svg
    .append("g")
    .attr("id","#paperdiv")

//These datums (that's the plural of datum, you know) are there to 
//make the item draggable using the "drag" function.

paperdiv.datum({"x":0,"y":0})

//var legend = svg.append('g').attr('id','legend');
//var colorLegend = legend.append('g').attr('id','colorLegend').attr('transform','translate(' + w/25+ ','+h/7+')');

var title = svg.append('g').attr('id','title').attr('transform','translate(' + w*.4+ ',' + 25  +')');


// Things for the background map

var projection = {"mapname":"none"}
var stateItems;

// Variables for the grid charts
var testing, x,y;

// Prepare the paper points.
// These variables should be renamed for clarity: 'paper' refers to newspapers, for legacy reasons.
var paperdata = [];

var colorLegendPointer,
updatePointer,
sizeAxis,
titleText,
legendScale = d3.scale.linear()
;

var nameSubstitutions = {
    "WordsPerMillion":"Uses per Million Words",
    "WordCount":"# of matches",
    "TextPercent":"% of texts",
    "TotalWords":"Total # of words",
    "TextCount":"# of Texts",
    "TotalTexts":"Total # of Texts"
}

var quantitativeVariables = [
    {"variable":"WordsPerMillion","label":"Uses per Million Words"},
    {"variable": "WordCount","label":"# of matches"},
    {"variable":"TextPercent","label":"% of texts"},
    {"variable":"TotalWords","label":"Total # of words"},
    {"variable":"TextCount","label":"# of Texts"},
    {"variable":"TotalTexts","label":"Total # of Texts"},
    {"variable":"WordsRatio","label":"Ratio of group A to B"},
    {"variable":"SumWords","label":"Total in both sets"}
]

for (item in quantitativeVariables) {
    nameSubstitutions[item.variable] = item.label
}



//Pull query from hash location iff supplied
if(window.location.hash) {
    var hash = window.location.hash.substring(1);
    decoded = decodeURIComponent(hash)
    query =  JSON.parse(decoded)
} else {
    query = defaultQuery
}

if (query['scaleType']==undefined) {
    query['scaleType'] = "linear"
}


if (!('aesthetic' in query)) {
    query['aesthetic']= {
        "color":"WordsPerMillion",
        "size":"WordCount",
        "filterByTop":"WordCount"
    }
}

updateAxisOptionBoxes()


// And for now I'm just having that query live in a text box. We can use the real Bookworm query entries instead, but no use reinventing that wheel here.

var APIbox = d3.select('#APIbox')
    .property('value', JSON.stringify(query))
    .attr('style', 'width: 95%;')
    .on('keyup',function(){})


//Well, one re-invention: a word box at the top that automatically updates the text box, and vice-versa.

d3.selectAll("[bindTo]")
    .on('change',function() {
        console.log("change registered")
        queryAligner.updateQuery(d3.select(this))
    })
    .on('keyup',function() {
        console.log("keyup registered")
        queryAligner.updateQuery(d3.select(this))
    })

queryAligner.updateQuery()

d3.select("body").append("button")
    .text('Redraw Plot')
    .on('click',function(){
        currentPlot = myPlot()
        currentPlot()
    })


d3.select("#AdvancedOptions")
//Make advanced Options into a toggler.
    .on("click",function() {
        display = d3.select(".debugging")
        display = (display.style("display"))

        if (display=="none") {

            d3.selectAll(".debugging")
                .style("display","inline")
            d3
                .select(this)
                .text("Hide Advanced")
        }
        if (display=="inline") {
            d3.selectAll(".debugging").style("display","none")
            d3.select(this).text("Show Advanced")
        }
    })

d3.select("#ExportData")
//Make advanced Options into a toggler.
    .on("click",function() {
        function post_to_url(path, params, method) {
            //Function From http://stackoverflow.com/questions/133925/javascript-post-request-like-a-form-submit
            method = method || "post"; // Set method to post by default, if not specified.

            // The rest of this code assumes you are not using a library.
            // It can be made less wordy if you use one.
            var form = document.createElement("form");
            form.setAttribute("method", method);
            form.setAttribute("action", path);

            for(var key in params) {
                if(params.hasOwnProperty(key)) {
                    var hiddenField = document.createElement("input");
                    hiddenField.setAttribute("type", "hidden");
                    hiddenField.setAttribute("name", key);
                    hiddenField.setAttribute("value", params[key]);

                    form.appendChild(hiddenField);
                }
            }
            console.log(params)
            document.body.appendChild(form);
            form.submit();
        }

        localquery = JSON.parse(JSON.stringify(query))
        localquery['method'] = "return_tsv"
        post_to_url("/cgi-bin/dbbindings.py",   {"queryTerms":JSON.stringify(localquery)})
    })



var lastOptions = $('<div />');

//The types of maps are just coded in.
mapOptions = [
    {"text":'USA','value':"USA"},
    {'text':'World','value':"World"},
    {'text':'Europe','value':"Europe"},
    {'text':'Asia','value':"Asia"}
]

mapSelector = d3.select("#lastOptions").append('select').attr('id',"mapChoice").attr('class',"chartSpecific mapChart")
pointSelector = mapSelector.selectAll('option').data(mapOptions)

pointSelector.enter()
    .append('option')
    .attr('value',function(d){return d.value})
    .text(function(d) {return(d.text)})

var options = $('<div />');

//executeButtons.appendTo($('body'));

d3.select("body").on("keypress",function(e){
    console.log(e)
    if(d3.event.keyCode == 13){
        plotting = myPlot();
        plotting()
    }
});

//$('body').keypress(function(e){
//    if(e.which == 13){
//        plotting = myPlot();
//        plotting()
//    }
//});




//I like this pallette--I think we usually need two tones to really discriminate,
//even though dataviz wisdom seems to say that's not kosher.

greenToRed = ["#D61818","#FFAE63","#FFFFBD","#B5E384"].reverse()
RdYlGn = ['rgb(26,152,80)','rgb(255,255,191)','rgb(215,48,39)']
RdYlGn = greenToRed
PuOr = ['rgb(84,39,136)','rgb(153,142,195)','rgb(216,218,235)','rgb(247,247,247)','rgb(254,224,182)','rgb(230,97,1)']
RdYlGn = ["#D61818","#FFAE63","#FFFFBD","#B5E384"].reverse()
RdYlGn = colorbrewer["RdYlGn"][5].slice(0,4).reverse()

//RdYlGn = greenToRed

//define some default scales
nwords = d3.scale.sqrt().range([0,100]);
var sizescale = nwords
var colorscale = d3.scale.log().range(greenToRed);

//Have to keep the data the same for subsequent calls, but this will transform them
plotTransformers = {};
dataTypes = {};

var legendData = [];

var currentPlot=myPlot()
currentPlot()
d3.selectAll(".debugging").style('display','none')
