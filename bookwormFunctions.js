//Here are a bunch of functions that I'm using in the d3 Bookworms.
//Individual applications should only need some of them?

chooseVariable = function(parentNode,nodeName,variableSet,queryPartBeingUpdated,partOfQueryPartBeingUpdated) {
    //This may be a serious piece of wheel-reinvention: essentially, this is a dropdown menu made of svg elements. It could be
    //replaced by some code that actually creates a dropdown menu: my google-foo didn't suffice to find it.
    //The thing being set here is assumed to be two levels deep in query, based on the variableSet.
    //So, for instance, if queryPartBeingUpdated is 'aesthetic' and partOfQueryPartBeingUpdated is 'color', the 'color' aesthetic
    //will be set to whatever element is clicked on when the click is made.
    //if queryPartBeingUpdated is 'groups' and partOfQueryPartBeingUpdated is 0, (the number, not the string), it will be the x axis being
    //updated. And so forth.

    height=300
    boxwidth=150

    removeOverlay = function() {
        d3.selectAll('#overlay')
            .transition()
            .duration(1500)
            .attr('opacity',0)
            .remove();
    }

    bottomLevel
        .append('rect')
        .attr('id','overlay')
        .attr('width',w)
        .attr('height',h)
        .style('fill','white')
        .attr('opacity',0)
        .on('click',function(){
            removeOverlay();
            shutWindow();})
        .transition().duration(1500)
        .attr('opacity',0)

    parentNode.selectAll('.selector').remove()

    dropdown = parentNode
        .append('g')
        .attr('class','selector')
        .attr('id',nodeName)

    dropdown
        .append('rect')
        .attr('width',boxwidth)
        .attr('rx',10)
        .attr('ry',10)
        .attr('x',-boxwidth/2)
        .attr('fill','#DDDDDD')
        .attr('opacity','.98').transition().duration(1000).attr('height',height)

    possibilities = d3.scale.ordinal()
        .range(d3.range(15,height+1, height/variableSet.length))
        .domain(variableSet.map(function(d) {return(d.variable)}))

    labels = dropdown
        .selectAll('text')
        .data(variableSet)

    labels
        .enter()
        .append('text')
        .text(function(d) {return(d.label)})
        .classed("dropdown",true)
        .transition().duration(1000)
        .attr('y',function(d) {
            return(possibilities(d.variable))})
        .attr('x',5)

    shutWindow = function() {
        d3.select('#' + nodeName).selectAll('rect')
            .transition().duration(1000)
            .attr('height',0)
            .transition().remove();
        labels
            .transition().duration(1000)
            .attr('y',0)
            .transition()
            .attr('opacity',0)
            .remove()
    }

    //Overlay box until selection is made.

    labels
        .on('click',function(d) {
            //when clicked, this is going to update something inside the query
            query[queryPartBeingUpdated][partOfQueryPartBeingUpdated] = d.variable
            queryAligner.updateQuery();
            shutWindow()
            removeOverlay()
            currentPlot = myPlot()
            currentPlot()
        })
}

var fillLegendScale;


var drag = d3.behavior.drag()
    .on("drag", function(d,i) {
        d.x += d3.event.dx
        d.y += d3.event.dy
        d3.select(this).attr("transform", function(d,i){
            return "translate(" + d.x + ',' + d.y  + ")"
        })
    });

drawFillLegend = function(scale,origin,height,width) {

    //This either creates, or updates, a fill legend, and drops it on the screen.
    //It returns ???

    // define some defaults
    if (origin===undefined) {
        try{current = svg.selectAll(".color.legend").datum();
            origin = [current.x,current.y] }
        catch(err) {origin = [125,65]}
    }
    if (height===undefined) { height = window.innerHeight - 3*origin[1]; console.log(height) }

    if (width===undefined) { width = 20 }

    //Create a fill legend entry, if it doesn't exist

    fillLegend = d3.select("#svg")
        .selectAll(".color.legend").data([{
            "x":origin[0],"y":origin[1]}])


    fillLegend.enter()
        .append('g')
        .attr('id','fill-legend')
        .classed("legend",true)
        .classed("color",true)
        .attr("transform", function(d,i){
            d.x = origin[0]
            console.log("appending a fill legend")
            return "translate(" + d.x + ',' + d.y  + ")"
        })
        .call(drag)

    fillLegendScale = scale.copy()

    legendRange = d3.range(0,height,by=height/(fillLegendScale.domain().length-1))
    legendRange.push(height)

    fillLegendScale.range(legendRange)

//    fillLegendRects = fillLegend.append("g")

    fillRects = fillLegend.selectAll("#fillLegendRects").data([1])
    fillRects.enter().append("g").attr("id","fillLegendRects")
    console.log(fillRects)
    colorScaleRects = fillRects.selectAll('rect').data(d3.range(0,height))

    colorScaleRects.enter()
        .append("rect")


    colorScaleRects
        .attr({
            width: width,
            height:1,
            y: function(d) { return d},
            fill: function(d) {
                return scale(fillLegendScale.invert(d));
            }
        })

    colorScaleRects.exit().remove()

    //'formatter' pretties the name, and drops certain ticks for
    // a log scale. It's overwritten if it's _not_ a log scale.

    function formatter(d) {
        if (query.scaleType=="log") {
            var x = Math.log(d) / Math.log(10) + 1e-6;
            return Math.abs(x - Math.floor(x)) < .7 ? prettyName(d) : "";
        }
        return prettyName(d)
    }

    colorAxis = fillLegend.selectAll(".color.axis").data([1])
    colorAxis.enter()
        .append("g")
        .attr("id","color-axis")
        .classed("axis",true)
        .classed("color",true)
        .attr("transform","translate (" + (width) + ",0)")

    colorAxisFunction = d3.svg.axis()
        .scale(fillLegendScale)
        .orient("right")
        .tickFormat(formatter)

    //Add bit to change the legend type

    d3.select("#fillLegendScale").remove()

    fillLegend
        .append("text")
        .attr("id","fillLegendScale")
        .text("linear scale")
        .style("fill","white")
        .attr("transform","translate(0," + (height + 25) + ")")
        .on("mouseover",function(d) {
            //make it bold or something to promot clicking.
        })
        .on("click",function(d) {
            current = d3.select(this).text();
            if(current=="log scale") {
                query['scaleType']="linear"
                changeColorScale(d3.scale.linear)
                d3.select("#fillLegendScale").text("linear scale").style("fill","white")
            }
            if(current=="linear scale") {
                query['scaleType']="log"
                changeColorScale(d3.scale.log)
                d3.select("#fillLegendScale").text("log scale").style("fill","white")
            }

        })

    writeTitle()

    colorAxis
        .transition()
        .duration(1000)
        .call(colorAxisFunction)

    //make a title

    titles = fillLegend.selectAll(".axis.title").data([{"label":query["aesthetic"]["color"]}])

    titles.enter().append("text")

    titles
        .attr("id","#colorSelector")
        .attr('transform','translate (0,-10)')
        .classed("axis",true)
        .classed("title",true)
        .text(function(d) {return nameSubstitutions[d.label]})
        .on('click',function(d){
            chooseVariable(fillLegend,"colorSelector",quantitativeVariables,'aesthetic','color')})

    titles.exit().remove()
    writeTitle()

}

