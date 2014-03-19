BookwormClasses.logClassify = function() {

    d3
	.select("#svg")
	.attr("height",2000)

    
    d3.selectAll("textarea").attr("rows",5);
    var bookworm = this;
    
    this.alignAesthetic()

    if (bookworm.classifyCount===undefined) {

        bookworm.classifyCount="pending";
        myQuery = JSON.parse(JSON.stringify(bookworm.query));
        myQuery.search_limits.word=undefined;
        myQuery.groups = myQuery.groups.filter(function(d) {
            return ["unigram","bigram","word"].indexOf(d) < 0;
        })
        
	myQuery.counttype = "WordCount";
	
        d3.json(
            bookworm.destinationize(myQuery),function(data) {
                bookworm.classifyCount = bookworm.parseBookwormData(data,myQuery)
		bookworm.classifyCount = bookworm.classifyCount.filter(function(d) {return d.WordCount > 10042509;})
            })
        setTimeout(function() {
	    bookworm.logClassify()
	},500);
	return;
    }

    if (bookworm.classifyCount=="pending"){
        setTimeout(function() {bookworm.logClassify()},500);
    } else {
	console.log(bookworm.query.search_limits.word);
	
	var totals = bookworm.classifyCount;
	var local = bookworm.data;

	variableKey = function(d) {
	    var key = "";
	    bookworm.query.groups.forEach(function(e) {
		if (["unigram","bigram","word"].indexOf(e) < 0) {
		    key  = key + d[e]
		}
	    })
	    return key;
	}
	
	localTotals = d3.nest().key(variableKey).map(local)

	totals.forEach(function(d) {
	    //update the chances;

	    var key = variableKey(d)
	    d.key = key;
	    d.howManySoFar = d.howManySoFar || 0;
	    d.previousChance = d.currentOverall || 1;

	    if (localTotals[key]===undefined) {
		d.loc = .1;
	    } else {
		d.loc = localTotals[key][0].WordCount;
	    }
	    
	    d.chance = Math.log(d.loc/d.WordCount);

	    d.howManySoFar++;
	    
	    d.currentOverall = 
		1/d.howManySoFar * d.chance + 
		(d.howManySoFar-1)/d.howManySoFar * d.previousChance;	    
	})


	var x = d3.scale.linear()
	    .domain([-20,-1])
	    .range([1,1000]);

	totals = totals.sort(function(a,b) {return b.currentOverall-a.currentOverall})

	var y = d3.scale.ordinal()
	    .domain(totals.map(function(d) {return d.key}))
	    .rangeBands([0,2200]);

	if (!d3.selectAll("#barArea")[0].length) {
	    d3.select("#svg").append("g").attr("id","barArea").attr("transform","translate(0,200)")
	}

	bars = d3.select("#svg").select("#barArea").selectAll("g").data(totals,function(d) {return d.key})

	var news = bars
	    .enter()
	    .append("g")


	var rects = news
	    .append("rect")
	    .attr("height",10)
	    .style("fill","#4298A1")
	    .attr("x",30)

	var labels = news
	    .append("text")
	    .text(function(d) {return d[bookworm.query.aesthetic.x]})
	    .style("font-size",10)
	    .attr("x",30)
	    .attr("y",10)
	
	bars
	    .transition()
	    .duration(600)
	.delay(function(d,i) {return i*10})
	    .attr("transform",
		  function(d) {
		      return "translate (0," + y(d.key) + ")"
		  })

	bars
	    .selectAll("rect")
	    .transition()
	    .attr("x",30)
	    .attr("y",0)
	    .attr("height",10)
	    .style("fill","#4298A1")
	    .attr("width",function(d) {
		return x(d.currentOverall);
	    })


    }
}
