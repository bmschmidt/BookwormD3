var colorLegendPointer,updatePointer,legendScale = d3.scale.linear();

fillLegendMaker = function(colorscale) {
    var yrange = [75,500]
    colorticks = colorscale.ticks(15);

    width = 25
    xpos  = 20
    plot = true
    title = "Per Million Words"
    colorpoints = colorLegend.selectAll('rect')
    colorlabels = colorLegend.selectAll('text')

    function my() {

	var data1 = d3.range(yrange[0],yrange[1]);
	
	scaleRects = colorLegend.selectAll("rect")
	    .data(data1,function(d){return(d)});

	legendScale=colorscale.copy()
	legendScale.range(d3.range(yrange[0],yrange[1]+1,by=(yrange[1]-yrange[0])/(legendScale.domain().length-1)))

	scaleRects.enter()
	    .append("rect")
	    .attr({
		width: width,
		height:1,
		y: function(d) { return d},//return colorAxisScale(d)},
		x: xpos,
		fill: function(d) {
		    return colorscale(legendScale.invert(d));
		}
	    })

	scaleRects.exit().remove()

	//'formatter' pretties the name, and drops certain ticks for 
	// a log scale.
	function formatter(d) {
	    var x = Math.log(d) / Math.log(10) + 1e-6;
	    return Math.abs(x - Math.floor(x)) < .7 ? prettyName(d) : "";
	}
	if ($('#scaleType').val() != "log") {
	    formatter=prettyName
	}
	d3.selectAll("#color-axis").remove()
	colorAxis = d3.svg.axis().scale(legendScale).orient("right").tickFormat(formatter)
	svg.append("g")
            .attr('id','color-axis')
            .call(colorAxis)
            .attr("class","axis") // note new class name
	    .attr("transform","translate (" + (xpos + width) + ",0)") 

	colorLegend.selectAll('text').remove()
        text1 = "Usage of '" + query['search_limits']['word'][0] + "'" +   " per Million Words"

        if (comparisontype()=='comparison') {
            text1 = "Usage of '" + query['search_limits']['word'][0] + "'" + " per use of '" + query['compare_limits']['word'][0] + "'"
        }
        colorLegend.append('text').attr('x',xpos+375).attr('y',yrange[0]-25).text(text1).attr('fill','white').attr('font-size',35).attr('font-family',"Arial")

	//set up pointer
	d3.selectAll('#pointer').remove()


	colorLegendPointer = colorLegend
	    .append('path')
	    .attr('id','pointer')
	    .attr('d', function(d) { 
		var y = 0, x = xpos+width-14;
		return 'M ' + x +' '+ y + ' l 14 14 l -14 14 z';
	    })
	    .attr('fill','grey')
	    .attr("transform","translate(0," + 200 + ")") //can start wherever
	    .attr("opacity","0") //Start invisible: mouseover events will turn it on.
	updatePointer=function(inputNumbers) {
	    colorLegendPointer
		.transition()
		.duration(750)
		.attr('opacity',1)
		.attr('transform',"translate(0," + (legendScale(inputNumbers) -14)+ ')')
	}
    }
    
    my.yrange = function(value) {
        if (!arguments.length) return yrange;
        yrange = value;
        return my;
    };

    return my
}