writeTitle = function() {
    //Figure out what they're trying to plot, for the title.
    //starredKeys are the numerator in a ratio query.
    starredKeys = d3.keys(query['search_limits']).filter(function(d) {
        return d.search("\\*") > 0
    })

    if (starredKeys.length==0) {try{starredKeys=["word"];
                                    testing = query['search_limits']['word']
                                   } catch(err) {return}}

    text1 = starredKeys.map(function(key) {
        values = query['search_limits'][key].join('"/"')
        var pretty = key.replace("\*","")
        return pretty + ' "' +values + '"'
    }).join(' and ')


    text1 = "Share of " + text1
    if (query['plotType']!="map") {
        text1 = text1.replace("Share","Usage") +  " by " + query['groups'].join(' and ')
    }

    if (comparisontype()=='comparison') {
        text1 = "Usage of '" + query['search_limits']['word'][0] + "'" + " per use of '" + query['compare_limits']['word'][0] + "'"
    }

    title.selectAll('text').remove()
    title
        .append('text')
        .attr('id','colorLegendTitle')
        .attr("class","title")
        .text(text1)
        .attr('transform','translate(10,0)')

}

var fillLegendScale = function() {};

updatePointer=function(inputNumbers) {
    //Update the color pointer to match the input numbers.
    //This is a more general problem than I'm casting it here: it could, say also update a circle

    var pointerSize,pointerColor; //undefined and unused: should be passed to function.

    var barWidth = 20; //Should be dynamic or responsive.
    var pointerWidth = Math.round(barWidth*3/4);

    pointers = svg
        .selectAll('.legend.color')
        .selectAll('.pointer')
        .data([inputNumbers])



    //Also creates a pointer if it doesn't exist yet.
    pointers
        .enter()
        .append('path')
        .attr('transform',"translate(0," + (fillLegendScale(inputNumbers) - pointerWidth)+ ')')
        .classed("pointer",true)
        .attr('d', function(d) {
            var y = 0, x = barWidth-pointerWidth;
            //tikes
            return 'M ' + x +' '+ y + ' l ' + pointerWidth + ' ' + pointerWidth + ' l -' + pointerWidth + ' ' + pointerWidth + ' z';
        })
        .attr("opacity","0")

    //Start invisible: mouseover events will turn it on.

    pointers
        .transition()
        .duration(950)
        .attr('opacity',1)
        .attr('transform',"translate(0," + (fillLegendScale(inputNumbers) -14)+ ')')


    //wait 5 seconds, then clear the diamond.
        .transition()
        .duration(1000)
        .attr('opacity',.9)
        .transition().duration(5000)
        .attr('opacity',0)
        .remove()
}


myPlot = function() {
    updateAxisOptionBoxes()

    d3.selectAll(".chartSpecific").style('display','none')
    d3.selectAll("." + query.plotType).style('display','inline')

    if (query.plotType=='heatMap') {return heatMapFactory() }
    if (query.plotType=='map') {return mapQuery()}
    if (query.plotType=='line') {return linePlot()}
    if (query.plotType=='barPlot') {return barPlot()}

}

createDropbox = function(category) {
    //Drops in a new query box for a categorical value:
    //going to be useful for other applications, but not implemented here. Possibly the first part should just return the data.

    myQuery = JSON.parse(JSON.stringify(query));
    myQuery['search_limits']['word'] = []
    myQuery['groups'] = [category]
    myQuery['counttype'] = ['WordCount','TextCount']

    dat = d3.json(destinationize(myQuery),function(json) {

        myData = parseBookwormData(json,myQuery);
        topChoices = topn(50,category,myData)

        myData.filter(function(entry) {
            return(topChoices.indexOf(entry[category]) > -1 & entry.WordCount > 0)
        })

        myData.sort(function(a,b) {return(a.WordCount<b.WordCount)})

        thisGuy = d3.select("body")
            .append('select').attr('id',category).attr('multiple','multiple')

        thisSelection = thisGuy.selectAll('option').data(myData)
        thisSelection.enter()
            .append('option')
            .attr('value',function(d){
                return d[category]})
            .text(function(d) {
                text = d[category]
                if( d[category]=="") {text = "[value blank]"}
                return text + " (" +prettyName(d.WordCount) + " words in " + prettyName(d.TextCount) + " Texts)"
            })
    })
}

drawMap = function (mapname) {
    mapname = mapname

    my = function() {
        if (mapname!=projection.mapname) {
            maplevel.selectAll('path').remove()
            removeElements()
        }

        sourceJson = "data/bigearth.json"

        if (mapname=="World") {
            projection = d3.geo.equirectangular()
                .scale([280])
                .translate([w/2,h/2])
                .center([0,0])
        }

        if (mapname=="Asia") {
            projection = d3.geo.azimuthalEqualArea()
                .scale([300])
                .center([0,0])
                .translate([700,350])
                .rotate([0,0,0])
        }

        if (mapname=="Europe") {
            projection = d3.geo.albers()
                .center([15,45])
                .parallels([30,55.5])
                .rotate([-10,0])
                .translate([w/2,h/2])
                .scale([d3.min([w,h*2])]);
        }

        if (mapname=="USA") {
            projection = d3.geo.albersUsa()
                .translate([w/2,h/2])
                .scale([d3.min([w,h*2])]);
            sourceJson = "data/us-states.json"
        }

        path = d3.geo.path()
            .projection(projection)

        projection.mapname = mapname

        d3.json(sourceJson, function(json) {
            stateItems = maplevel.selectAll("path")
                .data(json.features)

            stateItems
                .exit()
                .remove()

            stateItems
                .enter()
                .append("path")
                .attr("d", path)
                .attr('fill',"grey")
        });

        return(projection)
    }
    return my
}

