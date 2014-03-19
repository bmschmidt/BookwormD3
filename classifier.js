var bookworm = new Bookworm({
    "method":"return_json",
    "words_collation":"Case_Sensitive",
    "database":"presidio",
    "search_limits":{
        "word": ["Call","me","Ishmael","","","Some","years","ago","","never","mind","how","long","","precisely","","having","little","or"],
	"year":{"$gte":1830,"$lte":1922},
    },
    "counttype":["WordCount"],
    "aesthetic":{"label":"unigram","y":"WordCount","x":"classification"},
    "plotType":"logClassify"
})

var changeWords,inspect;
bookworm.updateAxisOptionBoxes();


d3.select("svg").on("click",function(d) {
    d3.selectAll("textarea").style("display","none")
    var value =  document
        .getElementById("paragraph")
        .value

    value = value.replace(/[^A-Za-z]/gi," ")
    value = value.split(" ")
    value = value.filter(function(d) {
        return d!="";
    })
    allwords = value;
    allwords = allwords.filter(function(d) {return(d!="")})

    allwords = allwords.filter(function(d) {return(d!="")})

    var textDisplay = d3.selectAll("#textDisplay")

    if (textDisplay[0].length==0) {
	textDisplay =d3.select("svg")
	    .append("svg")
	    .attr("height",100)
	    .attr("width",d3.select("svg").style("width"))
	    .attr("id","textDisplay")
	    .append("g")
	    .attr("transform","translate(0,35)")
	    .attr("id","paraGroup")
    }

    style = "font-size:18pt;fill:grey;"

    var displayWords = d3.layout.paragraph()
	.label(function(d) {return [d]})
	.style(style)
	.width(d3.select("#textDisplay").attr("width").replace("px",""))
	.points(allwords);

    var displayedWords = textDisplay.selectAll("text").data(displayWords);

    inspect = displayedWords

    displayedWords.enter().append("text")
	.attr("x",function(d) {return d.x})
	.attr("y",function(d) {return d.y})
	.text(function(d) {return d.label})
	.classed("unselected",true)

    displayedWords.attr("style",style)

    changeWords = function() {

	workingOn = textDisplay.select("text.unselected")

	words = workingOn.text();//datum().label;

        bookworm.query.search_limits['word'] = words

	workingOn
	    .classed("unselected",false)
	    .transition()
	    .duration(300)
	    .style('fill','red')
	    .transition()
	    .attr("y",120).attr("x",400)
	    .duration(2000)
	
	    .style("font-size",180)
	    .style("opacity",0)
	    .remove()

	min = d3.min(d3.selectAll("text.unselected").data().map(function(d) {return d.y}));
	
	textDisplay.selectAll("text.unselected")
	    .transition().duration(800)
	    .attr("y",function(d) {return (d.y-min)})
	

        if (words.length>0){
            bookworm.updateData("logClassify")
        }
    }

    d3.select("svg").on("click",function(d) {
        changeWords()
	myVar = setInterval(changeWords,300);
    })

})

// And for now I'm just having that query live in a text box. We can use the real Bookworm query entries instead, but no use reinventing that wheel here.

var APIbox = d3.select('#APIbox')
    .property('value', JSON.stringify(bookworm.query))
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
        bookworm.updatePlot()
    })


d3.select("body").on("keypress",function(e){
    if(d3.event.keyCode == 13){
        bookworm.updatePlot()
    }
});

