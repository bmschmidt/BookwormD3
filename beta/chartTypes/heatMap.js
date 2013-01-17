function heatMapFactory() {

    var limits = {'x':[100,900],'y':[75,690]}

    var myQuery = query
    var colorScaler = returnScale()
    var sizeScaler  = returnScale()



    function my() {

        updateQuery()
        webpath = destinationize(myQuery);
        console.log(webpath);

        //make the graphic
        group1 = myQuery['groups'][0]
        group2 = myQuery['groups'][1]

        if (myQuery.plotType != 'heatMap') {
            myQuery.plotType = 'heatMap'
            removeElements()
        }

        colorScaler = returnScale()

        // load in the data

        d3.json(webpath,function(json) {
            paperdata = parseBookwormData(json,myQuery);

            //Frequency stats are calculated from raw data here.
            if (comparisontype()=='comparison') {
                // This probably isn't the best place to do this: what is?
                paperdata = paperdata.map(function(d) {d.CompareWords = d.TotalWords; d.TotalWords = d.WordCount+d.TotalWords;return(d)})
            }
	    
            nwords.nice()

	    scaleAndTicks = function(axis) {
		pos=0; if (axis=='y') {pos=1}
		
		variableName = myQuery['groups'][pos]
		
		vals = d3.nest().key(function(d) {return(d[myQuery['groups'][pos]]);}).entries(paperdata).map(function(d) {return(d.key)})

		numeric = d3.sum(vals.map(function(d) {return isNaN(d)})) ==0

		if (!numeric) {
		    names = topn(50,variableName,paperdata)

		    paperdata = paperdata.filter(function(entry) {
			return(names.indexOf(entry[variableName]) > -1)
		    })

		    names.sort()
		    vals = names
		    scale = d3.scale.ordinal().domain(vals).rangeBands(limits[axis])
		}
		
		if (numeric) {
		    vals = vals.map(function(d) {return parseFloat(d)})
		    vals.sort()
		    console.log(vals)
		    scale = d3.scale.ordinal().domain(vals).rangeBands(limits[axis])
		}

		legendData = vals.map(function(d) {
		    val = {
			'label':d,
			'x' : limits['x'][1],
			'y' : limits['y'][0]
		    } //overwrite the variable one.
		    val[axis] = scale(d)
		    if (axis=='y') {val[axis] = val[axis] + scale.rangeBand()*.9}
		    return val
		})
		
		return({'scale' : scale,'legendData' : legendData})
	    }

            values = paperdata.map(function(d) {return(d.WordCount/d.TotalWords*1000000)});
            totals = paperdata.map(function(d) {return(d.TotalWords)});
	    colorscale = colorScaler.values(values).scaleType(d3.scale.log)()

	    x = scaleAndTicks('x').scale
	    y = scaleAndTicks('y').scale
	    ylegendData = scaleAndTicks('y').legendData
	    xlegendData = scaleAndTicks('x').legendData
	    
            ypoints = yaxis.selectAll('text').data(ylegendData,function(d) {return(d.label)})

            ypoints
                .enter()
                .append('text')
                .attr('fill','white')
                .attr('x',function(d) {return(d.x)})
                .attr('y',function(d) {return(d.y)})
                .attr("font-family", "sans-serif")
                .attr("font-size", "13px")
                .text(function(d) {return(d.label)})

	    ypoints.exit().remove()

            xpoints = xaxis
                .selectAll('text')
                .data(xlegendData)

	    xpoints.exit().remove()

            xpoints
                .enter()
                .append('text')
                .attr('fill','white')
                .attr('x',function(d) {return(d.x)})
                .attr('y',function(d) {return(d.y)})
                .attr("font-family", "sans-serif")
                .attr("font-size", "13px")
                .attr("fill", "white")
                .text(function(d) {return(d.label)})

            //stupid, but don't want to change the underlying function.

            paperdata.sort(function(d) {return(d.value)} );
	    paperdata = paperdata.map(function(d) {
		d.key = d[myQuery['groups'][0]] + d[myQuery['groups'][1]]
		return(d)
	    })

            gridPoint = paperdiv.selectAll('rect')
		.data(paperdata,function(d) {
		    return(d.key)
                })
	    
            gridPoint
	        .enter()
                .append('rect')
                .on('click',function(d) {
                    searchTemplate = JSON.parse(JSON.stringify(myQuery))
                    searchTemplate['search_limits'][group2] = [d[group2]]
                    searchTemplate['search_limits'][group1] = [d[group1]]
                    searchWindow(searchTemplate)
                })

	    gridPoint
                .attr('opacity','1')
                .attr('stroke-width',0)
                .attr('stroke','black')
                .attr('onmouseover', "evt.target.setAttribute('stroke-width','2');")
                .attr('onmouseout',  "evt.target.setAttribute('stroke-width','0');")
                .attr('x',function(d) {return(x(d[myQuery['groups'][0]]))})
                .attr('y',function(d) {return(y(d[myQuery['groups'][1]]))})

                .transition()
                .duration(2500)
                .attr('fill',function(d) {
                    if (comparisontype()=='comparison') {
                        return(colorscale(d.WordCount/d.CompareWords))}
                    else {return(colorscale(d.WordCount/d.TotalWords*1000000))}
                })

                .attr('height', y.rangeBand()*.985)
                .attr('width', x.rangeBand()*.985)

            gridPoint
                .append("svg:title")
                .text(function(d) { return ('Click for texts (value is ' + Math.round(d.WordCount/d.TotalWords*1000000*100)/100) + ')'});
	    

            //makeFillLegend();
            a = fillLegendMaker(colorscale)
            a()
        })
    }
    return my

}