x = 1

//var xstuff,ystuff;

linePlot = function() {

    //    iff query aesthetic isn't a counttype, do this:
    //     query['aesthetic']['y'] = 'WordsPerMillion'
    //    }


    if ('undefined' == typeof(query['aesthetic']['x'])) {
        query['aesthetic']['x'] = query['groups'][0]
    }

    if ("undefined" == typeof(query['aesthetic']['group'])) {
        if ("undefined" != typeof(query['groups'][1])) {
            query['aesthetic']['group'] = query['groups'][1]
        }
    }

    queryAligner.alignAesthetic()

    updateChart = function() {
        xstuff = makeAxisAndScale('x')
        ystuff = makeAxisAndScale('y')

        //line charts should start at 0.
        ystuff.axis.scale().domain([ystuff.axis.scale().domain()[0],0])

        x = xstuff.scale
        y = ystuff.scale

        myAxis = d3.select("#paperdiv").append('g').attr('id','y-axis')
            .call(ystuff.axis)

        myAxis
            .classed("axis",true)
            .attr('transform','translate(' +ystuff.limits['x'][0] + ',0)')

        d3.select("#paperdiv").append('g').attr('id','x-axis').call(xstuff.axis)
            .attr('class','axis')
            .attr('transform','translate(0,' + xstuff.limits['y'][1] + ')')


        yaxis = svg.selectAll('.y.axis').data([ystuff.axis])
        xaxis = svg.selectAll('.x.axis').data([xstuff.axis])

        yaxis.enter().append('g')
        xaxis.enter().append('g')

        //put in a new axis node if it isn't there.

        //axis creation/updating.
        yaxis
            .attr('transform','translate(' +ystuff.limits['x'][0] + ',0)')
            .transition()
            .duration(2000)
            .call(ystuff.axis)
            .attr("id","y-axis")
            .attr('class','y axis')

        xaxis
            .attr('transform','translate(0,' + xstuff.limits['y'][1] + ')')
            .transition()
            .duration(2000)
            .call(xstuff.axis
                  //.tickSize(-w,0,0)
                 )
            .attr("id","x-axis")
            .attr('class','x axis')

        //make the lines
        var lineGenerator = d3.svg.line()
            .x(function(d) {
                name = query['aesthetic']['x']

                value = x(plotTransformers[name](d[name]));
                return value})
            .y(function(d) { value = y(plotTransformers[query['aesthetic']['y']](d[query['aesthetic']['y']]));return value })

        nestedData = d3.nest().key(function(d) {return d[query['aesthetic']['group']]}).entries(paperdata)

        points = svg
            .selectAll('.line');

        selection = points
            .data(nestedData,function(d) {return d['key']})

        selection
            .enter()
            .append("path")
            .attr('class','line')

        selection.exit().remove()

        selection
            .transition().duration(2000)
            .attr('d',function(d) {
                return lineGenerator(d.values)})


        selection
            .attr('stroke','#F0E1BD')
            .attr('fill','#F0E1BD')


        selection
            .on('mouseover',function(d) {
                d3.select(this).attr('stroke-width','15')
            })
            .on('mouseout',function(d) {
                d3.select(this).attr('stroke-width','')
            })

        //Make the points

        circles = paperdiv.selectAll('circle.selector').data(paperdata,function(d) {return d[query['aesthetic']['x']]})

        circles.enter().append('circle').attr("class","selector")

        circles.exit().remove()


        //these need to belong to the line somehow.

        circles
            .attr('opacity','.01')
            .on('mouseover',function(d) {d3.select(this).attr('opacity','1')})
            .on('mouseout',function(d) {d3.select(this).attr('opacity','.01')})
            .attr('cx',function(d) {
                name = query['aesthetic']['x']
                return x(plotTransformers[name](d[query['aesthetic']['x']]))})
            .attr('cy',function(d) {return y(parseFloat(d[query['aesthetic']['y']]))})
            .on('click',function(d) {runSearch(d)})
            .attr("r",6)
            .attr('fill','yellow')

    }

    my = function() {
        removeElementsFromOtherPlots(query['plotType'])

        d3.json(destinationize(query),function(json) {


            paperdata = parseBookwormData(json,query);

            //got to be sorted or the line's a mess.
            paperdata.sort(function(a,b) {
                return parseFloat(a[query['aesthetic']['x']] - b[query['aesthetic']['x']])
            })
            updateChart()
        })

    }

    return my
}

function removeElementsFromOtherPlots(geometryName) {
    if (lastPlotted != geometryName) {
        removeElements()
        lastPlotted = geometryName
    }
}

