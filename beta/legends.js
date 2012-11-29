makeFillLegend = function () {
    colorLegend.yrange = [75,500]
    colorticks = colorscale.ticks();

    colorLegend.boxheight = (colorLegend.yrange[1]-colorLegend.yrange[0])/colorticks.length +1.5
    colorLegend.width = 25
    colorLegend.xpos  = 10
    colorLegend.plot = true
    colorLegend.title = "Per Million Words"
    colorLegend.colorpoints = colorLegend.selectAll('rect')
    colorLegend.colorlabels   = colorLegend.selectAll('text')

    colorLegend.scale = d3.scale.linear().range(colorLegend.yrange).domain(d3.extent(d3.range(colorticks.length)))

    colorLegend.update = function() {
        colorLegend.data = d3.range(colorticks.length).map(function(n) {
            value =
                {"label":prettyName(colorticks[n]*1000000),
                 "color":colorscale(colorticks[n]),
                 'y':colorLegend.scale(n)
                }
            if (comparisontype()=='comparison') {
                value.label = prettyName(colorticks[n])
            }
            return(value)
        })

        colorLegend.colorpoints.remove()
        colorLegend.colorpoints = colorLegend.selectAll('rect').data(colorLegend.data,function(d) {return(d.y)})
        colorLegend.colorpoints.enter().append('rect')
            .attr('y',function(d) {return(d.y)})
            .attr('height',colorLegend.boxheight)
            .attr('x',colorLegend.xpos)
            .attr('width',colorLegend.width)
            .attr('fill',function(d) {return(d.color)})

        colorLegend.colorlabels
            .remove()

        colorLegend.colorlabels = colorLegend.selectAll('text').data(colorLegend.data,function(d) {return(d.y)})

        colorLegend.colorlabels.enter().append('text')
            .attr('y',function(d) {return(d.y+colorLegend.boxheight*.9)})
            .attr('x',colorLegend.xpos + colorLegend.width *1.5)
            .attr('fill','white')
            .text(function(d) {return(d.label)})

        text1 = "Usage of '" + query['search_limits']['word'][0] + "'" +   " per Million Words"
        if (comparisontype()=='comparison') {
            text1 = "Usage of '" + query['search_limits']['word'][0] + "'" + " per use of '" + query['compare_limits']['word'][0] + "'"
        }
        colorLegend.append('text').attr('x',colorLegend.xpos+75).attr('y',colorLegend.yrange[0]-25).text(text1).attr('fill','white').attr('font-size',35).attr('font-family',"Arial")
    }
    thisLegend = colorLegend
    thisLegend.update()
}

makeSizeLegend = function() {
    thisLegend = sizeLegend

    thisLegend.sourceScale = sizescale
    myticks = thisLegend.sourceScale.ticks(5);
    thisLegend.yrange = [300,500]
    thisLegend.boxheight = (thisLegend.yrange[1]-thisLegend.yrange[0])/myticks.length +1.5
    thisLegend.width = 25
    thisLegend.xpos  = 1500-100
    thisLegend.plot = true
    thisLegend.title = "Total size of corpus"
    thisLegend.points = thisLegend.selectAll('circle')
    thisLegend.labels = thisLegend.selectAll('text')

    thisLegend.scale = d3.scale.linear()
        .range(thisLegend.yrange)
        .domain(d3.extent(d3.range(myticks.length)))

    console.log(myticks);

    thisLegend.update = function() {
        thisLegend.data = d3.range(myticks.length).map(function(n) {
            console.log(myticks[n])
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
        //            .attr('height',thisLegend.boxheight)
            .attr('x',thisLegend.xpos)
            .attr('cx',thisLegend.xpos)
        //            .attr('width',thisLegend.width)
        //            .attr('fill',function(d) {return(d.color)})
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
        text1 = "Total words in corpus"
        if (comparisontype()=='comparison') {text1="Uses of both words"}
        thisLegend.append('text').attr('x',thisLegend.xpos).attr('y',thisLegend.yrange[0]-25).text(text1).attr('fill','white')
    }
    thisLegend = sizeLegend
    thisLegend.update()
}