
var bookworm = new Bookworm({
        "method":"return_json",
        "words_collation":"Case_Sensitive",
        "database":"presidio",
        "search_limits":{
            "lc0":["G"],
            "word": ["Call","me","Ishmael","","","Some","years","ago","","never","mind","how","long","","precisely","","having","little","or"]
        },
        "compare_limits":{
            "lc1":["PS"],
            "word": ["Call","me","Ishmael","","","Some","years","ago","","never","mind","how","long","","gprecisely","","having","little","or"]
        },
        "counttype":["WordCount","TotalWords"],
        "groups":["unigram"],
        "aesthetic":{"label":"unigram","x":"WordCount","y":"TotalWords"},
        "plotType":"bicloud"
    })


    bookworm.updateAxisOptionBoxes()


d3.json("/beta/moby-dick/words.json",function(allwords) {
    allwords = allwords.filter(function(d) {return(d!="")})
    var nn=10;
    var ii=0;
    var myVar;
    var ticker = 1;
    changeWords = function() {
	words = allwords.slice(ii,ii+nn)

        bookworm.query.search_limits['word'] = bookworm.query.compare_limits['word'] = words

	if (words.length>0){
            bookworm.updateData("bicloud",append=true)
	}

	ii = ii+nn;
	ticker ++;
	if (ticker > 25) {console.log("pausing"); clearInterval(myVar)}
    }
    changeWords()

    d3.select("svg").on("click",function(d) {
	changeWords()
	myVar = setInterval(changeWords,4000);
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


//The types of maps are just coded in.

d3.select("body").on("keypress",function(e){
    if(d3.event.keyCode == 13){
	bookworm.updatePlot()
    }
});


//I like this pallette--I think we usually need two tones to really discriminate,
//even though dataviz wisdom seems to say that's not kosher.

//define some default scales