barPlot = function() {
    removeElementsFromOtherPlots("barPlot")

    //cludgy
    if ('undefined' == typeof(query['aesthetic']['color'])) {
        if ('undefined' != typeof(query['groups'][1])) {
            query['aesthetic']['color'] = query['groups'][1]
        }
    }

    if ('undefined' == typeof(query['aesthetic']['x'])) {
        query['aesthetic']['x'] = query['groups'][0]
    }

    queryAligner.alignAesthetic()

    my = function() {
        d3.json(destinationize(query),function(json) {
            paperdata = parseBookwormData(json,query);
            //for this, sort by occurrences

            paperdata.sort(function(a,b) {
                return (
                    parseFloat(a[query['aesthetic']['x']] - b[query['aesthetic']['x']])
                )
            })

            if (typeof(query['aesthetic']['color']) != 'undefined') {
                topColors = topn(5,query['aesthetic']['color'],paperdata)

                paperdata = paperdata
                    .filter(function(d) {
                        return(topColors.indexOf(d[query['aesthetic']['color']]) > -1)
                    })

                topColors.sort()
                colorscale = d3.scale.category10()
                    .domain(topColors)

            } else {colorscale = function(x) {return("white")} }

            //this order matters, because the y-axis is curtailed and can exclude
            //elements from the x-axis. Yikes. That's no good.
            ystuff = makeAxisAndScale('y')
            xstuff = makeAxisAndScale('x')

            x = xstuff.scale
            y = ystuff.scale

            //
            yaxis = svg.selectAll('.y.axis').data([ystuff.axis])
            xaxis = svg.selectAll('.x.axis').data([xstuff.axis])

            yaxis.enter().append('g')
            xaxis.enter().append('g')

            //put in a new axis node if it isn't there.

            //axis creation/updating.
            yaxis
                .attr('transform','translate(' +ystuff.limits['x'][0] + ',0)')
                .transition()
                .duration(2000)
                .call(ystuff.axis)
                .attr("id","y-axis")
                .attr('class','y axis')

            xaxis
                .attr('transform','translate(0,' + xstuff.limits['y'][1] + ')')
                .transition()
                .duration(2000)
                .call(xstuff.axis)
                .attr("id","x-axis")
                .attr('class','x axis')

            points = paperdiv.selectAll('circle')
                .data(paperdata,function(d) {
                    key = d[query['aesthetic']['y']]
                    if (typeof(d[query['aesthetic']['color']]) != undefined) {
                        key = key + d[query['aesthetic']['color']]
                    }
                    return key
                })

            bars = paperdiv
                .selectAll('rect')
                .data(paperdata,function(d) {
                    key = d[query['aesthetic']['y']]
                    if (typeof(d[query['aesthetic']['color']]) != undefined) {
                        key = key + d[query['aesthetic']['color']]
                    }
                    return key
                })

            bars
                .enter()
                .append('rect')
                .classed("plot",true)

            bars.exit().remove()

            bars
                .transition()
                .duration(2000)
                .attr("width",function(d) {
                    return x(d[query['aesthetic']['x']]) - xstuff.limits.x[0]
                })
                .attr('x',xstuff.limits.x[0])
                .attr('y',function(d) {
                    return y(d[query['aesthetic']['y']])
                })
                .attr("height",10)

            addTitles(bars)
            makeClickable(bars)

            //I used to have points in here, too.
            //            points
            //              .enter()
            //            .append('circle')
            //          .classed("plot",true)
            //        .attr("r",5)

            points
                .exit()
                .transition()
                .duration(2000)
                .attr('opacity',0)
                .attr("r",0)
                .remove()

            points
                .style('fill',function(d) {
                    return colorscale(d[query['aesthetic']['color']])})
                .transition()
                .duration(2000)
                .attr('cx',function(d) {
                    return x(d[query['aesthetic']['x']])
                })
                .attr('cy',function(d) {
                    return y(d[query['aesthetic']['y']])
                })

            addTitles(points)
            makeClickable(points)

        })
    }
    return my
}


makeClickable = function(selection) {
    //This can be called on a variety of selections bound
    //to bookworm data; it restyles them to be 'highlit',
    //and adds a function to run a search on click
    //The styles for that particular element have to be set
    //to recognize highlighting in--get this!--the stylesheet.

    toggleHighlighting = function(d,highlitValue) {
        //given an axis and a datum
        ["x","y","color","size"].map(function(axis) {
            f = paperdiv.selectAll("#" + axis + "-axis")
                .selectAll('text')
                .data(
                    //rather than "string", this should take
                    //plotTransformer
                    [String(d[query['aesthetic'][axis]])],
                    function(e) {return(e)}
                )

            //by not entering, this just acts on the
            //existing elements in the axis

            f
                .classed("highlit",highlitValue)
        })
    }

    selection
        .on('mouseover',function(d) {
            d3.select(this).classed("highlit",true)
            //pointer update only works if there is a color
            //aesthetic; otherwise, nothing happens
            updatePointer(d[query['aesthetic']['color']])
            toggleHighlighting(d,true)
        })

        .on('mouseout',function(d) {
            d3.select(this).classed("highlit",false)
            toggleHighlighting(d,false)
        })

        .on('click',function(d) {
            runSearch(d)
        })

}

removeElements = function() {
    //just remove everything from the svg.
    vals = ['rect','text','path','circle','line','tick'].map(
        function(type) {
            svg.selectAll(type).transition().remove()
        }
    )
}

changeColorScale = function(scaleType) {
    newscale = returnScale()
        .values(colorscale.domain())
        .scaleType(scaleType)();

    colorscale=newscale

    currentPlot.updateChart()

}

returnScale = function() {
    var colors = RdYlGn,//greenToRed,
    scaleType = d3.scale.log,
    values = [1,2,3,4,5]

    function my() {
        scale = scaleType().range(colors)
        numbers = d3.extent(values)
        //If we're using a log scale, the minimum can't be zero. So it's 0.1. Or actually a tiny bit less to get .1 inside the range.

        if (scaleType==d3.scale.log) {
            numbers[0] = d3.max([(1/101),d3.min(values)])
        }
        if (comparisontype()=='comparison') {
            // Make it symmetric for ratios.
            outerbound = d3.min([100,d3.max([1/d3.min(values),d3.max(values)])])
            numbers = [1/outerbound,outerbound]
        }
        min = numbers[0]
        max = numbers[1]
        if (scaleType==d3.scale.log) {

            min = Math.log(numbers[0])
            max = Math.log(numbers[1])
            input = d3.range(min,max,(max-min)/(colorscale.range().length-1))
            console.log(input)
            if (input.length < colorscale.range().length) {
                // I think this is a floating point problem; sometimes the top number is included, sometimes not. Add if the list is too short.
                input.push(max)
            }
            console.log(input)
            scale.domain(input.map(function(n) {return(Math.exp(n))}))
        } else if (scaleType==d3.scale.sqrt) {
            scale.domain(d3.range(min,max,(max-min)/(colorscale.range().length-1)).map(function(n) {return(n^2)}))
        } else if (scaleType==d3.scale.linear) {
            scale.domain(d3.range(min,max+max*.0001,(max-min)/(colorscale.range().length-1)).map(function(n) {return(n)}))
        }

        scale.clamp()
        return (scale)
    }

    my.values = function(value) {
        if (!arguments.length) return values;
        values = value;
        return my;
    };

    my.colors = function(value) {
        if (!arguments.length) return colors;
        colors = value;
        return my;
    };

    my.scaleType = function(value) {
        if (!arguments.length) return scaleType;
        scaleType = value;
        return my;
    };
    return my
}

function popitup(url) {
    newwindow=window.open(url,'name','height=640,width=1000');
    if (window.focus) {newwindow.focus()};
    return false;
}


