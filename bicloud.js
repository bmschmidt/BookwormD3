
var bookworm = new Bookworm({
        "method":"return_json",
        "words_collation":"Case_Sensitive",
        "database":"presidio",
        "search_limits":{
            "lc0":["G"],
            "word": ["whale"]
        },
        "compare_limits":{
            "lc1":["PS"],
            "word": ["whale"]
        },
        "counttype":["WordCount","TotalWords"],
        "groups":["unigram"],
        "aesthetic":{"label":"unigram","x":"WordCount","y":"TotalWords"},
        "plotType":"bicloud"
    })


bookworm.updatePlot();

d3.json("/beta/moby-dick/words.json",function(allwords) {
    var nn=20;
    var ii=1;
    words = allwords.slice(ii,ii+nn)

    bookworm.changePlotType = function() {
        console.log(this.query.plotType)
    }

    var points;


    changeWords = function() {
	ii = ii+nn;
	console.log("getting new set of words")
	words = allwords.slice(ii,ii+nn)
        bookworm.query.search_limits['word'] = bookworm.query.compare_limits['word'] = words
	console.log(words);

	if (words.length>0){
            bookworm.updateData("bicloud",append=true)
	}
    }

    changeWords();
    var myVar = setInterval(changeWords,4000);
    

})

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


var title = svg.append('g').attr('id','title').attr('transform','translate(' + w*.4+ ',' + n  +')');



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

//define some default scales
