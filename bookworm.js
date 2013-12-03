//first, a behavior called "drag" is defined; this is super-optional.
//Then the d3.selection prototype is expanded to allow clicks bound t data.
//Finally, a class "Bookworm" is defined, essentially, based on a function
//and a huge object with various methods which include charts, and so forth.

var drag = d3.behavior.drag()
    .on("drag", function(d,i) {
        d.x += d3.event.dx
        d.y += d3.event.dy
        d3.select(this).attr("transform", function(d,i){
            return "translate(" + d.x + ',' + d.y  + ")"
        })
    });

d3.selection.prototype.makeClickable = function() {
    //This can be called on a variety of selections bound
    //to bookworm data; it restyles them to be 'highlit',
    //and adds a function to run a search on click
    //The styles for that particular element have to be set
    //to recognize highlighting in--get this!--the stylesheet.
    //I'll be an HTML 5 programmer yet.

    selection=this;

    toggleHighlighting = function(d,highlitValue) {
        //given an axis and a datum
        ["x","y","color","size"].map(function(axis) {
            f = mainPlotArea.selectAll("#" + axis + "-axis")
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
            if (query['aesthetic']['color']) {
                updatePointer(d[query['aesthetic']['color']])
            }
            toggleHighlighting(d,true)
        })

        .on('mouseout',function(d) {
            d3.select(this).classed("highlit",false)
            toggleHighlighting(d,false)
        })

        .on('click',function(d) {
            BookwormClasses.runSearch(d)
        })

    return selection
}


BookwormClasses = {
    //Here are a bunch of functions that I'm using in the d3 Bookworms.
    //Individual applications should only need some of them?
    nothing: function() {},

    updateData: function(callback,append) {
        //callback is a string relative to the layer we're working with here.

        callback = callback || "nothing"
        append = append || false;
        var bookworm = this;
        destination = ( "/cgi-bin/dbbindings.py/?queryTerms=" + encodeURIComponent(JSON.stringify(this.query)))

        d3.json(destination, function(error,data) {

            console.log(destination);
            if (error) {
                console.log("error parsing JSON: " + console.log(error))
                console.log(destination)
            }
            //Unless concatting, it should start from nothing.
            if (!append) {
                bookworm.data=bookworm.parseBookwormData(data,bookworm.query)
            }
            if (append) {
                if (bookworm.data===undefined) {bookworm.data=[]}
                bookworm.data = bookworm.data.concat(bookworm.parseBookwormData(data,bookworm.query))
            }
            console.log(bookworm.query.groups)


            bookworm[callback]()
        })
    },

    nestData : function() {
        //Find all the aesthetics with a level number.
        var bookworm = this;
        levels = d3.keys(bookworm.query.aesthetic).filter(function(d) {return /level/.test(d)})
        levels.sort()
        levels.pop() //Don't need to nest the last level
        nest = d3.nest()

        levels.forEach(function(level) {
            nest.key(function(d) {
                return(d[bookworm.query.aesthetic[level]])}).sortKeys(d3.ascending)
        })

        output =  {
            "key":"root",
            "values":nest.entries(bookworm.data)
        };
        return output;
    },

    serverSideJSON : function () {

        //returns only the query elements that actually matter to the server.
        //useful for seeing if the query needs to be rerun, or if all changes
        //can be handled client-side.

        var query = JSON.parse(JSON.stringify(this.query))
        delete(query.aesthetic)
        delete(query.scaleType)
        delete(query.plotType)
        return JSON.stringify(query);

    },

    updatePlot : function() {

        var bookworm = this;

        //housekeeping;

        bookworm.alignAesthetic()

        bookworm.updateQuery()
        //test if the query has changed since the last update;
        //string equality is not exactly the correct way to do this, but
        //the cost of an extra query isn't extraordinary so 90% accuracy
        // is fine.


        if (this.lastPlotted != this.query.plotType) {
            d3.selectAll(".chartSpecific").style('display','none')

            //display elements that are classed with this chart type.
            d3.selectAll("." + bookworm.query.plotType).style('display','inline')
            bookworm.updateAxisOptionBoxes()

            bookworm.makePlotArea()

        }

        if (this.lastQuery   != this.serverSideJSON(bookworm.query)) {
            bookworm.updateData(bookworm.query.plotType);
        }

        if (this.lastQuery  -= this.serverSideJSON(bookworm.query)) {
            bookworm[bookworm.query.plotType]()
        }

        this.lastQuery = this.serverSideJSON(this.query);
        this.lastPlotted = this.query.plotType;


    },

    treemap: function () {
        //doesn't work yet, because of key names in the treemap layout.
        var bookworm = this;
        var margin = {top: 20, right: 0, bottom: 0, left: 0},
        width = 960,
        height = 500 - margin.top - margin.bottom,
        formatNumber = d3.format(",d"),
        transitioning;

        var x = d3.scale.linear()
            .domain([0, width])
            .range([0, width]);

        var y = d3.scale.linear()
            .domain([0, height])
            .range([0, height]);

        var treemap = d3.layout.treemap()
            .children(function(d, depth) { return depth ? null : d.values; })
            .value(function(d) {return d[bookworm.query.aesthetic.x]})
            .sort(function(a, b) { return a.value - b.value; })
            .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
            .round(false);

        var svg = d3.select("#chart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.bottom + margin.top)
            .style("margin-left", -margin.left + "px")
            .style("margin.right", -margin.right + "px")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .style("shape-rendering", "crispEdges");

        var grandparent = svg.append("g")
            .attr("class", "grandparent");

        grandparent.append("rect")
            .attr("y", -margin.top)
            .attr("width", width)
            .attr("height", margin.top);

        grandparent.append("text")
            .attr("x", 6)
            .attr("y", 6 - margin.top)
            .attr("dy", ".75em");

        root = bookworm.nestData()
        console.log(root);
        initialize(root);
        accumulate(root);
        layout(root);
        display(root);

        function initialize(root) {
            root.x = root.y = 0;
            root.dx = width;
            root.dy = height;
            root.depth = 0;
        }

        // Aggregate the values for internal nodes. This is normally done by the
        // treemap layout, but not here because of our custom implementation.
        function accumulate(d) {
            return d.children
                ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
            : d.value;
        }

        // Compute the treemap layout recursively such that each group of siblings
        // uses the same size (1×1) rather than the dimensions of the parent cell.
        // This optimizes the layout for the current zoom state. Note that a wrapper
        // object is created for the parent node for each group of siblings so that
        // the parent’s dimensions are not discarded as we recurse. Since each group
        // of sibling was laid out in 1×1, we must rescale to fit using absolute
        // coordinates. This lets us use a viewport to zoom.
        function layout(d) {
            if (d.values) {
                treemap.nodes({children: d.values});
                d.values.forEach(function(c) {
                    c.x = d.x + c.x * d.dx;
                    c.y = d.y + c.y * d.dy;
                    c.dx *= d.dx;
                    c.dy *= d.dy;
                    c.parent = d;
                    layout(c);
                });
            }
        }

        function display(d) {
            grandparent
                .datum(d.parent)
                .on("click", transition)
                .select("text")
                .text(name(d));

            var g1 = svg.insert("g", ".grandparent")
                .datum(d)
                .attr("class", "depth");

            var g = g1.selectAll("g")
                .data(d.values)
                .enter().append("g");

            g.filter(function(d) { return d.values; })
                .classed("children", true)
                .on("click", transition);

            g.selectAll(".child")
                .data(function(d) { return d.values || [d]; })
                .enter().append("rect")
                .attr("class", "child")
                .call(rect);

            g.append("rect")
                .attr("class", "parent")
                .call(rect)
                .append("title")
                .text(function(d) { return d.name + ": " + formatNumber(d.value); });

            g.append("text")
                .attr("dy", ".75em")
                .text(function(d) { return d.name; })
                .call(text);

            function transition(d) {
                if (transitioning || !d) return;
                transitioning = true;

                var g2 = display(d),
                t1 = g1.transition().duration(750),
                t2 = g2.transition().duration(750);

                // Update the domain only after entering new elements.
                x.domain([d.x, d.x + d.dx]);
                y.domain([d.y, d.y + d.dy]);

                // Enable anti-aliasing during the transition.
                svg.style("shape-rendering", null);

                // Draw child nodes on top of parent nodes.
                svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

                // Fade-in entering text.
                g2.selectAll("text").style("fill-opacity", 0);

                // Transition to the new view.
                t1.selectAll("text").call(text).style("fill-opacity", 0);
                t2.selectAll("text").call(text).style("fill-opacity", 1);
                t1.selectAll("rect").call(rect);
                t2.selectAll("rect").call(rect);

                // Remove the old node when the transition is finished.
                t1.remove().each("end", function() {
                    svg.style("shape-rendering", "crispEdges");
                    transitioning = false;
                });
            }

            return g;
        }

        function text(text) {
            text.attr("x", function(d) { return x(d.x) + 6; })
                .attr("y", function(d) { return y(d.y) + 6; });
        }

        function rect(rect) {
            rect.attr("x", function(d) { return x(d.x); })
                .attr("y", function(d) { return y(d.y); })
                .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
                .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
        }

        function name(d) {
            return d.parent
                ? name(d.parent) + "." + d.name
                : d.name;
        }

    },

    sunburst : function() {
        var bookworm = this;
        var root = bookworm.nestData()


	updateAesthetic = function() {
	    var category  = bookworm.variableOptions.options.filter(function(d) {return d.type=="character"})[0].dbname
	    var aesthetic = bookworm.query.aesthetic
	    aesthetic.level1 = aesthetic.level1 || category
	    aesthetic.level2 = aesthetic.level2 || category
	    aesthetic.level3 = aesthetic.level3 || category
	}

        var duration = 2000;
        var width = 960,
        height = 900,
        radius = Math.min(width, height) / 2;

        var levels = d3.keys(bookworm.query.aesthetic).filter(function(d) {return /level/.test(d)})
        levels.sort()
        //The bottom level hasn't been assigned a key.
        bottom = levels.pop()
        bookworm.data.forEach(function(d) {
            d.key = d[bookworm.query.aesthetic[bottom]]
        })


        var x = d3.scale.linear()
            .range([0, 2 * Math.PI]);

        var y = d3.scale.sqrt()
            .range([0, radius]);

        var color = d3.scale.category20c();

        svg
            .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

        var partition = d3.layout.partition()
            .children(function(d) {return d.values})
            .value(function(d) { return d[bookworm.query.aesthetic.x]; });

        var arc = d3.svg.arc()
            .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
            .endAngle(function(d) {
		return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
	    })
            .innerRadius(function(d) { return Math.max(0, y(d.y)); })
            .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

        function brightness(rgb) {
            return rgb.r * .299 + rgb.g * .587 + rgb.b * .114;
        };padding=5;


        var nodes = partition.nodes(root)

	nodes.forEach(function(d) {
	    d.parent = d.parent || {};
	    d.uniqueKey = (d.key + d.level) + d.parent.uniqueKey;
	})

        nodes = nodes.filter(function(d) {return d.value>0})


        var path = svg
	    .selectAll("path")
            .data(nodes,function(d) {return d.uniqueKey})

	path
            .enter()
            .append("path")
            .style("fill", function(d) { return color(d.key)})//return color((d.values ? d : d.parent).key); })
            .on("click", click)
            .attr("d", arc);

	path
            .on("click", click)
            .attr("title",function(d) {
                return d[bookworm.query.aesthetic.x]
            })
	    .transition()
//	    .duration(1000)
//            .attrTween("d", arcTween(d)) //I can't get this to work.
            .attr("d", arc)


	path.exit()
	    .transition().duration(500).style("opacity",0).remove()

        var text = svg.selectAll("text").data(nodes,function(d) {return d.uniqueKey});


	text
	    .exit().transition().duration(500).style("opacity",0).remove()

        var textEnter = text.enter().append("text")

	text
            .on("click", click)
            .style("fill-opacity", 1)
            .style("fill", function(d) {
                return brightness(d3.rgb(color(d))) < 125 ? "#eee" : "#000";
            })
            .attr("text-anchor", function(d) {
                return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
            })
            .attr("dy", ".2em")
            .attr("transform", function(d) {
                var multiline = (d.key || "").split(" ").length > 1,
                angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
                rotate = angle + (multiline ? -.5 : 0);
                return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
            })

        textEnter.append("tspan")
            .attr("x", 0)

	text.selectAll("tspan")
            .text(function(d) { return d.depth ? d.key : ""})

        //        textEnter.append("tspan")
        //          .attr("x", 0)
        //        .attr("dy", "1em")
        //      .text(function(d) { return d.depth ? d.key.split(" ")[0] || "" : ""; });

        function click(d) {
            path.transition()
                .duration(duration)
                .attrTween("d", arcTween(d));

            // Somewhat of a hack as we rely on arcTween updating the scales.
            text.style("visibility", function(e) {
                return isParentOf(d, e) ? null : d3.select(this).style("visibility");
            })
                .transition()
                .duration(duration)
                .attrTween("text-anchor", function(d) {
                    return function() {
                        return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
                    };
                })
                .attrTween("transform", function(d) {
                    var multiline = (d.key || "").split(" ").length > 1;
                    return function() {
                        var angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
                        rotate = angle + (multiline ? -.5 : 0);
                        return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
                    };
                })
                .style("fill-opacity", function(e) { return isParentOf(d, e) ? 1 : 1e-6; })
                .each("end", function(e) {
                    d3.select(this).style("visibility", isParentOf(d, e) ? null : "hidden");
                });
        }
        function isParentOf(p, c) {
            if (p === c) return true;
            if (p.values) {
                return p.values.some(function(d) {
                    return isParentOf(d, c);
                });
            }
            return false;
        }
        function arcTween(d) {
            var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
            yd = d3.interpolate(y.domain(), [d.y, 1]),
            yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
            return function(d, i) {
                return i
                    ? function(t) { return arc(d); }
                : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
            };
        }

    },

    bicloud : function() {
        data = this.data
        points = d3
            .select("#svg")
            .selectAll("text")
            .data(this.data,function(d) {return d.unigram})

        yVar = function(d) {
            return (d.WordCount + d.TotalWords)/2 }
        xVar =
            function(d) {if (d.WordCount==0) {d.WordCount=.5}; return d.WordCount/d.TotalWords}

        var x = d3.scale.log().domain(d3.extent(data.map(xVar))).range([30,window.innerWidth*.8])
        var y = d3.scale.log().domain(d3.extent(data.map(yVar))).range([window.innerHeight*.8,30])

        var delay = d3.scale.linear().domain(x.range()).range([0,1000])

        points.enter()
            .append("text")
            .style("opacity",0)
            .attr("x",d3.mean(x.range())).attr("y",d3.mean(y.range()))
            .makeClickable()

        points
            .transition().duration(1500).style("opacity",.5)
            .delay(function(d,i) {return delay(x(xVar(d)))})
            .text(function(d) {return d.unigram})
            .attr("x",function(d) {return x(xVar(d))})
            .attr("y",function(d) {return y(yVar(d))})
            .style("fill","white")
    },
    colorSchemes : {
        RdYlGn : colorbrewer["RdYlGn"][5].slice(0,4).reverse()
    },

    selections : {
    },

    makePlotArea: function() {
        root = d3.selectAll("#svg").data([1])
        root.enter().append("svg").attr("id","svg")

        this.selections.mainPlotArea = root.selectAll("#mainPlotArea").data([1])
        this.selections.mainPlotArea.enter().append("g").attr("id","mainPlotArea")

    },

    heatmap : function() {

        var bookworm = this;
        var w = window.innerWidth*.9,h=window.innerHeight*.9
        var limits = {'x':[w*.1,w*.66],'y':[75,h*.95]}
        var myQuery = this.query
        var colorScaler = bookworm.returnScale()
        var sizeScaler  = bookworm.returnScale()

        var xstuff,ystuff,xAxis,yAxis;

        //selections;
        var mainPlotArea;

        xstuff = bookworm.makeAxisAndScale('x',limits)
        xAxis = xstuff.axis.orient("top")
        x = xstuff.scale

        ystuff = bookworm.makeAxisAndScale('y',limits)
        yAxis = ystuff.axis.orient("right")
        y = ystuff.scale

        offsets = {'Date':.5,'Categorical':0,'Numeric':.5}
        //yaxis

        d3.selectAll('#y-axis').remove()
        mainPlotArea = this.selections.mainPlotArea;
        mainPlotArea.append("g")
            .attr('id','y-axis')
            .call(yAxis)
            .attr("class","axis")
            .attr("transform","translate(" + (limits['x'][1] + x.pixels*offsets[xstuff.datatype])  +"," + (y.pixels*offsets[ystuff.datatype]) + ")")

        //x-axis
        d3.selectAll('#x-axis').remove()

        mainPlotArea.append("g")
            .attr('id','x-axis')
            .call(xAxis)
            .attr("class","axis")
            .attr("transform","translate("+x.pixels*offsets[xstuff.datatype]+ "," + (limits['y'][0])  +")")

        //Key the data against the actual interaction it is,
        //so transitions will work.
        bookworm.data = bookworm.data.map(function(d) {
            d.key = d[myQuery['aesthetic']['x']] + d[myQuery['aesthetic']['y']]
            return(d)
        })

        if (query['scaleType']==undefined) {query['scaleType'] = "log"}

        colorValues = bookworm.data.map(function(d) {return(d[query['aesthetic']['color']])})
        bookworm.scales.color = colorScaler.values(colorValues).scaleType(d3.scale[query['scaleType']])()

        gridPoint = mainPlotArea.selectAll('rect')
            .data(bookworm.data,function(d) {
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
            .attr('x',function(d) {return x(bookworm.plotTransformers[xVariable](d[xVariable]))})
            .attr('y',function(d) {return Math.round(y(bookworm.plotTransformers[yVariable](d[yVariable])))})
            .attr('height', y.pixels)
            .attr('width', x.pixels)
            .makeClickable()
            .transition()
            .duration(2500)

            .style('fill',function(d) {
                var color = bookworm.scales.color(d[query['aesthetic']['color']]);
                if (d[query['aesthetic']['color']]==0) {color='#393939'}
                if (color=="#000000") {color='#393939'}
                return color;
            })



        bookworm.addTitles(gridPoint)
        bookworm.legends.fill = colorBar()
        bookworm.legends.fill.update(bookworm.scales.color)

        bookworm.updateQuery()

        updateChart()
    },
    settings:{
        //things we need to remember for plotting preferences.
        "lastPlotted":null,
    },

    "mapQuery" : function() {
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
            mainPlotArea.selectAll('circle')
                .transition()
                .duration(4500)
                .attr('r',2)
                .attr('fill','white');
        }

        function updateChart() {
            mainPlotArea.selectAll('title').remove()

            bookworm.data.sort(function(a,b) {
                return(b[query['aesthetic']['size']]-a[query['aesthetic']['size']])} );

            var mypoints = mainPlotArea
                .selectAll('circle')
                .data(bookworm.data,function(d) {return([d.lat,d.lng])});

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
                    return "translate(" + coords[0] +","+ coords[1] + ")"
                })
                .makeClickable()


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
            bookworm.updateQuery()

            d3.json(destinationize(query),function(json) {
                bookworm.data = parseBookwormData(json,query);

                values = bookworm.data.map(function(d) {return(d[query['aesthetic']['color']])});

                colorscale = colorScaler.values(values).scaleType(d3.scale[query['scaleType']])()

                sizes = bookworm.data.map(function(d) {return(d[query['aesthetic']['size']])});

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
    },
    "chartTypes": {
        "linePlot" : function() {

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

            bookworm.alignAesthetic()

            updateChart = function() {
                xstuff = makeAxisAndScale('x')
                ystuff = makeAxisAndScale('y')

                //line charts should start at 0.
                ystuff.axis.scale().domain([ystuff.axis.scale().domain()[0],0])

                x = xstuff.scale
                y = ystuff.scale

                myAxis = d3.select("#mainPlotArea").append('g').attr('id','y-axis')
                    .call(ystuff.axis)

                myAxis
                    .classed("axis",true)
                    .attr('transform','translate(' +ystuff.limits['x'][0] + ',0)')

                d3.select("#mainPlotArea").append('g').attr('id','x-axis').call(xstuff.axis)
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

                        value = x(bookworm.plotTransformers[name](d[name]));
                        return value})
                    .y(function(d) { value = y(bookworm.plotTransformers[query['aesthetic']['y']](d[query['aesthetic']['y']]));return value })

                nestedData = d3.nest().key(function(d) {return d[query['aesthetic']['group']]}).entries(bookworm.data)

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

                circles = mainPlotArea.selectAll('circle.selector').data(bookworm.data,function(d) {return d[query['aesthetic']['x']]})

                circles.enter().append('circle').attr("class","selector")

                circles.exit().remove()


                //these need to belong to the line somehow.

                circles
                    .attr('opacity','.01')
                    .on('mouseover',function(d) {d3.select(this).attr('opacity','1')})
                    .on('mouseout',function(d) {d3.select(this).attr('opacity','.01')})
                    .attr('cx',function(d) {
                        name = query['aesthetic']['x']
                        return x(bookworm.plotTransformers[name](d[query['aesthetic']['x']]))})
                    .attr('cy',function(d) {return y(parseFloat(d[query['aesthetic']['y']]))})
                    .on('click',function(d) {runSearch(d)})
                    .attr("r",6)
                    .attr('fill','yellow')

            }

            my = function() {
                removeElementsFromOtherPlots(query['plotType'])

                d3.json(destinationize(query),function(json) {


                    bookworm.data = parseBookwormData(json,query);

                    //got to be sorted or the line's a mess.
                    bookworm.data.sort(function(a,b) {
                        return parseFloat(a[query['aesthetic']['x']] - b[query['aesthetic']['x']])
                    })
                    updateChart()
                })

            }

            return my
        },
        barPlot : function() {
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

            bookworm.alignAesthetic()

            my = function() {
                d3.json(destinationize(query),function(json) {
                    bookworm.data = parseBookwormData(json,query);
                    //for this, sort by occurrences

                    bookworm.data.sort(function(a,b) {
                        return (
                            parseFloat(a[query['aesthetic']['x']] - b[query['aesthetic']['x']])
                        )
                    })

                    if (typeof(query['aesthetic']['color']) != 'undefined') {
                        topColors = bookworm.functions.topn(5,query['aesthetic']['color'],bookworm.data)

                        bookworm.data = bookworm.data
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

                    points = mainPlotArea.selectAll('circle')
                        .data(bookworm.data,function(d) {
                            key = d[query['aesthetic']['y']]
                            if (typeof(d[query['aesthetic']['color']]) != undefined) {
                                key = key + d[query['aesthetic']['color']]
                            }
                            return key
                        })

                    bars = mainPlotArea
                        .selectAll('rect')
                        .data(bookworm.data,function(d) {
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
                        .makeClickable()
                    addTitles(bars)

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
    },
    "queryVisualizations" : {
        "corpusSelector" : function(selection,bindTo) {
            //Adds a corpus box to a div passed in.
            //That would be pretty useful--really, though, this should be
            //using some of the code that Billy Janitsch wrote.

            that = {}; //the corpus selector that will be pushed out

            if (bindTo==undefined) { bindTo = "search_limits"}

            selector = selection
                .append("div")
                .attr("class","corpusSelector " + bindTo)


            currentLimits = selector
                .append("div")
                .classed("currentLimits","true")


            possibleOptions = selector
                .append("div")
                .classed("limits",true)
                .classed(bindTo,true)
                .append("text")
                .text("Add constraints on")
                .append("select")
                .on("change",function(d) {
                    element = this;
                    var idx=element.selectedIndex;
                    var val=element.options[idx].value;
                    currentLimits.append("text","val: ")
                    dropbox = createDropbox(val,currentLimits)
                    dropbox.attr("bindTo","bookworm.query['" + bindTo  + "']['" +val + "']")
                    bookworm.updateQuery()
                    return
                })
                .selectAll("option")
                .data(variableOptions.options)
                .enter().append("option")
                .attr("value",function(d) {return d.dbname})
                .text(function (d) {return d.name})


            return that

        }
    },
    "operations" : {
        "chooseVariable" : function(parentNode,nodeName,variableSet,queryPartBeingUpdated,partOfQueryPartBeingUpdated) {
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
                    bookworm.updateQuery();
                    shutWindow()
                    removeOverlay()
                    currentPlot = myPlot()
                    currentPlot()
                })
        },
        "writeTitle" : function() {
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

            if (bookworm.comparisontype()=='comparison') {
                text1 = "Usage of '" + query['search_limits']['word'][0] + "'" + " per use of '" + query['compare_limits']['word'][0] + "'"
            }

            title.selectAll('text').remove()
            title
                .append('text')
                .attr('id','colorLegendTitle')
                .attr("class","title")
                .text(text1)
                .attr('transform','translate(10,0)')

        },
        "updatePointer" : function(inputNumbers) {
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
        },
        "drawMap" : function (mapname) {
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
                        .scale([d3.min([w,h*1.7])]);
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
                        .classed("mapBlock",true)
                        .attr("id",function(d) {return "map-item-" + d.id})
                        .attr('fill',"grey")
                });

                return(projection)
            }
            return my
        },
        "createDropbox" : function(category,parentSelection) {
            //Drops in a new query box for a categorical value:
            //going to be useful for other applications, but not implemented in the basic one.
            //Possibly the first part should just return the data.

            myQuery = JSON.parse(JSON.stringify(query));
            myQuery['search_limits']['word'] = []
            myQuery['groups'] = [category]
            myQuery['counttype'] = ['WordCount','TextCount']
            return d3.json(destinationize(myQuery),function(json) {
                myData = parseBookwormData(json,myQuery);

                topChoices = bookworm.functions.topn(50,category,myData)

                myData.filter(function(entry) {
                    return(topChoices.indexOf(entry[category]) > -1 & entry.WordCount > 0)
                })

                myData.sort(function(a,b) {return(b.WordCount - a.WordCount)})

                thisGuy = parentSelection
                    .append('select')
                    .attr('class','selector')//.attr('multiple','multiple')

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
                return thisGuy;
            })
        }
    },
    "myPlot" : function() {
        updateAxisOptionBoxes()

        //Don't show any chartSpecific elements at all (including this type)
        d3.selectAll(".chartSpecific").style('display','none')

        //display elements that are classed with this chart type.
        d3.selectAll("." + query.plotType).style('display','inline')

        if (query.plotType=='heatMap') {return Bookworm.functions.heatMapFactory() }
        if (query.plotType=='map') {return mapQuery()}
        if (query.plotType=='line') {return linePlot()}
        if (query.plotType=='barPlot') {return barPlot()}

    },
    "removeElementsFromOtherPlots" : function(geometryName) {
        if (lastPlotted != geometryName) {
            removeElements()
            lastPlotted = geometryName
        }
    },


    removeElements : function() {
        //just remove everything from the svg.
        vals = ['rect','text','path','circle','line','tick'].map(
            function(type) {
                svg.selectAll(type).transition().remove()
            }
        )
    },

    changeColorScale : function(scaleType) {
        newscale = returnScale()
            .values(colorscale.domain())
            .scaleType(scaleType)();

        colorscale=newscale

        currentPlot.updateChart()

    },

    returnScale : function() {
        var bookworm=this;
        var colors = this.colorSchemes.RdYlGn,//greenToRed,
        scaleType = d3.scale.log,
        values = [1,2,3,4,5]

        function my() {
            scale = scaleType().range(colors)
            numbers = d3.extent(values)
            //numbers = d3.extent(bookworm.data.map(function(d) {return d[bookworm.query.aesthetic.color]}))
            //If we're using a log scale, the minimum can't be zero. So it's 0.1. Or actually a tiny bit less to get .1 inside the range.

            if (scaleType==d3.scale.log) {
                numbers[0] = d3.max([(1/101),d3.min(values)])
            }

            if (bookworm.comparisontype()=='comparison') {
                // Make it symmetric for ratios.
                outerbound = d3.min([100,d3.max([1/d3.min(values),d3.max(values)])])
                numbers = [1/outerbound,outerbound]
                colors = PuOr;
                scale = scaleType().range(colorbrewer.PuOr[4])
            }
            min = numbers[0]
            max = numbers[1]

            if (scaleType==d3.scale.log) {

                min = Math.log(numbers[0])
                max = Math.log(numbers[1])
                input = d3.range(min,max,(max-min)/(bookworm.scales.color.range().length-1))
                if (input.length < bookworm.scales.color.range().length) {
                    // I think this is a floating point problem; sometimes the top number is included, sometimes not. Add if the list is too short.
                    input.push(max)
                }
                scale.domain(input.map(function(n) {return(Math.exp(n))}))
            } else if (scaleType==d3.scale.sqrt) {
                scale.domain(d3.range(min,max,(max-min)/(bookworm.scales.range().length-1)).map(function(n) {return(n^2)}))
            } else if (scaleType==d3.scale.linear) {
                scale.domain(d3.range(min,max+max*.0001,(max-min)/(bookworm.scales.color.range().length-1)).map(function(n) {return(n)}))
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
    },

    popitup: function(url) {
        newwindow=window.open(url,'name','height=640,width=1000');
        if (window.focus) {newwindow.focus()};
        return false;
    },

    parseBookwormData: function(json,locQuery) {
        // Changes the shape of the hierarchical json the API delivers to a flat one with attribute names
        // which takes more space but plays more nicely with d3/javascript. Uses recursion, yuck.
        names = [].concat(locQuery.groups).concat(locQuery.counttype);
        function flatten(hash,prepend) {
            prepend = prepend || [];
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
        flat = flatten(json);

        //add the labels.
        results = flat.map(function(localdata){
            return(toObject(names,localdata));
        })
        bookworm.data = results

        d3.keys(results[0]).map(function(key) {
            BookwormClasses.updateKeysTransformer(key)
        })
        console.log("done parsing")
        return(results)

    },
    variableOptions : {
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
            variableOptions = bookworm.variableOptions;
            bookworm.variableOptions.options = []
            localQuery = {"method":"returnPossibleFields","database":database}
            d3.json(bookworm.destinationize(localQuery), function(error, json) {
                if (error)        console.warn(error);
                bookworm.variableOptions.defaultOptions.forEach(
                    function(row) {
                        variableOptions.options.push(row)
                    })
		json.push({"name":"","dbname":undefined})
                json.map(function(row) {
                    row['database'] = bookworm.query['database']
                    variableOptions.options.push(row)
                })

                variableOptions.options = variableOptions.options.filter(function(row){
                    if (row.database==bookworm.query.database ) return true
                })

                followupFunction()

            });
        }
    },
    updateAxisOptionBoxes : function() {
        var bookworm = this;
        updateQuantitative = function() {
            axes = d3.selectAll(".metric.options")
            selected = axes.selectAll('option').data(bookworm.quantitativeVariables)
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
                .data(bookworm.variableOptions.options)

            selected
                .exit()
                .remove()

            selected.enter().append('option')

            selected
                .attr('value',function(d) {
		    return d.dbname})
                .text(function(d) {return d.name})

            bookworm.updateQuery()
        }
        // Find out the relevant options from the database, then run this.
        bookworm.variableOptions.update(bookworm.query['database'],followup)

        updateQuantitative()


    },

    initializeInterfaceElements: function() {
	var bookworm = this;
        d3.select("body").on("keypress",function(e){
            if(d3.event.keyCode == 13){
                bookworm.updatePlot()
            }
        });

        d3.selectAll("[bindTo]")
            .on('change',function() {
		if(d3.select(this).property("id")=="fixme") {
		    console.log("OK switching to",d3.select(this).property("value"))
		}
		
                bookworm.updateQuery(d3.select(this))
            })
            .on('keyup',function() {
                bookworm.updateQuery(d3.select(this))
            })
        this.updateAxisOptionBoxes()
    },
    updateKeysTransformer : function(key) {
        //This is called for its side-effect: assigning a function to each key in bookworm.plotTransformers

        //That function will--for example--take a date and reformat it as a javascript date object.
        //default behavior: return the value as is.

        //That's necessary because date-time scales use the date-time objects, not the raw text.
        var bookworm = this;
        this.alignAesthetic()

        bookworm.plotTransformers[key] = function(key) {return(key)}
        dataTypes[key]="Categorical"
        //if a date: return a dateTime object
        isADate = false
        key.split("_").map(function(part) {
            //I'm just coming up with descriptions, here.
            if (['year','month','day','week','decade','century',"Year","Decade","yearchunk"].indexOf(part) >=0) {isADate=true}
        })

        if (isADate) {
            bookworm.plotTransformers[key] = function(originalValue) {
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
        for (var i =0; i < bookworm.data.length; i++) {
            entry = bookworm.data[i]
            d = entry[key]
            if (isNaN(d) & d!="" & d!="None") {
                //console.log("giving up on" + d)
                return
                break
            }
        }

        bookworm.plotTransformers[key] = function(originalValue) {
            return parseFloat(originalValue)
        }
        dataTypes[key]="Numeric"
    },

    comparisontype: function() {
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
    },

    updateQuery: function (selection) {
        var bookworm = this;
        if (typeof(selection) == "object") {
            //if nothing is passed, move on

            //update the query based on the selection:
            value = selection.property('value')
            bindTo = selection.attr('bindTo')
	    console.log(bindTo)
            if (typeof(eval(bindTo))=='string') {
                //So we don't have to store strings as quoted json;
                //note this means numbers are passed as strings
                //That shouldn't matter for SQL evaluation.
                value = JSON.stringify(value)
            }
            //reassign the element in the Dom.
            eval (bindTo + ' = ' + value)
            console.log (bindTo + ' = ' + value)
        } else {selection = d3.select('body')}//just so it's there next time round

        //update based on the aesthetics
        bookworm.alignAesthetic()

        //update all listening boxes based on the query
        needsUpdate = d3.selectAll("[bindTo]")
        needsUpdate = needsUpdate.filter(function(d) {
            //only select boxes that are different from this one;
            return selection[0][0] !== d3.select(this)[0][0]
        })

        needsUpdate
            .property('value', function() {
                try{
                    value = eval(d3.select(this).attr("bindTo"))
                    if (typeof(value)=="object") {
                        return(js_beautify(JSON.stringify(value)))
                    }
                    return(value)}
                catch(err) {console.log(d3.select(this).attr("class")); return(err.message)}
            })
    },
    "alignAesthetic" : function() {
        //begin the real big.
        var bookworm = this;
        var query = bookworm.query
        quantitativeVariables = bookworm.quantitativeVariables

        if ('aesthetic' in query) {
            var counttypes = {}
            var groups     = {}

            //pushes the aesthetic values into the appropriate boxes.

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

    },
    "functions":{
        "topn" : function(n,key,dataset) {
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
        },

        "prettyName" : function(number) {
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
    },
    "drawSizeLegend" : function(scale,origin,height,width) {

        //This either creates, or updates, a size legend, and drops it on the screen.
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
            .text(bookworm.nameSubstitutions[query['aesthetic']['size']])
            .on('click',function(d){chooseVariable(sizeLegend,"sizeSelector",quantitativeVariables,'aesthetic','size')})
    },

    "destinationize" : function(query) {
        //Constructs a cgi-bin request to local host.
        //Can be used with runSearch and searchWindow (below);
        //Or to get other things, like lists of variables.
        return( "/cgi-bin/dbbindings.py/?queryTerms=" + encodeURIComponent(JSON.stringify(query)))
    },

    "runSearch" : function(d) {
        //takes an element that has attributes corresponding to groups:
        //opens up a search window with the full query restrictions, plus the particular restrictions
        //for which it is grouped.
        myQuery = JSON.parse(JSON.stringify(query))
        myQuery['groups'].map(function(group) {
            myQuery['search_limits'][group] = [d[group]]
        })
        this.searchWindow(myQuery)
    },

    "searchWindow" : function(local) {
        //This takes a query string and opens up a new window with search results. Pretty bare-bones for now, but could be a lot, lot better.
        local.method="search_results"
        url = this.destinationize(local)
        var newWindow = window.open('');
        var newWindowRoot = d3.select(newWindow.document.body);
        d3.json(url,function(data){
            var table = newWindowRoot.append('table');
            var rows = table.selectAll('tr')
                .data(data);
            rows.enter().append('tr');
            rows.html(function(d) { return d; });
        })
    },

    "makeAxisAndScale" : function(axis,limits) {

        limits = limits || {'x':[window.innerWidth*.1,window.innerWidth*.66],'y':[85,window.innerHeight*.9]}

        variableName = query['aesthetic'][axis]

        vals = d3.nest()
            .key(function(d) {
                return d[variableName]
            }
                )
            .entries(bookworm.data).map(function(d) {
                //Some variables will have transformers defined for them
                //that (for example) turn a year into a date.
                //It would perhaps be better to build the transformers
                //straight into the scales, but I don't know how.

                transformer = bookworm.plotTransformers[variableName]
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

            names = bookworm.functions.topn(n,variableName,bookworm.data)

            bookworm.data = bookworm.data.filter(function(entry) {
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
    },

    "addTitles" : function(selection) {
        var bookworm = this;
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
                        return typeof(bookworm.nameSubstitutions[e]) != "undefined"
                    })
                variables.map(function(variable) {
                    text.push(
                        bookworm.nameSubstitutions[variable] + ": " +
                            prettyName(d[variable]))
                })
                return(text.join('                     \t\n'))
            });

    },
    unused:{
        "encode_as_img_and_link" : function() {
            //This is from the Internet--I don't know where I stole it from.

            // Add some critical information
            //$("svg").attr({ version: '1.1' , xmlns:"http://www.w3.org/2000/svg"});

            var svg = d3.select("#svg").html();
            var b64 = Base64.encode(svg);

            // Works in recent Webkit(Chrome)
            $("body").append($("<img src='data:image/svg+xml;base64,\n"+b64+"' alt='file.svg'/>"));

            // Works in Firefox 3.6 and Webit and possibly any browser which supports the data-uri
            $("body").append($("<a href-lang='image/svg+xml' href='data:image/svg+xml;base64,\n"+b64+"' title='file.svg'>Download</a>"));
        }
    },
    quantitativeVariables : [
        {"variable":"WordsPerMillion","label":"Uses per Million Words"},
        {"variable": "WordCount","label":"# of matches"},
        {"variable":"TextPercent","label":"% of texts"},
        {"variable":"TotalWords","label":"Total # of words"},
        {"variable":"TextCount","label":"# of Texts"},
        {"variable":"TotalTexts","label":"Total # of Texts"},
        {"variable":"WordsRatio","label":"Ratio of group A to B"},
        {"variable":"SumWords","label":"Total in both sets"}
    ],
    nameSubstitutions : function() {
        that = {};
        for (item in this.quantitativeVariables) {
            that[item.variable] = item.label
        }
        return that
    }(),

    "scales":{
        "x":null,
        "y":null,
        "color":d3.scale.log().range(["#D61818","#FFAE63","#FFFFBD","#B5E384"].reverse())
    },
    "legends":{
        "color":null
    }
}

Bookworm = function(query) {
    that = BookwormClasses;
    that.query = query || {};
    that.plotTransformers = {};
    bookworm = that;//kludgy--the scoping requires bookworm be defined for some grandchild of this function.
    that.initializeInterfaceElements();
    return that
}