function parseBookwormData(json,locQuery) {
    // Changes the shape of the hierarchical json the API delivers to a flat one with attribute names
    // which takes more space but plays more nicely with d3/javascript. Uses recursion, yuck.

    names = [].concat(locQuery.groups).concat(locQuery.counttype);
    function flatten(hash,prepend) {
        results = Object.keys(hash).map(function(key) {
            newpend = prepend.concat(key)
            if (hash[key] instanceof Array)
            {
                return(newpend.concat(hash[key]))
            }
            else {
                vals = flatten(hash[key],newpend)
                //is this doing anything different from return (vals)?
                return(
                    vals.map(function(array) {
                        return(array)
                    })
                )
            }
        })

        if (results[0][0] instanceof Array) {
            return(results.reduce(function(a,b){return(a.concat(b))}))
        } else {
            return(results)
        }
    }

    function toObject(names, values) {
        var result = {};
        for (var i = 0; i < names.length; i++) {
            result[names[i]] = values[i];}
        return result;
    };

    //run flatten initially with nothing prepended: as it recurses, that will get filled in.
    flat = flatten(json,[]);

    //add the labels.
    results = flat.map(function(localdata){
        return(toObject(names,localdata));
    })
    paperdata = results

    d3.keys(results[0]).map(function(key) {
        updateKeysTransformer(key)
    })
    return(results)
}

variableOptions = {
    //eventually we'll dump the default options--they can just be stored in the database.
    defaultOptions : [
        {"name":"Year","dbname":"year","database":"presidio","type":"time"},
        {"name":"Publication year (5 year rounding)","dbname":"yearchunk","database":"presidio","type":"time"},
        {"name":"Author birth year (5 year rounding)","dbname":"agechunk","database":"presidio","type":"time"},
        {"name":"Author age","dbname":"author_age","database":"presidio","type":"time"},
        {"name":"LC classification","dbname":"classification","database":"presidio","type":"categorical"},
        {"name":"Country","dbname":"country","database":"presidio","type":"categorical"},
        {"name":"Archive","dbname":"archive","database":"archive","type":"categorical"},
        {"name":"School","dbname":"school","database":"HistoryDissTest","type":"categorical"},
        {"name":"Year","dbname":"year_year","database":"HistoryDissTest","type":"time"},
        {"name":"Advisor","dbname":"advisor","database":"HistoryDissTest","type":"categorical"},
        {"name":"Broad Subject","dbname":"BenSubject","database":"presidio","type":"categorical"},
        {"name":"Originating Library","dbname":"library","database":"presidio","type":"categorical"},
        {"name":"Location in Stacks","dbname":"lc2","database":"presidio","type":"categorical"},
        {"name":"Page Number","dbname":"page","database":"ChronAm","type":"categorical"},
        {"name":"Paper Name","dbname":"paper","database":"ChronAm","type":"categorical"},
        {"name":"State","dbname":"state","database":"ChronAm","type":"categorical"},
        {"name":"Census Region","dbname":"region","database":"ChronAm","type":"categorical"},
        {"name":"Calendar Date","dbname":"date_day_year","database":"ChronAm","type":"time"},
        {"name":"Calendar Date (by week)","dbname":"date_week_year","database":"ChronAm","type":"time"},
        {"name":"Date (monthly resolution)","dbname":"date_month","database":"ChronAm","type":"time"},
        {"name":"Date (yearly resolution)","dbname":"date_year","database":"ChronAm","type":"time"},
        {"name":"Publication Month","dbname":"month","database":"arxiv","type":"time"},
        {"name":"Archive section","dbname":"archive","database":"arxiv","type":"categorical"},
        {"name":"Subject Classification (narrower)","dbname":"subclass","database":"arxiv","type":"categorical"},
        {"name":"Submitter top-level e-mail domain","dbname":"tld","database":"arxiv","type":"categorical"},
        {"name":"Submitter lower-level e-mail domain","dbname":"mld","database":"arxiv","type":"categorical"}
    ]
    ,
    options : [],
    update : function(database,followupFunction) {
        variableOptions.options = []
        localQuery = {"method":"returnPossibleFields","database":database}
        d3.json(destinationize(localQuery), function(error, json) {
            if (error)        console.warn(error);
            variableOptions.defaultOptions.map(
                function(row) {
                    variableOptions.options.push(row)
                })
            json.map(function(row) {
                row['database'] = query['database']
                variableOptions.options.push(row)
            })

            variableOptions.options = variableOptions.options.filter(function(row){
                if (row.database==query.database ) return true
            })

            followupFunction()

        });
    }
}

updateAxisOptionBoxes = function() {

    updateQuantitative = function() {
        axes = d3.selectAll(".metric.options")
        selected = axes.selectAll('option').data(quantitativeVariables)
        selected.exit().remove()
        selected.enter().append('option')
        selected.attr('value',function(d) {return(d.variable)})
            .text(function(d) {return d.label})

    }

    followup = function() {
        axes = d3.selectAll(".categorical.options")
        axes.selectAll('option').remove()

        selected = axes
            .selectAll('option')
            .data(variableOptions.options)
        selected
            .exit()
            .remove()

        selected.enter().append('option')

        selected
            .attr('value',function(d) {return d.dbname})
            .text(function(d) {return d.name})



        queryAligner.updateQuery()
    }
    // Find out the relevant options from the database, then run this.
    variableOptions.update(query['database'],followup)

    updateQuantitative()


}



