function heatMap() {

    xlim = [100,900]
    ylim=[75,690]

    updateQuery()
    webpath = destinationize(query);
    console.log(webpath);

    //make the graphic
    group1 = query['groups'][0]
    group2 = query['groups'][1]

    if (query.plotType != heatMap) {
        query.plotType = 'heatMap'
        svg.selectAll('circle').remove()
        svg.selectAll('path').remove()
        svg.selectAll('text').remove()
    }


    // load in the data

    d3.json(webpath,function(json) {
        paperdata = parseBookwormData(json,query);

        //Frequency stats are calculated from raw data here.
        if (comparisontype()=='comparison') {
            // This probably isn't the best place to do this: what is?
            paperdata = paperdata.map(function(d) {d.CompareWords = d.TotalWords; d.TotalWords = d.WordCount+d.TotalWords;return(d)})
        }

        values = paperdata.map(function(d) {return(d.WordCount/d.TotalWords)});
        totals = paperdata.map(function(d) {return(d.TotalWords)});

        numbers = d3.extent(values)
        numbers[0] = d3.max([(1/10)/1000000,d3.min(values)])

        if (comparisontype()=='comparison') {
            outerbound = d3.min([100,d3.max([1/d3.min(values),d3.max(values)])])
            numbers = [1/outerbound,outerbound]
            colorscale = logcolors
        }

        min = Math.log(numbers[0])
        max = Math.log(numbers[1])

        colorscale.domain(d3.range(
            min,
            max,
            (max-min)/colorscale.range().length).map(function(n) {return(Math.exp(n))}))

        rescaler = colors.copy();
        rescaler.range([0,1]);
        rescaler.domain([numbers[0],numbers[1]]);
        evenbreaks = d3.range(colorscale.range().length)
            .map(function(fraction) {
                return(rescaler.invert((fraction/colorscale.range().length)))}
                );
        colorscale.domain(evenbreaks)

        //colorscale.nice()

        nwords.domain(d3.extent(totals))
        //nwords.nice()


        //This gets a list for each dimension of what data we have.
        years = d3.nest().key(function(d) {return(d[query['groups'][1]]);}).entries(paperdata).map(function(d) {return(d.key)})
        xnames = d3.nest().key(function(d) {return(d[query['groups'][0]]);}).entries(paperdata).map(function(d) {return(d.key)})

        //filter out elements of the array
        xnames = topn(50,query['groups'][0],paperdata)
        paperdata = paperdata.filter(function(entry) {
            return(xnames.indexOf(entry[group1]) > -1)
        })

        //set up scales.
        years.sort()
        xnames.sort()

        x = d3.scale.ordinal().domain(years).rangeBands(xlim);
        y = d3.scale.ordinal().domain(xnames).rangeBands(ylim);

        //set up axes
        ylegendData = xnames.map(function(d) {return({"label":d,"y":y(d)+y.rangeBand()*.9,"x":xlim[1]})})
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

        xlegendData = years.map(function(d) {
            objectb = {"year":d,"y":ylim[0]-5,"x":x(d) - 13};
            if (objectb.year != Math.round(objectb.year/5)*5) {objectb.year=""};
            return(objectb);
        })

        xpoints = xaxis
            .selectAll('text')
            .data(xlegendData,function(d) {return(d[group2])})

        xpoints
            .enter()
            .append('text')
            .attr('fill','white')
            .attr('x',function(d) {return(d.x)})
            .attr('y',function(d) {return(d.y)})
            .attr("font-family", "sans-serif")
            .attr("font-size", "13px")
            .attr("fill", "white")
            .text(function(d) {return(d.year)})

        //stupid, but don't want to change the underlying function.

        paperdata.sort(function(d) {return(d.value)} );

        //        paperdiv.selectAll('rect').remove()

        var gridPoint = paperdiv.selectAll('rect')
            .data(paperdata,function(d) {return(d.state)})
        gridPoint.exit().remove()

        gridPoint
            .enter()
            .append('rect')
            .on('click',function(d) {
                console.log(d)
                searchTemplate = JSON.parse(JSON.stringify(query))
                searchTemplate['search_limits'][group2] = [d[group2]]
                searchTemplate['search_limits'][group1] = [d[group1]]
                //popitup('/ChronAm/#?' + encodeURIComponent(JSON.stringify(searchTemplate)))
                searchWindow(searchTemplate)
            })
            .attr('opacity','1')
            .attr('stroke-width',0)
            .attr('stroke','black')
            .attr('onmouseover', "evt.target.setAttribute('stroke-width','2');")
            .attr('onmouseout',  "evt.target.setAttribute('stroke-width','0');")
            .attr('x',function(d) {return(x(d[query['groups'][1]]))})
            .attr('y',function(d) {return(y(d[query['groups'][0]]))})
            .transition()
            .duration(2500)
            .attr('fill',function(d) {
                if (comparisontype()=='comparison') {
                    return(colorscale(d.WordCount/d.CompareWords))}
                else {return(colorscale(d.WordCount/d.TotalWords))}
            })

            .attr('height', y.rangeBand()*.985)
            .attr('width', x.rangeBand()*.985)

        gridPoint
            .append("svg:title")
            .text(function(d) { return ('Click for texts (value is ' + Math.round(d.WordCount/d.TotalWords*1000000*100)/100) + ')'});

        gridPoint.exit().transition(1000).remove()
        makeFillLegend();
    })
}