function getRandomSubarray(arr, size) {
    var shuffled = arr.slice(0), i = arr.length, temp, index;
    while (i--) {
        index = Math.floor(i * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(0, size);
}

subarray = getRandomSubarray(allwords,44)

//There should always be a query variable present: from that, it should be possible to derive anything else we'll ever need, and any changes can update it directly.
//This is the cardinal rule of the architecture here: absolutely any state must DRAW FROM and UPDATE the query variable if it pertains to any higher-level architecture
//about what's being displayed.
//Violating this rule, ever, will pretty much instantly make the code un-maintable. I promise.


//Really, the query should be factory so we could have multiple ones present at a time--but that would create all sorts of weird visualization cases we don't need actually to worry about.


var bookworm = new Bookworm()

bookworm.query = {
    "method":"return_json",
    "words_collation":"Case_Sensitive",
    "database":"presidio",
    "search_limits":{
        "lc1":["PR"],
        "word": subarray
    },
        "compare_limits":{
            "lc1":["PS"],
            "word":subarray
        },
    "counttype":["WordCount","TotalWords"],
    "groups":["unigram"],
    "aesthetic":{"label":"unigram","x":"WordCount","y":"TotalWords"},
    "plotType":"bicloud"
}


bookworm.changePlotType = function() {
    console.log(this.query.plotType)
}

var points;



changeWords = function() {
    words = getRandomSubarray(allwords,44)
    bookworm.query.search_limits['word'] = bookworm.query.compare_limits['word'] = words
    bookworm.queryAligner.updateQuery()
    bookworm.updateData(bookworm.bicloud,append=true)
}
d3.selectAll("text")


//Graphical Elements
var w = window.innerWidth
var h = window.innerHeight

//Things for everywhere
var svg = d3.select("#svg")
    .attr('width',window.innerWidth)
    .attr('height',window.innerHeight*.9)

//These are the things to delete when a new chart is refreshed.
//They contain the various aspects of the actual plot

var bottomLevel = svg.append("g").attr("id", "#bottomLevel")
var maplevel = svg.append("g").attr("id", "#maplevel")
var paperdiv = svg
    .append("g")
    .attr("id","#paperdiv")


var title = svg.append('g').attr('id','title').attr('transform','translate(' + w*.4+ ',' + 25  +')');

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
    bookworm.query=query
} else {
    query = bookworm.query
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

//updateAxisOptionBoxes()


// And for now I'm just having that query live in a text box. We can use the real Bookworm query entries instead, but no use reinventing that wheel here.

var APIbox = d3.select('#APIbox')
    .property('value', JSON.stringify(query))
    .attr('style', 'width: 95%;')
    .on('keyup',function(){})


//Well, one re-invention: a word box at the top that automatically updates the text box, and vice-versa.

d3.selectAll("[bindTo]")
    .on('change',function() {
        console.log("change registered")
        bookworm.queryAligner.updateQuery(d3.select(this))
    })
    .on('keyup',function() {
        console.log("keyup registered")
        bookworm.queryAligner.updateQuery(d3.select(this))
    })

bookworm.queryAligner.updateQuery()

d3.select("body").append("button")
    .text('Redraw Plot')
    .on('click',function(){
        currentPlot = myPlot()
        currentPlot()
    })


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
    if(d3.event.keyCode == 13){
        plotting = myPlot();
        plotting()
    }
});


//I like this pallette--I think we usually need two tones to really discriminate,
//even though dataviz wisdom seems to say that's not kosher.

greenToRed = ["#D61818","#FFAE63","#FFFFBD","#B5E384"].reverse()
RdYlGn = ['rgb(26,152,80)','rgb(255,255,191)','rgb(215,48,39)']
RdYlGn = greenToRed
PuOr = ['rgb(84,39,136)','rgb(153,142,195)','rgb(216,218,235)','rgb(247,247,247)','rgb(254,224,182)','rgb(230,97,1)']
RdYlGn = ["#D61818","#FFAE63","#FFFFBD","#B5E384"].reverse()
RdYlGn = colorbrewer["RdYlGn"][5].slice(0,4).reverse()

//define some default scales
nwords = d3.scale.sqrt().range([0,100]);
var sizescale = nwords
var colorscale = d3.scale.log().range(greenToRed);

//Have to keep the data the same for subsequent calls, but this will transform them
plotTransformers = {};
dataTypes = {};

var legendData = [];

//var currentPlot=myPlot()
//currentPlot()
//d3.selectAll(".debugging").style('display','none')
