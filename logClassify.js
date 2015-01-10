BookwormClasses.logClassify = function() {
    

    console.log(this.query)
    //due to inheritance problems, bookworm has to be defined globally for this one.

    d3
        .select("#svg")
        .attr("height",2000)

    d3.selectAll("textarea").attr("rows",5);


    if (bookworm.classifyCount===undefined || bookworm.classifyCount.length==0) {

        bookworm.classifyCount="pending";
        console.log(bookworm.query)
        myQuery = JSON.parse(JSON.stringify(bookworm.query));
        myQuery.search_limits.word=undefined;
        myQuery.groups = myQuery.groups.filter(function(d) {
            return ["unigram","bigram","word"].indexOf(d) < 0;
        })

        myQuery.counttype = "WordCount";
        d3.json(
            bookworm.destinationize(myQuery),function(data) {
                bookworm.classifyCount = bookworm.parseBookwormData(data,myQuery)
                //                bookworm.classifyCount = bookworm.classifyCount.filter(function(d) {
                //                  return d.WordCount > 10042509;
                //             })
                bookworm.updateData(bookworm.logClassify)
                return;
            })

    }
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
    console.log(totals)
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


    domain = d3.extent(totals.map(function(d) {return d.currentOverall}))

    var x = d3.scale.linear()
        .domain([domain[0],domain[1]])
        .range([30,window.innerWidth*.8]);

    var bWormwidth = d3.select("svg").attr("width")
    x.range([30,bWormwidth])

    console.log(x.range())

    var axis = d3.svg.axis().orient("top").scale(x);

    var axes=d3.select('#barArea').selectAll("g.x.axis").data([1])
    axes.enter().append("g").attr("class","x axis").call(axis)

    axes.transition().duration(700).call(axis)

    totals = totals.sort(function(a,b) {return b.currentOverall-a.currentOverall})


    var yvalues = totals.map(function(d) {return d.key})
    var y = d3.scale.ordinal()
        .domain(yvalues)
        .rangeBands([0,11*yvalues.length]);


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
        .text(function(d) {return d[bookworm.query.aesthetic.y]})
        .style("font-size",13)
        .style("fill","white")
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
        .attr("height",y.rangeBand())
        .style("fill","#4298A1")
        .attr("width",function(d) {
            return x(d.currentOverall);
        })
    setTimeout(changeWords,700)
}