updateKeysTransformer = function(key) {
    //This is called for its side-effect: assigning a function to each key in plotTransformers

    //That function will--for example--take a date and reformat it as a javascript date object.
    //default behavior: return the value as is.

    //That's necessary because date-time scales use the date-time objects, not the raw text.

    queryAligner.alignAesthetic()

    plotTransformers[key] = function(key) {return(key)}
    dataTypes[key]="Categorical"
    //if a date: return a dateTime object
    isADate = false
    key.split("_").map(function(part) {
        //I'm just coming up with descriptions, here.
        if (['year','month','day','week','decade','century',"Year","Decade","yearchunk"].indexOf(part) >=0) {isADate=true}
    })

    if (isADate) {
        plotTransformers[key] = function(originalValue) {
            datedValue = new Date()
            //This code could be useful in the other Bookworm.
            extractRelevantField = function(dateKey) {
                output = undefined
                key.split("_").reverse().map(function(phrase) {
                    //The first date phrase to appear is the one we're using.
                    if (['year','month','day','week','decade','century',"Year","Decade","yearchunk"].indexOf(phrase) >=0) {output=phrase}
                })
                return output
            }

            relevantField = extractRelevantField(key)
            if (['day','week'].indexOf(relevantField) >=0) {
                datedValue.setFullYear(1,0,originalValue)
            } else if (['month'].indexOf(relevantField) >=0) {
                datedValue.setFullYear(1,-1,originalValue)
            } else {
                datedValue.setFullYear(originalValue,1,1)
            }
            return datedValue
            //originalValue = datedValue
        }
        dataTypes[key]="Date"
        return

    }

    //if numeric: return a numeric object
    //iterate through all the values, and give up once hitting a non-numeric value
    for (var i =0; i < paperdata.length; i++) {
        entry = paperdata[i]
        d = entry[key]
        if (isNaN(d) & d!="" & d!="None") {
            //console.log("giving up on" + d)
            return
            break
        }
    }

    plotTransformers[key] = function(originalValue) {
        return parseFloat(originalValue)
    }
    dataTypes[key]="Numeric"
}

function comparisontype() {
    //This just tells various functions whether it's using a log scale centered around 1 (for comparisons between two words) or some other type of scale.
    //Maybe this function should also match up constraints between the two?
    //There are some differences in the legends and the titles depending if we're comparing to all
    //books or to certain ones. This should be useful for that.
    if ('aesthetic' in query) {
        //This should just test length, not for this particular key as it does.
        if (
            (query['aesthetic']['color'] == 'WordsRatio')
                |
                (query['aesthetic']['color']=='TextRatio')
        ) {
            return('comparison');
        }
    } else {return("absolute")}
}


queryAligner = {
    //This ensures constancy among the various UI elements that can update the query

    //Destinations stores where different boxes are supposed to write to.

    updateQuery: function (selection) {
        if (typeof(selection) == "object") {
            //if nothing is passed, move on

            //update the query based on the selection:
            value = selection.property('value')
            bindTo = selection.attr('bindTo')
            if (typeof(eval(bindTo))=='string') {
                //So we don't have to store strings as quoted json;
                //note this means numbers are passed as strings
                //That shouldn't matter for SQL evaluation.
                value = JSON.stringify(value)
            }
            //reassign the element in the Dom.
            eval (bindTo + ' = ' + value)
        } else {selection = d3.select('body')}//just so it's there next time round

        //update based on the aesthetics
        queryAligner.alignAesthetic()

        //update all listening boxes based on the query


        needsUpdate = d3.selectAll("[bindTo]")
        needsUpdate = needsUpdate.filter(function(d) {
            if (selection[0][0] === d3.select(this)[0][0])
            { return false}

            return true
        })
        needsUpdate
            .property('value', function() {
                try{
                    value = eval(d3.select(this).attr("bindTo"))
                    if (typeof(value)=="object") {
                        return(js_beautify(JSON.stringify(value)))
                    }
                    return(value)}
                catch(err) {return(err.message)}
            })
    },

    alignAesthetic: function() {
        //pushes the aesthetic values into the appropriate boxes.

        //back compatability: this block can be erased eventually,
        //it just makes some of Ben's old links works.
        {
            if (typeof(query['aesthetic']['x']) == 'undefined') {
                if (typeof(query['groups']) != 'undefined') {
                    query['aesthetic']['x'] = query['groups'][0]}
            }

            if (typeof(query['aesthetic']['y']) == 'undefined') {
                query['aesthetic']['y'] = query['groups'][1]
            }
        }

        //begin the real big.
        counttypes = {}
        groups     = {}
        if ('aesthetic' in query) {
            aesthetics = d3.keys(query['aesthetic'])

            aesthetics.map(function(aesthetic) {
                possibleQuants = quantitativeVariables
                    .map(function(counttype) {return counttype.variable})
                if (possibleQuants.indexOf(query['aesthetic'][aesthetic]) > -1) {
                    counttypes[query['aesthetic'][aesthetic]] = 1
                } else {
                    groups[query['aesthetic'][aesthetic]] = 1
                }
            }
                          );
            query['counttype'] = d3.keys(counttypes);
            query['groups'] = d3.keys(groups)
        }
    }
}

topn = function(n,key,dataset) {
    //passed a full, parsed dataset, this filters by 'key' down to only the top n items. Useful for long-tail categorical distributions.
    vals = d3.nest().key(function(d) {return(d[key]);}).entries(dataset)
    perm = vals.map(function(val) {
        val.total = d3.sum(val.values,function(d) {return(d[query['aesthetic']['filterByTop']])})
        return(val)
    })
    perm.sort(function(a,b) {return(b.total-a.total)})
    terms = perm.map(function(a) {return(a.key)})
    return(
        terms.slice(0,n)
    )
}


prettyName = function(number) {
    if (comparisontype()!='comparison') {
        suffix = ''
        switch(true) {
        case number>=1000000000:
            number = number/1000000000
            suffix = 'B'
            break;
        case number>=1000000:
            number = number/1000000
            suffix = 'M'
            break;
        case number>=1000:
            number = number/1000
            suffix = 'K'
            break;
        }
        if (number < .1) {
            return(Math.round(number*100)/100+suffix)
        }
        return(Math.round(number*10)/10+suffix)
    }
    if (comparisontype()=='comparison') {
        if (number >= 1) {return(Math.round(number)) + ":1"}
        if (number < 1) {return("1:" + Math.round(1/number))}
    }
}

