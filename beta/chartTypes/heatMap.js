var testing;
var yAxis;
var xAxis;
var x,y;

function heatMapFactory() {
    var limits = {'x':[w*.1,w*.66],'y':[75,h*.95]}
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

	//paperdiv.selectAll('title').remove()

        updateQuery()

	myQuery=query

        webpath = destinationize(myQuery);
        console.log(webpath);

        //make the graphic
        group1 = myQuery['groups'][0]
        group2 = myQuery['groups'][1]

        // load in the data
        d3.json(webpath,function(json) {

            paperdata = parseBookwormData(json,myQuery);

	    
            //Frequency stats are calculated from raw data here.
            if (comparisontype()=='comparison') {
                // This probably isn't the best place to do this: what is?
                paperdata = paperdata.map(function(d) {d.CompareWords = d.TotalWords; d.TotalWords = d.WordCount+d.TotalWords;return(d)})
            }
	    
            nwords.nice()

	    scaleAndAxis = function(axis) {
		//Should be renamed: now it just returns a scale.
		pos=0; if (axis=='y') {pos=1}
		variableName = myQuery['groups'][pos]

		vals = d3.nest().key(function(d) {return d[variableName] }).entries(paperdata).map(function(d) {
		    return(plotTransformers[variableName](d.key))})

		datatype = dataTypes[variableName]

		if (datatype=="Categorical") {
		    console.log(axis + " is categorical")
		    n = function() {
			//home many elements to display depends on the width: no more than ten pixels vertically, and 30 pixels horizontally
			if (axis=='y') {minSize=11}
			if (axis=='x') {minSize=60}
			return Math.round((limits[axis][1]-limits[axis][0])/minSize)
		    }()
		    names = topn(n,variableName,paperdata)
		    paperdata = paperdata.filter(function(entry) {
			return(names.indexOf(entry[variableName]) > -1)
		    })

		    names.sort()
		    vals = names
		    scale = d3.scale.ordinal().domain(vals).rangeBands(limits[axis])
		    pointsToLabel = vals
		    thisAxis = d3.svg.axis()
			.scale(scale)
		}

		
		if (datatype=="Numeric") {
		    console.log(axis + " is numeric")
		    vals = vals.map(function(d) {return parseFloat(d)})
		    if (axis=='x') {
			vals.sort(function(a,b){return(a-b)})
			testing = vals
		    }
		    if (axis=='y') {
			vals.sort(function(a,b){return(b-a)})
		    }
		    scale = d3.scale.linear().domain(d3.extent(vals)).range(limits[axis])
		    thisAxis = d3.svg.axis()
			.scale(scale)
			.tickFormat(d3.format('g'))
			.tickSubdivide(1)
		}

		if (datatype=="Date") {
		    console.log(axis + " is date")
		    if (axis=='x') {
			vals.sort(function(a,b){return(a-b)})
			testing = vals
		    }
		    if (axis=='y') {
			vals.sort(function(a,b){return(b-a)})
		    }
		    scale = d3.time.scale().domain(d3.extent(vals)).range(limits[axis])
		    thisAxis = d3.svg.axis()
			.scale(scale)
			.tickSubdivide(1)
		}

		scale.pixels = (limits[axis][1]-limits[axis][0])/vals.length;
		return({"scale":scale,"axis":thisAxis})		
	    }
	    
	    xstuff = scaleAndAxis('x')
	    xAxis = xstuff.axis.orient("top")
	    x = xstuff.scale

	    ystuff = scaleAndAxis('y')
	    yAxis = ystuff.axis.orient("right")
	    y = ystuff.scale

	    //yaxis
	    d3.selectAll('#y-axis').remove()
	    svg.append("g")
		.attr('id','y-axis')
		.call(yAxis)
		.attr("class","axis") // note new class name
		.attr("transform","translate(" + (x.pixels+limits['x'][1])  +",0)") 

	    //x-axis
	    d3.selectAll('#x-axis').remove()
	    svg.append("g")
		.attr('id','x-axis')
		.call(xAxis)
		.attr("class","axis") // note new class name
		.attr("transform","translate("+x.pixels*.5+ "," + (limits['y'][0])  +")") 

	    //Key the data against the actual interaction it is, so transitions will work.
	    paperdata = paperdata.map(function(d) {
		d.key = d[myQuery['groups'][0]] + d[myQuery['groups'][1]]
		return(d)
	    })

//            values = paperdata.map(function(d) {return(d.WordCount/d.TotalWords*1000000)});
//            totals = paperdata.map(function(d) {return(d.TotalWords)});
	    colorValues = paperdata.map(function(d) {return(d[aesthetic['color']])})
            colorscale = colorScaler.values(colorValues).scaleType(d3.scale[$("#scaleType").val()])()

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
	    xVariable = myQuery['groups'][0]
	    yVariable = myQuery['groups'][1]
	    gridPoint
                .attr('stroke-width',0)
                .attr('stroke','black')
		.on("mouseover",function(d) {
		    this.setAttribute('stroke-width','2');
		    updatePointer(d[aesthetic['color']])
		})
		.on('mouseout',function(d) {
		    this.setAttribute('stroke-width',0);
		    colorLegendPointer.transition().duration(2500).attr('opacity',0)
		})
                .attr('x',function(d) {return x(plotTransformers[xVariable](d[xVariable]))})
                .attr('y',function(d) {return Math.round(y(plotTransformers[yVariable](d[yVariable])))})
	    
                .attr('height', y.pixels)
                .attr('width', x.pixels)
                .transition()
                .duration(2500)
                .attr('opacity','1')
                .attr('fill',function(d) {
                    if (comparisontype()=='comparison') {
                        color = colorscale(d.WordCount/d.CompareWords)}
                    else {
			color = colorscale(d[aesthetic['color']]);
			if (d[aesthetic['color']]==0) {color='#393939'}
		    }
		    if (color=="#000000") {color='#393939'}

		    return color;
		})

            gridPoint
                .append("svg:title")
                .text(function(d) { 
		    return ('Click for texts \n' + prettyName(d.WordCount) + ' occurrences out of ' + prettyName(d.TotalWords) + ' words (' + Math.round(d['WordsPerMillion']*100)/100 + ' per million)')
		});
            a = fillLegendMaker(colorscale)//.yrange(limits.y)
            a()

        })

    }

    return my

}