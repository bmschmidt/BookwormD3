var testing;

function heatMapFactory() {
    var limits = {'x':[100,900],'y':[75,690]}
    var myQuery = query
    var colorScaler = returnScale().scaleType(d3.scale.linear)
    var sizeScaler  = returnScale()

    function my() {

        if (lastPlotted != 'heatMap') {
            lastPlotted = 'heatMap'
            removeElements()
        } else {
	    paperdiv.selectAll('rect').transition().duration(2500).attr('opacity',0)
	    xaxis.selectAll('text').remove()
	    yaxis.selectAll('text').remove()
	}
	paperdiv.selectAll('title').remove()

        updateQuery()

	myQuery=query

        webpath = destinationize(myQuery);
        console.log(webpath);

        //make the graphic
        group1 = myQuery['groups'][0]
        group2 = myQuery['groups'][1]

//        colorScaler = returnScale().scaleType(d3

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
		
		numeric = !d3.sum(vals.map(function(d) {return (isNaN(d) & d!="" & d!="None")}))

		if (!numeric) {
		    console.log(axis + " is not numeric")
		    names = topn(50,variableName,paperdata)

		    paperdata = paperdata.filter(function(entry) {
			return(names.indexOf(entry[variableName]) > -1)
		    })

		    names.sort()
		    vals = names
		    scale = d3.scale.ordinal().domain(vals).rangeBands(limits[axis])
		    pointsToLabel = vals
		}
		
		if (numeric) {
		    console.log(axis + " is numeric")
		    vals = vals.map(function(d) {return parseFloat(d)})
		    if (axis=='x') {
			vals.sort(function(a,b){return(a-b)})
			testing = vals
		    }
		    if (axis=='y') {
			vals.sort(function(a,b){return(b-a)})
		    }

		    scale = d3.scale.ordinal().domain(vals).rangeBands(limits[axis])

		    pointsToLabel = d3.scale.linear().domain(d3.extent(vals)).ticks(10)

		}

		checkLabel = function(d) {
		    if (pointsToLabel.indexOf(d)>-1) {return d}; return "";
		},
		legendData = vals.map(function(d) {
		    val = {
			'label':checkLabel(d),
			'x' : limits['x'][1],
			'y' : limits['y'][0]
		    } //overwrite the variable one.
		    val[axis] = scale(d)
		    if (axis=='y') {val[axis] = val[axis] + scale.rangeBand()*.5}		    
		    if (axis=='x') {val[axis] = val[axis] + scale.rangeBand()*.5}		    

		    return val
		})
		
		return({'scale' : scale,'legendData' : legendData})
	    }



	    xstuff = scaleAndTicks('x')
	    x = xstuff.scale
	    xlegendData = xstuff.legendData



	    ystuff = scaleAndTicks('y')
	    y = ystuff.scale
	    ylegendData = ystuff.legendData


// label the y legend	    
            ypoints = yaxis.selectAll('text').data(ylegendData,function(d) {
		return(d.label)
	    })

            ypoints
                .enter()
                .append('text')
                .attr('fill','white')
                .attr('x',function(d) {return(d.x)})
                .attr('y',function(d) {return(d.y+7)})
                .attr("font-family", "sans-serif")
                .attr("font-size", "13px")
                .text(function(d) {return(d.label)})

	    ypoints.exit().remove()

	 //label the x legend
            xpoints = xaxis
                .selectAll('text')
                .data(xlegendData)
	    xpoints.exit().remove()
            xpoints
                .enter()
                .append('text')
                .attr('fill','white')
                .attr('x',function(d) {return(d.x)})
                .attr('y',function(d) {return(d.y-2)})
		.attr("text-anchor", "middle")
                .attr("font-family", "sans-serif")
                .attr("font-size", "13px")
                .attr("fill", "white")
                .text(function(d) {return(d.label)})


	    //Key the data against the actual interaction it is, so transitions will work.
	    paperdata = paperdata.map(function(d) {
		d.key = d[myQuery['groups'][0]] + d[myQuery['groups'][1]]
		return(d)
	    })

            values = paperdata.map(function(d) {return(d.WordCount/d.TotalWords*1000000)});
            totals = paperdata.map(function(d) {return(d.TotalWords)});
	    
            colorscale = colorScaler.values(values).scaleType(d3.scale[$("#scaleType").val()])()

            gridPoint = paperdiv.selectAll('rect')
		.data(paperdata,function(d) {
		    return(d.key)
                })

            gridPoint
	        .enter()
                .append('rect')
		.attr('opacity',0)

	    gridPoint
                .on('click',function(d) {
                    searchTemplate = JSON.parse(JSON.stringify(myQuery))
                    searchTemplate['search_limits'][group2] = [d[group2]]
                    searchTemplate['search_limits'][group1] = [d[group1]]
                    searchWindow(searchTemplate)
                })

	    gridPoint
//                .attr('opacity','0')
                .attr('stroke-width',0)
                .attr('stroke','black')
                .attr('onmouseover', "evt.target.setAttribute('stroke-width','2');")
                .attr('onmouseout',  "evt.target.setAttribute('stroke-width','0');")
                .attr('x',function(d) {return(x(d[myQuery['groups'][0]]))})
                .attr('y',function(d) {return(y(d[myQuery['groups'][1]]))})

                .attr('height', y.rangeBand()*.985)
                .attr('width', x.rangeBand()*.985)

                .transition()
                .duration(2500)
                .attr('opacity','1')
                .attr('fill',function(d) {
                    if (comparisontype()=='comparison') {
                        color = colorscale(d.WordCount/d.CompareWords)}
                    else {
			color = colorscale(d.WordCount/d.TotalWords*1000000);
			if (d.WordCount==0) {color='#393939'}
		    }
		    if (color=="#000000") {color='#393939'}

		    return color;
		})

            gridPoint
                .append("svg:title")
                .text(function(d) { return ('Click for texts \n' + prettyName(d.WordCount) + ' occurrences out of ' + prettyName(d.TotalWords) + ' words (' + Math.round(d.WordCount/d.TotalWords*1000000*100)/100 + ' per million)')});
	    

            a = fillLegendMaker(colorscale).yrange(limits.y)
            a()

        })

    }

    return my

}