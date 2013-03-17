function mapQuery() {

    var myQuery = query

    var baseMap = drawMap(document.getElementById('mapChoice').value)
    var initialOpacity = .7
    var additionalGroupings = query['groups'].filter(function(d) {if (d!='lat' & d!='lng') {return true}}) //allow multiple circles on the same point?

    var colorScaler = returnScale()
    var sizeScaler  = returnScale()

    function mapTransition() {
        paperdiv.selectAll('circle')
            .transition()
            .duration(4500)
            .attr('r',2)
            .attr('fill','white');
    }

    function updateChart() {
	paperdiv.selectAll('title').remove()
        paperdata.sort(function(a,b) {return(b[aesthetic['size']]-a[aesthetic['size']])} );
	
        var mypoints = paperdiv.selectAll('circle')
            .data(paperdata,function(d) {return([d.lat,d.lng])});
	
        mypoints
            .enter()
            .append('circle')

	mypoints
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

            .on("mouseover",function(d) {
                this.setAttribute('opacity','1');
                updatePointer(d[aesthetic['color']])
            })
            .on('mouseout',function(d) {
                this.setAttribute('opacity',initialOpacity);
                colorLegendPointer.transition().duration(2500).attr('opacity',0)
            })
            .transition()
            .duration(2500)
            .attr('r',function(d) {
                return sizescale(d[aesthetic['size']])/2 //Divided by two b/c the scale wants to return diameter, not radius.
            })
            .attr('fill',function(d) {
                return colorscale(d[aesthetic['color']])
	    })
	
        mypoints.append("svg:title")
            .text(function(d) {return ('Click to read texts from here\n (' +prettyName(d.WordCount) + ' occurences out of ' + prettyName(d.TotalWords) + ' total words)')})

        mypoints.exit().transition().duration(2500).attr('r',0).remove()
	
        fillLegend=fillLegendMaker(colorscale)
        fillLegend()
	
        drawSizeLegend();
    }
    
    my.updateChart=updateChart

    function my() {
        mapTransition()
        query["groups"]=["lat","lng"].concat(additionalGroupings)
        if (lastPlotted != 'map') {
            lastPlotted = 'map'
            removeElements()
        }
        projection = baseMap()
        updateQuery()
        webpath = destinationize(query);
        d3.json(webpath,function(json) {
            paperdata = parseBookwormData(json,query);

            values = paperdata.map(function(d) {return(d[aesthetic['color']])});

            colorscale = colorScaler.values(values).scaleType(d3.scale[$("#scaleType").val()])()

            sizes = paperdata.map(function(d) {return(d[aesthetic['size']])});

            nwords.domain(d3.extent(sizes))
                .range([0,100])
	    
            nwords.nice()
            updateChart()
        })
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