makeSizeLegend = function() {
    
    thisLegend = sizeLegend
    thisLegend.yrange = [100,450]

    thisLegend.xpos  = 1500-100
    
    originScale = nwords

    thisLegend.sourceScale = sizescale
    
    myticks = thisLegend.sourceScale.ticks(7);
    //an ugly way to return evenly spaced values by the size of the circles, not by the size of the corresponding value.
    myticks = d3.scale.linear().domain(nwords.range()).ticks(6).map(function(n) {return nwords.invert(n)})

    thisLegend.boxheight = (thisLegend.yrange[1]-thisLegend.yrange[0])/myticks.length +1.5
    thisLegend.width = originScale.range()[1]*.5 + 10
    thisLegend.plot = true
    thisLegend.title = "Total size of corpus"
    thisLegend.points = thisLegend.selectAll('circle')
    thisLegend.labels = thisLegend.selectAll('text')

    thisLegend.scale = d3.scale.linear()
        .range(thisLegend.yrange)
        .domain(d3.extent(d3.range(myticks.length)))

    thisLegend.update = function() {
        thisLegend.data = d3.range(myticks.length).map(function(n) {
            value =
                {"label":prettyName(myticks[n]),
                 "scaled":thisLegend.sourceScale(myticks[n]),
                 'y':thisLegend.scale(n),
                }
            return(value)
        })
	
        thisLegend.points.remove()
        thisLegend.points = thisLegend.selectAll('circle').data(thisLegend.data,function(d) {return(d.y)})
        thisLegend.points.enter()
            .append('circle')
            .attr('y',function(d) {return(d.y)})
            .attr('cy',function(d) {return(d.y)})
               .attr('height',thisLegend.boxheight)
            .attr('x',thisLegend.xpos)
            .attr('cx',thisLegend.xpos)
                    .attr('width',thisLegend.width)
                    .attr('fill',function(d) {return(d.color)})
            .attr('fill','white')
            .attr('r',function(d) {return(d.scaled)})

        thisLegend.labels
            .remove()

        thisLegend.labels = thisLegend.selectAll('text').data(thisLegend.data,function(d) {return(d.y)})
        thisLegend.labels.enter().append('text')
            .attr('y',function(d) {return(d.y)})//+thisLegend.boxheight/2)})
            .attr('x',thisLegend.xpos + thisLegend.width *1.5)
            .attr('fill','white')
            .text(function(d) {return(d.label)})
        text1 = "Raw Number of Occurrences"
        if (comparisontype()=='comparison') {text1="Uses of both words"}
        thisLegend.append('text').attr('x',thisLegend.xpos).attr('y',thisLegend.yrange[0]-25).text(text1).attr('fill','white')
    }
    thisLegend = sizeLegend
    thisLegend.update()
}


sizeLegendMaker = function(originScale) {
    thisLegend = sizeLegend
    yrange = [100,450]
    xpos  = 1500-100
    //an ugly way to return evenly spaced values by the size of the circles, not by the size of the corresponding value.
    myticks = d3.scale.linear().domain(originScale.range()).ticks(6).map(function(n) {return originScale.invert(n)})

    boxheight = (yrange[1]-yrange[0])/myticks.length +1.5
    width = originScale.range()[1]*.5 + 10

    title = "Total size of corpus"

    points = thisLegend.selectAll('circle')
    labels = thisLegend.selectAll('text')

    scale = d3.scale.linear()
        .range(yrange)
        .domain(d3.extent(d3.range(myticks.length)))

    my = function() {
	myticks = originScale.ticks(7);
        thisLegend.data = d3.range(myticks.length).map(function(n) {
            value =
                {"label":prettyName(myticks[n]),
                 "scaled":thisLegend.sourceScale(myticks[n]),
                 'y':thisLegend.scale(n),
                }
            return(value)
        })
	
        thisLegend.points.remove()
        thisLegend.points = thisLegend.selectAll('circle').data(thisLegend.data,function(d) {return(d.y)})

        thisLegend.points.enter()
            .append('circle')

	thisLegend.points
            .attr('y',function(d) {return(d.y)})
            .attr('cy',function(d) {return(d.y)})
               .attr('height',thisLegend.boxheight)
            .attr('x',thisLegend.xpos)
            .attr('cx',thisLegend.xpos)
                    .attr('width',thisLegend.width)
                    .attr('fill',function(d) {return(d.color)})
            .attr('fill','white')
            .attr('r',function(d) {return(d.scaled)})

        thisLegend.labels
            .remove()

        thisLegend.labels = thisLegend.selectAll('text').data(thisLegend.data,function(d) {return(d.y)})
        thisLegend.labels.enter().append('text')
            .attr('y',function(d) {return(d.y)})//+thisLegend.boxheight/2)})
            .attr('x',thisLegend.xpos + thisLegend.width *1.5)
            .attr('fill','white')
            .text(function(d) {return(d.label)})
        text1 = "Raw Number of Occurrences"
        if (comparisontype()=='comparison') {text1="Uses of both words"}
        thisLegend.append('text').attr('x',thisLegend.xpos).attr('y',thisLegend.yrange[0]-25).text(text1).attr('fill','white')
    }
    return my
}