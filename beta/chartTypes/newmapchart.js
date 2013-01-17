function mapQuery() {

    var myQuery = query
    var baseMap = drawStates
    var initialOpacity = .7
    var additionalGroupings = [] //allow multiple circles on the same point?

    var colorScaler = returnScale()
    var sizeScaler  = returnScale()
    
    var sizeElement = ''

   function mapTransition() {
        paperdiv.selectAll('circle')
	    .transition()
	    .duration(4500)
	    .attr('r',2)
	    .attr('fill','white');
    }

    function my() {

	query["groups"]=["lat","lng"].concat(additionalGroupings)
	
	
        if (query.plotType != 'map') {
            query.plotType = 'map'
            removeElements()
        }

	projection = baseMap()

        updateQuery()

        webpath = destinationize(query); //console.log(webpath);

	mapTransition() 

        d3.json(webpath,function(json) {

            paperdata = parseBookwormData(json,query);

            if (comparisontype()=='comparison') {
                paperdata = paperdata.map(function(d) {d.CompareWords = d.TotalWords; d.TotalWords = d.WordCount+d.TotalWords;return(d)})
            }
	    
            values = paperdata.map(function(d) {return(d.WordCount/d.TotalWords)});

	    if (comparisontype()!='comparison') {
		values = paperdata.map(function(d) {return(d.WordCount/d.TotalWords*1000000)});
	    }

	    colorscale = colorScaler.values(values).scaleType(d3.scale.log)()


            paperdata.sort(function(a,b) {return(b.TotalWords-a.TotalWords)} );

            totals = paperdata.map(function(d) {return(d.TotalWords)});
            nwords.domain(d3.extent(totals))
	    if (true) {
		totals = paperdata.map(function(d) {return(d.WordCount)})
		paperdata.sort(function(a,b) {return(b.WordCount-a.WordCount)} );
		nwords = d3.scale.sqrt()
		//nwords = d3.scale.log()
		nwords.domain(d3.extent(totals))
		nwords.range([1,50])
	    }

            nwords.nice()



            var mypoints = paperdiv.selectAll('circle')
                .data(paperdata,function(d) {return([d.lat,d.lng])});

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
                .attr('opacity',initialOpacity)
                .attr('onmouseover', "evt.target.setAttribute('opacity', '1');")
                .attr('onmouseout',  "evt.target.setAttribute('opacity', " + initialOpacity + ");")
                .transition()
                .duration(2500)
                .attr('r',function(d) {
		    if (true) {
			return nwords(d['WordCount'])
		    } else {
			return nwords(d['TotalWords'])
		    }
		})
                .attr('fill',function(d) {
                    if (comparisontype()=='comparison') {return(colorscale(d.WordCount/d.CompareWords))}
                    else {return(colorscale(d.WordCount/d.TotalWords*1000000))}
                })

            mypoints.exit().transition().duration(1000).remove()

	    fillLegend=fillLegendMaker(colorscale)
	    fillLegend()

            makeSizeLegend();
        });
    }

    my.initialOpacity = function(value) {
	if (!arguments.length) return initialOpacity;
	initialOpacity = value;
	return my;
    };

    my.colorScaler = function(value) {
	if (!arguments.length) return colorScaler;
	colorScaler = value;
	return my;
    };

    my.baseMap = function(value) {
	if (!arguments.length) return baseMap;
	baseMap = value;
	return my;
    };

    return my

}