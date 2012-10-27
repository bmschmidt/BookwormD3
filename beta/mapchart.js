function mapQuery() {

    if (query.plotType != 'map') {
	query.plotType = 'map'
	removeElements()
    }
    drawStates()
    colorscale = colors;
    query["groups"]=["lat","lng"]
    updateQuery()

    webpath = destinationize(query);
    console.log(webpath);

    paperdiv.selectAll('circle')
        .transition()
        .duration(2500)
        .attr('r',2)
        .attr('fill','white');

    d3.json(webpath,function(json) {
        paperdata = parseBookwormData(json,query);

        if (comparisontype()=='comparison') {
            // This probably isn't the best place to do this: what is? Maybe the API somewhere?                                                                     
            paperdata = paperdata.map(function(d) {d.CompareWords = d.TotalWords; d.TotalWords = d.WordCount+d.TotalWords;return(d)})
        }

        values = paperdata.map(function(d) {return(d.WordCount/d.TotalWords)});
        totals = paperdata.map(function(d) {return(d.TotalWords)});
        
        
        // Set domains across what we have                                                                                                                                 numbers = d3.extent(values)
	
        numbers[0] = d3.max([(1/10)/1000000,d3.min(values)])

        if (comparisontype()=='comparison') {
            outerbound = d3.min([100,d3.max([1/d3.min(values),d3.max(values)])])
            numbers = [1/outerbound,outerbound]
	    colorscale=logcolors
        }

        min = Math.log(numbers[0])
        max = Math.log(numbers[1])

        colorscale.domain(d3.range(min,max,(max-min)/colorscale.range().length).map(function(n) {return(Math.exp(n))}))
        colorscale.nice()
        nwords.domain(d3.extent(totals))
        nwords.nice()

        $("#max_x").text(' maximum value: ' + Math.round( 100*1000000*colors.domain()[2],2)/100 );



        //paperdiv.selectAll('circle').remove()                                                                                                                     
	
        paperdata.sort(function(a,b) {return(b.TotalWords-a.TotalWords)} );

        var mypoints = paperdiv.selectAll('circle')
            .data(paperdata,function(d) {return(d.paperid)});


        mypoints
            .enter()
            .append('circle')
            .on('click',function(d) {
                searchTemplate = JSON.parse(JSON.stringify(query))
                searchTemplate['search_limits']['lat'] = [d.lat]
                searchTemplate['search_limits']['lng'] = [d.lng]
                searchWindow(searchTemplate)
            });

        mypoints
            .attr('transform',function(d) {
                coords = projection([d.lng,d.lat]);
                return "translate(" + coords[0] +","+ coords[1] + ")"})
            .attr('id',function(d) {return(d.paperid)})
            .attr('opacity','.5')
            .attr('onmouseover', "evt.target.setAttribute('opacity','1');")
            .attr('onmouseout',  "evt.target.setAttribute('opacity','.5');")
            .transition()
            .duration(2500)
            .attr('r',function(d) {return(nwords(d.TotalWords))})
            .attr('fill',function(d) {
                if (comparisontype()=='comparison') {return(colorscale(d.WordCount/d.CompareWords))}
                else {return(colorscale(d.WordCount/d.TotalWords))}
            })

        mypoints.exit().transition(1000).remove()
        makeLegend();
    });
}