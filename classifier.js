var bookworm = new Bookworm({
    "method":"return_json",
    "words_collation":"Case_Sensitive",
    "database":"federalist",
    "search_limits":{
        "word": ["Call"]
//,	"year":{"$gte":1830,"$lte":1922}
    },
    "counttype":["WordCount"],
    "aesthetic":{"label":"unigram","x":"WordCount","y":"author"},
    "plotType":"logClassify"
})

var changeWords,inspect;
var seen = {};

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

    stopwords = ["a", "able", "about", "above", "according", "accordingly", "across", "actually", "after", "afterwards", "again", "against", "all", "allow", "allows", "almost", "alone", "along", "already", "also", "although", "always", "am", "among", "amongst", "an", "and", "another", "any", "anybody", "anyhow", "anyone", "anything", "anyway", "anyways", "anywhere", "apart", "appear", "appreciate", "appropriate", "are", "around", "as", "aside", "ask", "asking", "associated", "at", "available", "away", "awfully", "b", "be", "became", "because", "become", "becomes", "becoming", "been", "before", "beforehand", "behind", "being", "believe", "below", "beside", "besides", "best", "better", "between", "beyond", "both", "brief", "but", "by", "c", "came", "can", "cannot", "cant", "cause", "causes", "certain", "certainly", "changes", "clearly", "co", "com", "come", "comes", "concerning", "consequently", "consider", "considering", "contain", "containing", "contains", "corresponding", "could", "course", "currently", "d", "definitely", "described", "despite", "did", "different", "do", "does", "doing", "done", "down", "downwards", "during", "e", "each", "edu", "eg", "eight", "either", "else", "elsewhere", "enough", "entirely", "especially", "et", "etc", "even", "ever", "every", "everybody", "everyone", "everything", "everywhere", "ex", "exactly", "example", "except", "f", "far", "few", "fifth", "first", "five", "followed", "following", "follows", "for", "former", "formerly", "forth", "four", "from", "further", "furthermore", "g", "get", "gets", "getting", "given", "gives", "go", "goes", "going", "gone", "got", "gotten", "greetings", "h", "had", "happens", "hardly", "has", "have", "having", "he", "hello", "help", "hence", "her", "here", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "hi", "him", "himself", "his", "hither", "hopefully", "how", "howbeit", "however", "i", "ie", "if", "ignored", "immediate", "in", "inasmuch", "inc", "indeed", "indicate", "indicated", "indicates", "inner", "insofar", "instead", "into", "inward", "is", "it", "its", "itself", "j", "just", "k", "keep", "keeps", "kept", "know", "knows", "known", "l", "last", "lately", "later", "latter", "latterly", "least", "less", "lest", "let", "like", "liked", "likely", "little", "look", "looking", "looks", "ltd", "m", "mainly", "many", "may", "maybe", "me", "mean", "meanwhile", "merely", "might", "more", "moreover", "most", "mostly", "much", "must", "my", "myself", "n", "name", "namely", "nd", "near", "nearly", "necessary", "need", "needs", "neither", "never", "nevertheless", "new", "next", "nine", "no", "nobody", "non", "none", "noone", "nor", "normally", "not", "nothing", "novel", "now", "nowhere", "o", "obviously", "of", "off", "often", "oh", "ok", "okay", "old", "on", "once", "one", "ones", "only", "onto", "or", "other", "others", "otherwise", "ought", "our", "ours", "ourselves", "out", "outside", "over", "overall", "own", "p", "particular", "particularly", "per", "perhaps", "placed", "please", "plus", "possible", "presumably", "probably", "provides", "q", "que", "quite", "qv", "r", "rather", "rd", "re", "really", "reasonably", "regarding", "regardless", "regards", "relatively", "respectively", "right", "s", "said", "same", "saw", "say", "saying", "says", "second", "secondly", "see", "seeing", "seem", "seemed", "seeming", "seems", "seen", "self", "selves", "sensible", "sent", "serious", "seriously", "seven", "several", "shall", "she", "should", "since", "six", "so", "some", "somebody", "somehow", "someone", "something", "sometime", "sometimes", "somewhat", "somewhere", "soon", "sorry", "specified", "specify", "specifying", "still", "sub", "such", "sup", "sure", "t", "take", "taken", "tell", "tends", "th", "than", "thank", "thanks", "thanx", "that", "thats", "the", "their", "theirs", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", "therefore", "therein", "theres", "thereupon", "these", "they", "think", "third", "this", "thorough", "thoroughly", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together", "too", "took", "toward", "towards", "tried", "tries", "truly", "try", "trying", "twice", "two", "u", "un", "under", "unfortunately", "unless", "unlikely", "until", "unto", "up", "upon", "us", "use", "used", "useful", "uses", "using", "usually", "uucp", "v", "value", "various", "very", "via", "viz", "vs", "w", "want", "wants", "was", "way", "we", "welcome", "well", "went", "were", "what", "whatever", "when", "whence", "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "whoever", "whole", "whom", "whose", "why", "will", "willing", "wish", "with", "within", "without", "wonder", "would", "would", "x", "y", "yes", "yet", "you", "your", "yours", "yourself", "yourselves", "z", "zero"]

    changeWords = function(callback,testFunction) {
	testFunction = testFunction || function(d) {return stopwords.indexOf(d) > 0; true; d.length >= 4}
	callback = callback || function() {}
	//grab the first one.
	workingOn = textDisplay.select("text.unselected")

	words = workingOn.text();//datum().label;
	
        bookworm.query.search_limits['word'] = [words]

	workingOn
	    .classed("unselected",false)
	    .transition()
	    .duration(300)
	    .style('fill',testFunction(words)?"red":"green")
	    .transition()
	    .attr("y",testFunction(words)?120:function(d) {return})
	    .attr("x",testFunction(words)?400:-30)
	    .duration(2000)	
	    .style("font-size",testFunction(words)?180:12)
	    .style("opacity",0)
	    .remove()

	if (!testFunction(words)) {
	    return changeWords(callback,testFunction)
	}

	min = d3.min(d3.selectAll("text.unselected").data().map(function(d) {return d.y}));
	
	textDisplay.selectAll("text.unselected")
	    .transition().duration(800)
	    .attr("y",function(d) {return (d.y-min)})
	

        if (words.length>0){
	    var myQuery = bookworm.query
            if (seen[JSON.stringify(myQuery)] != undefined) {
		bookworm.data = seen[JSON.stringify(myQuery)]
		console.log("doing without server trip")
		bookworm.logClassify()
            } else {
		bookworm.updateData(function() {
		    bookworm.logClassify();
		    seen[JSON.stringify(myQuery)] = bookworm.data
		})
	    }

    }
    }

    d3.select("svg").on("click",function(d) {
        //changeWords()
    })
    changeWords()
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