drawSizeLegend = function(scale,origin,height,width) {

    //This either creates, or updates, a fill legend, and drops it on the screen.
    //It returns ???

    // define some defaults
    if (origin===undefined) { origin = [73,132] }
    //    if (height===undefined) { height = 300 }
    //    if (width===undefined) { width = 20 }

    sizeAxis = d3.svg.axis()
        .scale(sizescale)
        .orient("right")
        .tickValues(function() {
            nestedScale = d3.scale.linear()
                .range(nwords.range())
                .domain(nwords.range());
            nestedScale.nice();
            return nestedScale.ticks(6).map(function(n) {return nwords.invert(n)})
        })
        .tickFormat(prettyName)

    sizeLegend = svg.selectAll(".legend.size").data([{"x":origin[0],"y":origin[1]}])

    sizeLegend
        .enter()
        .append('g')
        .attr("id","sizeLegend")
        .attr('transform','translate('+ origin[0] + ',' + origin[1] + ')')
        .classed("legend",true)
        .classed("size",true)

    sizeLegend
        .call(drag)


    sizeAxes = sizeLegend.selectAll(".axis").data([1])

    sizeAxes.enter().append('g').classed("axis",true)

    sizeAxes
        .call(sizeAxis)

    sizescale.ticks(6)

    sizeLegendPoints = sizeLegend.selectAll('circle').data(sizeAxis.tickValues()())

    sizeLegendPoints.enter().append('circle')
        .attr('r',function(d) {return sizescale(d)/2 })
        .attr('stroke','white')
        .attr('fill','white')
        .attr('opacity',.2)
        .attr('transform',function(d) {
            return('translate(0,' + sizescale(d)/2+')')
        })

    sizeLegend.selectAll(".axis.title").remove()

    sizeLegend
        .append('text')
        .attr('transform','translate(0,-10)')
        .classed("axis",true)
        .classed("title",true)
        .attr("id","sizeSelector")
        .text(nameSubstitutions[query['aesthetic']['size']])
        .on('click',function(d){chooseVariable(sizeLegend,"sizeSelector",quantitativeVariables,'aesthetic','size')})
}


function destinationize(query) {
    //Constructs a cgi-bin request to local host.
    //Can be used with runSearch and searchWindow (below);
    //Or to get other things, like lists of variables.
    return( "/cgi-bin/dbbindings.py/?queryTerms=" + encodeURIComponent(JSON.stringify(query)))
};


runSearch = function(d) {
    //takes an element that has attributes corresponding to groups:
    //opens up a search window with the full query restrictions, plus the particular restrictions
    //for which it is grouped.
    myQuery = JSON.parse(JSON.stringify(query))
    myQuery['groups'].map(function(group) {
        myQuery['search_limits'][group] = [d[group]]
    })
    searchWindow(myQuery)
}

searchWindow = function(local) {
    //This takes a query string and opens up a new window with search results. Pretty bare-bones for now, but could be a lot, lot better.
    local.method="search_results"
    url = destinationize(local)
    var newWindow = window.open('');
    var newWindowRoot = d3.select(newWindow.document.body);
    d3.json(url,function(data){
        var table = newWindowRoot.append('table');
        var rows = table.selectAll('tr')
            .data(data);
        rows.enter().append('tr');
        rows.html(function(d) { return d; });
    })
}

function mapQuery() {
    //Draws a map chart.


    //set up some needed fields
    query['aesthetic']['x'] = "lng"
    query['aesthetic']['y'] = "lat"

    if (typeof(query['aesthetic']['size'])=="undefined") {
        query["aesthetic"]["size"] = "WordCount"
    }

    if (typeof(query['aesthetic']['color'])=="undefined") {
        query["aesthetic"]["size"] = "WordsPerMillion"
    }

    var myQuery = query

    var baseMap = drawMap(document.getElementById('mapChoice').value)
    var initialOpacity = .7

    //allow multiple circles on the same point?
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

        paperdata.sort(function(a,b) {
            return(b[query['aesthetic']['size']]-a[query['aesthetic']['size']])} );

        var mypoints = paperdiv.selectAll('circle')
            .data(paperdata,function(d) {return([d.lat,d.lng])});

        mypoints
            .enter()
            .append('circle')
            .classed("plot",true)
            .classed("hidden",true)
            .attr('r',0)

        mypoints
            .attr('transform',function(d) {

                coords = projection([d.lng,d.lat]);
                //disappear if it doesn't fit.
                if (coords===null) {return "scale(0)"}
                return "translate(" + coords[0] +","+ coords[1] + ")"})

        makeClickable(mypoints)

        mypoints.classed("hidden",false)
        addTitles(mypoints)

        mypoints
            .transition()
            .duration(2500)
            .attr('r',function(d) {
                return sizescale(d[query['aesthetic']['size']])/2
                //Divided by two b/c the scale wants to return diameter, not radius.
            })
            .style('fill',function(d) {
                return colorscale(d[query['aesthetic']['color']])
            })


        mypoints
            .exit()
            .transition()
            .duration(2500)
            .attr('r',0)
            .remove()

        drawFillLegend(colorscale)

        drawSizeLegend(sizescale);
    }

    my.updateChart=updateChart

    function my() {
        mapTransition()

        if (lastPlotted != 'map') {
            lastPlotted = 'map'
            removeElements()
        }
        projection = baseMap()
        queryAligner.updateQuery()

        d3.json(destinationize(query),function(json) {
            paperdata = parseBookwormData(json,query);

            values = paperdata.map(function(d) {return(d[query['aesthetic']['color']])});

            colorscale = colorScaler.values(values).scaleType(d3.scale[query['scaleType']])()

            sizes = paperdata.map(function(d) {return(d[query['aesthetic']['size']])});

            sizescale.domain(d3.extent(sizes))
                .range([0,100])

            sizescale.nice()
            updateChart()
        })
    }

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


makeAxisAndScale = function(axis,limits) {
    if ('undefined'==typeof limits) {
        limits = {'x':[w*.1,w*.66],'y':[75,h*.95]}
    }

    variableName = query['aesthetic'][axis]

    vals = d3.nest()
        .key(function(d) {
            return d[variableName]
        }
            )
        .entries(paperdata).map(function(d) {
            //Some variables will have transformers defined for them
            //that (for example) turn a year into a date.
            //It would perhaps be better to build the transformers
            //straight into the scales, but I don't know how.

            transformer = plotTransformers[variableName]
            if ('undefined'==typeof transformer) {
                return d
            } else {
                m = (transformer(d.key))
                return(m)
            }
        })

    datatype = dataTypes[variableName]


    if (datatype=="Categorical") {
        n = function() {
            //home many elements to display depends on the width: no more than ten pixels
            //vertically, and 30 pixels horizontally
            if (axis=='y') {minSize=11}
            if (axis=='x') {minSize=100}
            return Math.round((limits[axis][1]-limits[axis][0])/minSize)
        }()

        names = topn(n,variableName,paperdata)

        paperdata = paperdata.filter(function(entry) {
            return(names.indexOf(entry[variableName]) > -1)
        })
        //order by the names by defaut.
        names.sort()
        vals = names
        scale = d3.scale.ordinal().domain(vals).rangeBands(limits[axis])
        pointsToLabel = vals
        thisAxis = d3.svg.axis()
            .scale(scale)
        scale.pixels = (limits[axis][1]-limits[axis][0])/vals.length;
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

        //the binwidth should be minimum difference between points.
        differences = [];
        for (var i = 0; i < (vals.length-1); i++) {
            differences.push(Math.abs(vals[i+1]-vals[i]));
        };
        binwidth = d3.min(differences)
        binsneeded = (d3.max(vals) - d3.min(vals))/binwidth + 1

        pixels = (limits[axis][1]-limits[axis][0])/binsneeded;

        domain = d3.extent(vals)

        if (axis=='y') {
            //because svg is defined from the upper right corner,
            //but we want lower numbers lower.
            domain.reverse()
        }
        scale = d3.scale.linear().domain(domain).range([limits[axis][0],limits[axis][1]-pixels])
        thisAxis = d3.svg.axis()
            .scale(scale)
            .tickFormat(d3.format('g'))
            .tickSubdivide(1)
        scale.pixels = pixels

    }

    if (datatype=="Date") {
        console.log(axis + " is date")
        if (axis=='x') {
            vals.sort(function(a,b){return(a-b)})
        }
        if (axis=='y') {
            vals.sort(function(a,b){return(b-a)})
        }
        pixels = (limits[axis][1]-limits[axis][0])/vals.length;
        scale = d3.time.scale().domain(d3.extent(vals)).range([limits[axis][0],limits[axis][1]-pixels])
        thisAxis = d3.svg.axis()
            .scale(scale)
            .tickSubdivide(1)
        scale.pixels = pixels
    }


    if (axis=='x') {
        thisAxis = thisAxis.orient("bottom")
    }

    if (axis=='y') {
        thisAxis = thisAxis.orient("left")
    }

    return({"scale":scale,"axis":thisAxis,"datatype":datatype,"limits":limits})
}



function heatMapFactory() {
    var limits = {'x':[w*.1,w*.75],'y':[75,h*.95]}
    var myQuery = query
    var colorScaler = returnScale()
    var sizeScaler  = returnScale()

    function updateChart() {


        xstuff = makeAxisAndScale('x')
        xAxis = xstuff.axis.orient("top")
        x = xstuff.scale

        ystuff = makeAxisAndScale('y')
        yAxis = ystuff.axis.orient("right")
        y = ystuff.scale

        offsets = {'Date':.5,'Categorical':0,'Numeric':.5}
        //yaxis

        d3.selectAll('#y-axis').remove()
        paperdiv.append("g")
            .attr('id','y-axis')
            .call(yAxis)
            .attr("class","axis")
            .attr("transform","translate(" + (x.pixels+limits['x'][1])  +"," + (y.pixels*offsets[ystuff.datatype]) + ")")

        //x-axis
        d3.selectAll('#x-axis').remove()

        paperdiv.append("g")
            .attr('id','x-axis')
            .call(xAxis)
            .attr("class","axis")
            .attr("transform","translate("+x.pixels*offsets[xstuff.datatype]+ "," + (limits['y'][0])  +")")

        //Key the data against the actual interaction it is,
        //so transitions will work.
        paperdata = paperdata.map(function(d) {
            d.key = d[myQuery['aesthetic']['x']] + d[myQuery['aesthetic']['y']]
            return(d)
        })

        colorValues = paperdata.map(function(d) {return(d[query['aesthetic']['color']])})
        colorscale = colorScaler.values(colorValues).scaleType(d3.scale[query['scaleType']])()

        gridPoint = paperdiv.selectAll('rect')
            .data(paperdata,function(d) {
                return(d.key)
            })

        gridPoint
            .enter()
            .append('rect')
            .classed('plot',true)
            .style("fill","black")

        gridPoint.exit().transition().duration(1000)
            .style('opacity',0)
            .remove()
        xVariable = myQuery['groups'][0]
        yVariable = myQuery['groups'][1]


        gridPoint
            .attr('x',function(d) {return x(plotTransformers[xVariable](d[xVariable]))})
            .attr('y',function(d) {return Math.round(y(plotTransformers[yVariable](d[yVariable])))})
            .attr('height', y.pixels)
            .attr('width', x.pixels)
            .transition()
            .duration(2500)

            .style('fill',function(d) {
                color = colorscale(d[query['aesthetic']['color']]);
                if (d[query['aesthetic']['color']]==0) {color='#393939'}
                if (color=="#000000") {color='#393939'}
                return color;
            })

        makeClickable(gridPoint)
        addTitles(gridPoint)
        drawFillLegend(colorscale)


    }
    my.updateChart = updateChart
    function my() {
        //fix this to use the new method

        if (lastPlotted != 'heatMap') {
            lastPlotted = 'heatMap'
            removeElements()
        } else {
            paperdiv.selectAll('rect').transition().duration(2500).attr('opacity',0)
            paperdiv.selectAll(".axis").selectAll('text').remove()
        }
        paperdiv.call(drag)

        queryAligner.updateQuery()

        d3.json(destinationize(query),function(json) {

            paperdata = parseBookwormData(json,query);

            updateChart()
        })

    }

    return my
}


addTitles = function(selection) {
    selection.selectAll('title').remove()
    selection
        .append("svg:title")
        .text(function(d) {

            //the first line tells them to click:
            text = ["Click to search for top hits",""]
            variables = [];

            //Then display all relevant count information
            for (key in query['aesthetic']) {
                variables.push(query['aesthetic'][key]);
            }
            variables = variables.filter(
                function(e) {
                    return typeof(nameSubstitutions[e]) != "undefined"
                })
            variables.map(function(variable) {
                text.push(
                    nameSubstitutions[variable] + ": " +
                        prettyName(d[variable]))
            })
            return(text.join('                     \t\n'))
        });

}

function encode_as_img_and_link(){
    // Add some critical information
    //$("svg").attr({ version: '1.1' , xmlns:"http://www.w3.org/2000/svg"});

    var svg = d3.select("#svg").html();
    var b64 = Base64.encode(svg);

    // Works in recent Webkit(Chrome)
    $("body").append($("<img src='data:image/svg+xml;base64,\n"+b64+"' alt='file.svg'/>"));

    // Works in Firefox 3.6 and Webit and possibly any browser which supports the data-uri
    $("body").append($("<a href-lang='image/svg+xml' href='data:image/svg+xml;base64,\n"+b64+"' title='file.svg'>Download</a>"));
}