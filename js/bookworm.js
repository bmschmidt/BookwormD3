d3.selection.prototype.makeClickable = function(query,legend,ourBookworm) {
    ourBookworm = ourBookworm || bookworm
    var query = ourBookworm.query
    //This can be called on a variety of selections bound
    //to bookworm data; it restyles them to be 'highlit',
    //and adds a function to run a search on click
    //The styles for that particular element have to be set
    //to recognize highlighting in--get this!--the stylesheet.
    //I'll be an HTML 5 programmer yet.

    var selection=this;

    selection
        .on('mouseover',function(d) {
            d3.select(this).classed("highlit",true)
            //pointer update only works if there is a color
            //aesthetic; otherwise, nothing happens

            textArea = ourBookworm.selections.tooltip

            textArea.selectAll("text").remove()
            textArea.selectAll("br").remove()

            textArea
                .transition()
                .style("left", (d3.event.pageX+25) + "px")
                .style("top", (d3.event.pageY+25) + "px")
                .attr("transform","translate(0,0)")
                .style("opacity",.8)

            textArea
                .append("text").text("Click to view examples").append("br")

            textArea.selectAll("div.caption").remove()

            var definitions = textArea
                .selectAll("div.caption")
                .data(d3.keys(query.aesthetic))


            definitions
                .enter()
                .append("div")
                .attr("class","caption")

            definitions
                .exit()
                .remove()

            definitions
            //no break space
                .append("strong")
                .text(function(e) {return query.aesthetic[e] + ":" + String.fromCharCode(160)})
            definitions
                .append("text")
                .text(function(e) {
                    var value = d[query.aesthetic[e]];
                    //if (typeof(value)=="number") {value = bookworm.functions.prettyName(value)}
                    return(value)
                })

            if (query['aesthetic']['color'] && legend !== undefined) {
                legend.pointTo(d[query['aesthetic']['color']])
            }

            //toggleHighlighting(d,true)
        })

        .on('mouseout',function(d) {

            ourBookworm.selections.tooltip.transition().style("opacity",0)

            d3.select(this).classed("highlit",false)
            //toggleHighlighting(d,false)
        })
        .on('click',function(d) {
            ourBookworm.runSearch(d)
        })
    return selection
}



BookwormClasses = {
    //Here are a bunch of functions that I'm using in the d3 Bookworms.
    //Individual applications should only need some of them?
    nothing: function() {}, //obviously this does something, somewhere…

    guessAtQuery: function(consultDatabases) {
        consultDatabases = consultDatabases || false
        //The location is either the second-to-last part of the pathname, or the area before the period.
        //So OL.culturomics.org/SOTU/barchart.html will first try out SOTU, but then override it with OL when it sees that there.
        var guess = {}
        var guessDatabase = function() {
            guess.database = window.location.pathname.split("/").reverse()[1]
            if (window.location.host.split(".").length > 2) {
                guess.database = window.location.host.split(".")[0]
            }
            if (guess.database=="bookworm") {guess.database="historydiss"}
            if (guess.database=="beta") {guess.database="federalist"}
            if (guess.database=="D3") {guess.database="federalist"}
        }

        var guessPlotType = function() {
            //The plottype is the very end of the thing, minus any ".html" or ".htm"
            guess.plotType = window.location.pathname.split("/").reverse()[0].split(".")[0]
            if (guess.plotType == "" || guess.plotType=="index") {
                guess.plotType = "barchart"
            }
        }

        var guessQuery = function () {
            guess.method="return_json"
            guess.search_limits = {"word":["test"]}
            guess.aesthetic = {"x":"WordsPerMillion","y":"author"}
        }

        if (consultDatabases) {
            var category  = bookworm
                .variableOptions
                .options
                .filter(function(d) {return d.type=="character"})[0]
                .dbname
        }

        if  (window.location.hash!=="") {
            return (JSON.parse(decodeURIComponent(window.location.hash.split("#")[1])))
        }

        guessDatabase()
        guessPlotType()
        guessQuery()
        return guess
    },

    checkHashForLocation: function() {
        if  (window.location.hash!=="") {
            this.query = JSON.parse(decodeURIComponent(window.location.hash.split("#")[1]))
            return this.query;
        }
        return
    },

    updateData: function(callback,append) {
        //callback is a string relative to the layer we're working with here.
        //that *names* a function to be called.

        //append is whether to wipe the data already there, or to tack some new data on after it.
        //(Useful when building out a list of every word in a document,
        //say, to avoid a massive single query.)

        callback = callback || function() {}
        append = append || false;
        var bookworm = this;


        destination = (
            "/cgi-bin/dbbindings.py/?queryTerms=" +
                encodeURIComponent(JSON.stringify(this.query)))




        d3.json(destination, function(error,data) {
            if (error) {
                console.log(destination)
                console.log("error parsing JSON: " + console.log(error))
                bookworm.data=[]
                callback()
                return
            }
            //Unless specifically told to save the old data, it should start from nothing.
            if (!append) {
                bookworm.data = [];
                bookworm.data = bookworm.parseBookwormData(data,bookworm.query)
            }
            if (append) {
                //an option to add on to existing data for running queries.
                if (bookworm.data===undefined) {bookworm.data=[]}
                bookworm.data = bookworm.data.concat(bookworm.parseBookwormData(data,bookworm.query))
            }

            callback()

        })
    },

    smooth : function(span,axis,kernel) {
        var bookworm = this;
        var kernelSmoother;
        span = span || bookworm.query.smoothingSpan
        axis = axis || "time"

        kernel = kernel || "sine"

        if (kernel=="average") {
            kernelSmoother = function(array) {
                return d3.mean(array)
            }
        }
        if (kernel=="sine") {
            kernelSmoother = function(array) {
                //By default, use a sine-wave shaped smoothing kernel.
                var length = array.length
                var midpoint = (length-1)/2
                var weighter = function(i) {
                    return Math.cos((midpoint-i)/(length+2)*Math.PI/2)
                }
                var totalWeights = 0;
                var i = 0
                weightedVals = array.map(function(d) {
                    var weight = weighter(i);
                    totalWeights += weight;
                    i++;
                    return (d * weight)

                })
                var total = d3.sum(weightedVals)/totalWeights
                return total
            }
        }

        //the funny thing about smoothing is that when it's multivariate, we need to create some entries to interpolate 0 counts: if Britain has a series from 1066 to 2000, and the US only from 1776 to 1860 and 1865 to 2000, we want to interpolate a whole bunch of zeroes before 1776 and 1860. But if there's a series of US grain and cattle exports but only British grain exports, there's no need to create a dummy set of British cattle exports consisting only of zeroes. Probably. (I don't know, maybe there is?)

        //Assuming zero for no data is also problematic in all sorts of ways; this needs a "step" variable.

        //This code accomplishes that

        //using D3.nest to avoid expensive filters.

        var smoothingBy = bookworm.query.aesthetic[axis]
        var otherKeys = d3.values(bookworm.query.aesthetic)
        var quantKeys = bookworm.variableOptions.quantitative.map(function(d) {return d.dbname}).filter(function(d) {
            return otherKeys.indexOf(d) > -1
        })


        var groupings = otherKeys.filter(function(key) {
            if (quantKeys.indexOf(key)>-1) {return false}
            if (key==smoothingBy) {return false}
            return true
        })

        var completeNesting = d3.nest()

        //nest by each of the groupings
        groupings.forEach(function(key) {
            completeNesting.key(function(d) {
                return d[key]
            })
        })

        //nest by the thing itself.
        completeNesting.key(function(d) {
            return d[smoothingBy]
        })

        var timeStamps = d3.set(bookworm.data.map(function(d) {return d[bookworm.query.aesthetic[axis]]})).values().sort(function(a,b) {return parseFloat(a)-parseFloat(b)})


        var timeGroups = timeStamps.map(function(d,i) { return timeStamps.slice(d3.max([0,i-bookworm.query.smoothingSpan]),d3.min([timeStamps.length,i+ bookworm.query.smoothingSpan + 1]) )})


        var completeIndex = completeNesting.map(bookworm.data)

        //One element per each interaction of variables in the groupings: recreated by recursively descending the first levels of the completeIndex hierarchy.
        var recurse = function(object,labels) {
            var key = labels[0];
            if (labels.length==1) {
                return d3.keys(object).map(function(d) {
                    var a = {};
                    a[key] = d;
                    a['values'] = object[d]
                    return a })
            } else {
                returnVal = []
                d3.keys(object).forEach(function(key2) {
                    vals = recurse(object[key2],labels.slice(1))
                    returnVal = returnVal.concat(vals.map(function(d) {
                        d[key] = key2
                        return d
                    }))
                })
                return returnVal
            }
        }

        var hierarchy =  recurse(completeIndex,groupings)

        var smoothedData = []

        hierarchy.forEach(function(hierarchyLevel) {
            //clone a new object off of the values for the level.
            var locEntries = Object.create(hierarchyLevel['values']);
            delete hierarchyLevel['values']
            timeGroups.map(function(timesToMerge,i) {
                var newOut = Object.create(hierarchyLevel);
                newOut[bookworm.query.aesthetic[axis]] = timeStamps[i]
                quantKeys.forEach(function(key) {
                    //For each quantitative key, there's a different value to smooth.
                    //Currently we work across them, not combining. (I think).
                    values = timesToMerge.map(function(d) {
                        if (locEntries[d]==undefined) {return 0}
                        return locEntries[d][0][key]
                    })
                    //Set the smoothed data equal to whatever smoothing kernel is being used
                    newOut[key] = kernelSmoother(values)
                })
                smoothedData.push(newOut)
            })
        })
        return smoothedData;
    },
    nestData : function(rename) {
        rename = rename || false
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

        function renameChildren(input) {
            var output = {};

            if (!input.key & !input.values) {
                //ie, it's a bottom node.
                return input;
            }

            output.name = input.key;
            //All values get renamed
            output.children = input.values.map(renameChildren)
            return output
        }

        if(rename) {
            output = renameChildren(output)
        }
        return output
    },

    serverSideJSON : function () {

        //returns only the query elements that actually matter to the server.
        //useful for seeing if the query needs to be rerun, or if all changes
        //can be handled client-side.

        var query = JSON.parse(JSON.stringify(this.query))
        delete(query.aesthetic)
        delete(query.scaleType)
        delete(query.smoothingSpan)
        delete(query.plotType)
        return JSON.stringify(query);

    },

    updatePlot : function(callback) {



        callback = callback || function() {}
        var bookworm = this;



        window.location.hash = encodeURIComponent(JSON.stringify(this.query))
        //housekeeping;

        bookworm.alignAesthetic()

        bookworm.updateQuery()

        if (this.lastPlotted != this.query.plotType) {
            //hide all the selectors for other kinds of bookworms.
            d3.selectAll(".chartSpecific").style('display','none')
            if (bookworm.selections.mainPlotArea !== undefined) {
                ["point","line","g","path","circle","rect"].forEach(function(d) {
                    bookworm.selections.mainPlotArea.selectAll(d).transition().style("opacity",0).remove()
                })
            }
            //display elements that are classed with this chart type.
            //            d3.selectAll("." + bookworm.query.plotType).style('display','inline')
            bookworm.updateAxisOptionBoxes()
            bookworm.makePlotArea()


        }

        //test if the query has changed since the last update;
        //string equality is not exactly the correct way to do this, but
        //the cost of an extra query isn't extraordinary so 90% accuracy
        // is fine.

        if (this.lastQuery != this.serverSideJSON(bookworm.query)) {
            bookworm.updateData(function() {
                bookworm[bookworm.query.plotType]()
                callback()
            });
        } else {
            bookworm[bookworm.query.plotType]()
            callback()
        }

        this.lastQuery = this.serverSideJSON(this.query);
        this.lastPlotted = this.query.plotType;

    },

    requireAesthetics : function(aesthetics,type) {
        //lets you require that an aesthetic be set.
        var bookworm = this;

        type = type || "character";
        aesthetics.forEach(function(aesthetic) {
            bookworm.query.aesthetic[aesthetic] = bookworm.query.aesthetic[aesthetic] || category
        });
    },

    treemap: function () {

        var bookworm = this;

        bookworm.requireAesthetics(["level1","level2","level3"],"categorical")

        var margin = {top: 20, right: 0, bottom: 0, left: 0};
        var width = 960
        var height = 500 - margin.top - margin.bottom
        var formatNumber = d3.format(",d")
        var transitioning;

        var x = d3.scale.linear()
            .domain([0, width])
            .range([0, width]);

        var y = d3.scale.linear()
            .domain([0, height])
            .range([0, height]);

        var treemap = d3.layout.treemap()
            .value(function(d) {
                return d[bookworm.query.aesthetic.x];
            })
            .children(function(d, depth) { return depth ? null : d.children; })
            .sort(function(a, b) {return a.value - b.value; })
            .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
            .round(false);

        this.selections.mainPlotArea.selectAll("g").transition().style("opacity",0).remove()

        var svg = this.selections.mainPlotArea
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .style("shape-rendering", "crispEdges")
            .attr("class","treemap chart");

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
                ? d[bookworm.query.aesthetic.x] = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
            : d[bookworm.query.aesthetic.x];
        }

        // Compute the treemap layout recursively such that each group of siblings
        // uses the same size (1×1) rather than the dimensions of the parent cell.
        // This optimizes the layout for the current zoom state. Note that a wrapper
        // object is created for the parent node for each group of siblings so that
        // the parent’s dimensions are not discarded as we recurse. Since each group
        // of sibling was laid out in 1×1, we must rescale to fit using absolute
        // coordinates. This lets us use a viewport to zoom.
        function layout(d) {
            if (d.children) {
                treemap.nodes({children: d.children});
                d.children.forEach(function(c) {
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
                .data(d.children)
                .enter().append("g");

            g.filter(function(d) { return d.children; })
                .classed("children", true)
                .on("click", transition);

            g.selectAll(".child")
                .data(function(d) { return d.children || [d]; })
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


        var levels = d3.keys(bookworm.query.aesthetic).filter(function(d) {return /level/.test(d)})
        levels.sort()

        //The bottom level hasn't been assigned a key.
        bottom = levels.pop()
        bookworm.data.forEach(function(d) {
            d.name = d[bookworm.query.aesthetic[bottom]]
        })

        var root = bookworm.nestData(rename=true)

        initialize(root);
        accumulate(root);
        layout(root);
        display(root);

    },

    sunburst : function() {
        var bookworm = this;
        var root = bookworm.nestData()

        this.requiredAesthetics  = ["level1","level2","level3","x"]
        this.permittedAesthetics = ["color"]

        updateAesthetic = function() {
            var category  = bookworm.variableOptions.options.filter(function(d) {return d.type=="character"})[0].dbname
            var aesthetic = bookworm.query.aesthetic
            aesthetic.level1 = aesthetic.level1 || category
            aesthetic.level2 = aesthetic.level2 || category
            aesthetic.level3 = aesthetic.level3 || category
        }

        bookworm.updateAxisOptionBoxes()

        var duration = 2000;
        var width = d3.min([window.innerHeight,window.innerWidth]),
        height =width,
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


        topNodeValue = nodes[0].value
        nodes = nodes.filter(function(d) {return d.value > topNodeValue/10000})

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
            .attr("title",function(d) {
                return d[bookworm.query.aesthetic.x]
            })
            .transition()
        //          .duration(1000)
        //            .attrTween("d", arcTween(d)) //I can't get this to work.
            .attr("d", arc)

        path
            .makeClickable()

        path
            .on("click", click)

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

        var data = this.data
        var bookworm = this;

        newWords = JSON.parse(JSON.stringify(bookworm.query.search_limits.word))

        newWords = newWords.map(function(d) {
            out = data.filter(function(datum) {
                return datum.unigram==d;
            })[0]
            out.extraField = 1;
            return out;
        })

        data = data.concat(newWords)

        layout = d3.layout.paragraph()
            .label(function(d) {return d.unigram})
            .rowLength(window.innerWidth)
            .style("font-size:24pt")
            .padding({"x":10,"y":24})

        newData = layout.points(newWords.filter(function(d) {
            return out.extraField;
        }))

        yVar =
            function(d) {
                return (d.WordCount + d.TotalWords)/2
            }

        xVar =
            function(d) {if (d.WordCount==0) {d.WordCount=.5}; return d.WordCount/d.TotalWords}

        var x = d3.scale.log().domain(d3.extent(data.map(xVar))).range([30,window.innerWidth*.8])
        var y = d3.scale.log().domain(d3.extent(data.map(yVar))).range([window.innerHeight*.8,75])

        var delay = d3.scale.linear().domain(x.range()).range([0,1000])

        delayTime = 5000
        shrinkTime = 2000

        points= d3
            .select("#svg")
            .selectAll("text.arrayed")
            .data(data,function(d) {return d.unigram})

        points
            .transition()
            .duration(2500)
            .attr("x",function(d) {return x(xVar(d))})
            .attr("y",function(d) {return y(yVar(d))})
            .filter(function(d) {
                if(d.age===undefined) {d.age=0}
                d.age = d.age + 1;
                return d.age > 1;
                //only shrink the old ones.
            })
            .style("opacity",.65)
            .style("fill","white")
            .style("font-size","12")


        points
            .exit()
            .transition()
            .duration(1000)
            .style("opacity",0)
            .each(function(d) {console.log(d)})
                .remove()

        var newElements = d3
            .select("#svg")
            .selectAll("text.paragraph")
            .data(newData)

        newElements
            .enter()
            .append("text")
            .attr("class","arrayed")
            .attr("style","fill:red;font-size:24pt")
            .attr("transform","translate(0," + layout.padding().y + ")")
            .style("opacity",0)
            .attr("x",function(d) {
                return d.x;
            })
            .attr("y",function(d) {return d.y})
            .transition().duration(1500)
            .delay(function(d,i) {return i * 1000/10})
            .text(function(d) {return d.unigram})
            .style("opacity",1)

    },

    colorSchemes : {
        RdYlGn : colorbrewer["RdYlGn"][5].slice(0,4).reverse()
    },

    selections : {    },
    dataTypes  : {    },
    plotTransformers : {   },
    makePlotArea: function(svgSelection) {

        var bookworm = this;
        //create if not exists
        //console.log(bookworm.query.plotType,this.selections)

        var root = svgSelection || this.selections.container;
        root = root || d3.selectAll("#svg");

        root = root.data([1])

        root.enter().append("svg").attr("id","svg")

        if (!root.selectAll("#plotBackground")[0].length) {
            this.selections.background = root.append("g").attr("id","plotBackground")
        }

        this.selections.container = root;
        this.selections.mainPlotArea = root.selectAll("#mainPlotArea").data([1])
        this.selections.mainPlotArea.enter().append("g").attr("id","mainPlotArea")

        if (!root.selectAll("#plotOverlay")[0].length) {
            this.selections.overlay = root.append("g").attr("id","plotOverlay")
        }

        //A tooltip:


        var tooltip = d3.select("body")
            .selectAll("div.tooltip").data([1])

        tooltip.enter()
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style('position','absolute');

        this.selections.tooltip = tooltip



    },

    heatmap : function() {
        var bookworm = this;
        var parentDiv = d3.select("#selectionOptions")

        bookworm.alignAesthetic()
        bookworm.addFilters(
            {
                "word":"textArray"
            },
            parentDiv
        )


        bookworm.addAestheticSelectors(
            {
                "y":"categoricalAesthetic",
                "x":"categoricalAesthetic",
                "color":"numericAesthetic"
            },
            parentDiv)

        var w = window.innerWidth*.9,h=window.innerHeight*.9

        var myQuery = bookworm.query
        var colorScaler = bookworm.returnScale()
        var sizeScaler  = bookworm.returnScale()
        var mainPlotArea= bookworm.selections.mainPlotArea


        transition=200

        var scales = bookworm.updateAxes(delays = {"x":0,"y":0},transitiontime=transition)

        var xstuff = scales[0]
        var ystuff = scales[1]


        var x = xstuff.scale
        var y = ystuff.scale

        bookworm.scales.x = x;

        bookworm.data = bookworm.data.map(function(d) {
            d.key = d[myQuery['aesthetic']['x']] + "-" + d[myQuery['aesthetic']['y']]
            return(d)
        })


        if (myQuery['scaleType']==undefined) {myQuery['scaleType'] = "linear"}

        var colorValues = bookworm.data.map(function(d) {
            return(d[myQuery['aesthetic']['color']])
        })

        bookworm.scales.color = colorScaler
            .values(colorValues)
            .scaleType(d3.scale[myQuery['scaleType']])()

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

        xVariable = myQuery.aesthetic.x
        yVariable = myQuery.aesthetic.y


        var colorbar = Colorbar()
            .scale(bookworm.scales.color)
            .thickness(10)
            .barlength(x.range()[1] - x.range()[0] - 30)
            .orient("horizontal")

        var colorscale = bookworm.selections.container.selectAll("g.color.scale").data([
            {"x":x.range()[0] + 15,"y":0}
        ])
        colorscale.enter().append("g").attr("class","color scale")
        colorscale.attr("transform",function(d) {return "translate(" + d.x + "," + d.y + ")"})

        bookworm.legends.color = colorscale.call(colorbar)

        colorscale.selectAll('rect').style("stroke","none")

        colorscale.call(drag)

        gridPoint
            .attr('x',function(d) {return x(bookworm.plotTransformers[xVariable](d[xVariable]))})
            .attr('y',function(d) {return Math.round(y(bookworm.plotTransformers[yVariable](d[yVariable])))})
            .attr('height', y.pixels)
            .attr('width', x.pixels)
            .makeClickable(bookworm.query,bookworm.legends.color,bookworm)
            .transition()
            .duration(2500)
            .style('fill',function(d) {
                var color = bookworm.scales.color(d[myQuery['aesthetic']['color']]);
                if (d[myQuery['aesthetic']['color']]==0) {color='#393939'}
                if (color=="#000000") {color='#393939'}
                return color;
            })

        bookworm.legends.color.update(bookworm.scales.color)



    },


    streamgraph : function() {


        var LimitTo = 10
        var bookworm = this;
        var parentDiv = d3.select("#selectionOptions")

        bookworm.alignAesthetic()
        bookworm.addFilters(
            {
                "word":"textArray"
            },
            parentDiv
        )

        bookworm.query.scaleType = "linear"

        bookworm.addAestheticSelectors(
            {
                "x":"categoricalAesthetic",
                "y":"numericAesthetic",
                "fill":"categoricalAesthetic"
            },
            parentDiv)

        var w = window.innerWidth*.9,h=window.innerHeight*.9
        var limits = {'x':[w*.1,w*.66],'y':[75,h*.95]}
        var myQuery = bookworm.query
        var colorScaler = bookworm.returnScale()

        var mainPlotArea= bookworm.selections.mainPlotArea

        transition=0

        var scales = bookworm.updateAxes(delays = {"x":0,"y":0},transitiontime=transition)

        var xstuff = scales[0]

        var ystuff = scales[1]

        var x = xstuff.scale

        bookworm.scales.x = x;

        topEntries = d3.nest()
            .key(function(d) {return d[bookworm.query.aesthetic.fill]})
            .rollup(function(leaves) {
                counts = leaves.map(function(entry) {return entry[bookworm.query.aesthetic.y]})
                return d3.sum(counts)})
            .entries(bookworm.data)


        topEntries.sort((function(a,b) {return b.values - a.values}))
        keeping = d3.set(topEntries.map(function(d) {return d.key}).slice(0,LimitTo))

        var data = bookworm.data.filter(function(d) {return keeping.has(d[bookworm.query.aesthetic.fill])})
        bookworm.data = data
        //                  .sort(function(a,b) {return a[values]-b[values]}))



        var stack = d3.layout.stack()
            .offset("silhouette")
            .x(function(d) {return d[bookworm.query.aesthetic.x]})
            .y(function(d) {return d[bookworm.query.aesthetic.y]})


        var yearlist = d3.set(bookworm.data.map(function(d) {return d[bookworm.query.aesthetic.x]})).values()

        var as2D = d3.nest().key(function(d) {return d[bookworm.query.aesthetic.fill]}).entries(data).map(function(d) {return d.values})

        as2D.forEach(function(colorset) {
            var color = colorset[0][bookworm.query.aesthetic.fill]
            var years = d3.set(yearlist)
            colorset.forEach(function(d) {years.remove(d[bookworm.query.aesthetic.x])})
            years.forEach(function(newYear) {
                var newObj = new Object;
                newObj[bookworm['query']['aesthetic']['x']] = newYear;
                newObj[bookworm.query.aesthetic.y] = 0;
                newObj[bookworm.query.aesthetic.fill] = color
                colorset.push(newObj)
            })
        })

        var xVariable = bookworm.query.aesthetic.x
        as2D.forEach(function(array) {array.sort(function(a,b){return a[xVariable] - b[xVariable]})})


        var layers0 = stack(as2D)



        var vals = layers0.map(function(d) {return d.map(function(e) {return ([e.y0,e.y+e.y0])})})
        vals =  [].concat.apply([],[].concat.apply([],vals))

        console.log(d3.extent(vals))
        var min = d3.min(vals)
        var y = ystuff.scale.domain([d3.min(vals),d3.max(vals)])
        console.log(y.domain())
        bands = mainPlotArea.selectAll("path.plotElement")
            .data(layers0)

        bands
            .enter().append("path").attr("class","plotElement")

        colorValues = bookworm.data.map(function(d) {
            return(d[bookworm.query.aesthetic.fill])
        })

        bookworm.scales.color = d3.scale.category20().domain(colorValues)

        var area = d3.svg.area()
            .interpolate("cardinal")
            .x(function(d) {var xval= x(bookworm.plotTransformers[xVariable](d[bookworm.query.aesthetic.x]));return xval;})
            .y0(function(d) { return y(d.y0); })
            .y1(function(d) { return y(d.y0 + d.y); });

        bands
            .attr("d", area)
            .style("fill", function(d) {return bookworm.scales.color(d[0][bookworm.query.aesthetic.fill]); });

        bands.makeClickable()

        //Add a color scale



        function makeColorScale() {

            legendscale = d3.svg.legend()
                .inputScale(bookworm.scales.color).orientation("vertical")
                .labelFormat("none")
                .cellPadding(4)
                .units(bookworm.query.aesthetic.color)

            d3.selectAll(".color.scale").remove()


            var w = bookworm.selections.container.attr("width")
            var h = bookworm.selections.container.attr("height")
            var legendg = bookworm
                .selections.container.append("g")
                .attr("id","scale")
                .classed("color scale",true)
                .classed("axis",true)
                .attr("transform","translate(" + w * .8+ ","+  h*.05+ ")")

            legendg.call(legendscale)
        }

    },
    "getSVGDimensions" : function() {
	var bookworm = this;
        var w = bookworm.selections.container.attr("width") || bookworm.selections.container.style("width").replace("px","")
        var h = bookworm.selections.container.attr("height") || bookworm.selections.container.style("width").replace("px","")
	var dims = {"width":w,"height":h}
	return dims;
	
    },
    makeDiscreteColorLegend : function(colorscale) {
        var bookworm = this;
        var container = bookworm.selections.container

        var legendscale = d3.svg.legend()
            .inputScale(colorscale).orientation("vertical")
            .labelFormat("none")
            .cellPadding(4)
            .units(bookworm.query.aesthetic.color)

        container.selectAll(".color.scale").remove()

	var dims = bookworm.getSVGDimensions()
        var legendg = bookworm
            .selections
	    .container
	    .append("g")
            .attr("id","scale")
            .classed("color",true)
            .classed("scale",true)
            .classed("axis",true)
            .attr("transform","translate(" + (dims['width'] * .8)+ ","+ (dims['height']*.05) + ")")

        legendg.call(legendscale)
    },


    settings:{
        //things we need to remember for plotting preferences.
        "lastPlotted":null,
    },

    timeHandler: function(timeHandler,callback) {

        // This is a rather elaborate mechanism to handle plotting a chart with a time dimension:
        //after passing it a time handler (or nothing) and a callback function, it will
        // repeatedly advance the timeframe (based on the aesthetic["time"] element of query)
        // and reinvoke the callback function, which is a plot function.

        var bookworm = this;
        var timeHandler = timeHandler || {};
//        var mainPlotArea = this.selections.mainPlotArea;
	var container = this.selections.container
	var parent = d3.select(this.selections.container.node().parentNode)
        var query = bookworm.query;

        timeHandler.timeSlider = function() {
            timeHandler.axisScale = d3.scale.linear().domain(timeHandler.timeScale.domain()).range([50,1000]).clamp(true)

            timeHandler.axis = d3.svg.axis().scale(timeHandler.axisScale).orient("bottom").tickFormat(function(d) {return d}).ticks(12)




            var getDate2 = function(intval) {
                var val = new Date();
                val.setFullYear(0,0,intval+1)
                //console.log(intval,"----------",val)
                return val
            }

            timeRegex = new RegExp("_week|_month|_day")
            if (timeRegex.test(bookworm.query.aesthetic.time)) {
                timeHandler.axis.tickFormat(function(time) {
                    var timevar = getDate2(time)
                    return timevar.toDateString().substring(4)
                })
            }

	    var width = container.attr('width') || container.style("width")
	    var parentGroup = parent.selectAll("svg.axis.time").data([1])
	    parentGroup.enter().append("svg").attr("class","time axis").style("height",30).style("width",width)

            timeHandler.axisGroup = parentGroup.selectAll(".axis.time").data([1])
            timeHandler.axisGroup.enter()
		.append("g").attr("class","time axis")
		.attr('transform',"translate(0,10)")

            timeHandler.axisGroup.call(timeHandler.axis)

            timeHandler.currentTime =timeHandler.timeScale.domain()[0]

            var marker = timeHandler.axisGroup.selectAll("g.marker")

            var drag = d3.behavior.drag()
                .on("dragstart",function() {
                    clearTimeout(bookworm.nextEvent)
                    timeHandler.inmotion = false
                })
                .on("drag",function() {
                    timeHandler.currentTime = Math.round(timeHandler.axisScale.invert(d3.event.x));
                    d3.select(this).attr("transform","translate(" + timeHandler.axisScale(timeHandler.currentTime) + ",0)")
                    timeHandler.tickTo(timeHandler.currentTime)
                })
                .on("dragend",function() {
                    //timeHandler.inmotion = true;
                    //tickTo(timeHandler.currentTime)
                })

            marker
                .data([1])
                .enter()
                .append('g')
                .attr("class","axis marker")
                .attr('id',"timeSlider")
                .attr("transform","translate(" + timeHandler.axisScale(timeHandler.currentTime) + ",0)")
                .append("circle")
                .attr("r",10)
                .style("fill","red")
                .on("click",function() {
                    timeHandler.currentTime = Math.round(timeHandler.axisScale.invert(d3.event.x));
                    timeHandler.inmotion=true;
                    timeHandler.tickTo(timeHandler.currentTime)

                })

            timeHandler.axisGroup.on("click",function(d) {
                timeHandler.currentTime = Math.round(timeHandler.axisScale.invert(d3.event.x));
            })
            timeHandler.axisGroup.select("#timeSlider").call(drag)

        }

        /**
           Old code from HEAD, 7/13/14/?
           data.sort(function(a,b) {
           return (a[bookworm.query.aesthetic.size] - b[bookworm.query.aesthetic.size])
           })

           data.forEach(function(d) {
           try {
           d.coordinates = JSON.parse(d[query.aesthetic.point]).reverse();
           } catch(err) {
           d.coordinates = [null,null]
           }

           d.type="Point";
           })
        **/
        timeHandler.inmotion = true

        nester = d3.nest().key(function(d) {return parseInt(d[bookworm.query.aesthetic.time])})

        var smoothingSpan = 0 || bookworm.query.smoothingSpan


        if(smoothingSpan > 0) {
            var rawData = bookworm.smooth();
            var filtered = rawData.filter(function(d) {return d[bookworm.query.aesthetic.size] > 0})
            timeHandler.nested = nester.map(filtered)
        } else {
            timeHandler.nested = nester.map(bookworm.data)
        }

        timeHandler.timeScale = d3.scale.linear().range([0,70000]).domain(d3.extent(bookworm.data.map(function(d) {return d[bookworm.query.aesthetic.time]})))

        timeHandler.timeSlider()

        timeHandler.data = function(x) {
            if (!arguments.length) {
                //There are occasions when there may be internal smoothed points without any data at all: those should be empty arrays, not just undefined.
                returnable = timeHandler.nested[timeHandler.currentTime]
                if (typeof(returnable)=="undefined") {
                    return []
                } else {
                    return(returnable)
                }
            }
            data = x;
            return timeHandler;
        }

        timeHandler.callback = function(x) {
            if (!arguments.length) return callback;
            callback= x
            return timeHandler
        }

        timeHandler.tickTo = function(time) {
            timeHandler.currentTime = time;
            if (timeHandler.currentTime > timeHandler.timeScale.domain()[1]) {
                timeHandler.inmotion=false
            } else {
		timeHandler.axisGroup
                    .selectAll("#timeSlider")
                    .transition()
                    .duration(Math.abs(timeHandler.timeScale(1)-timeHandler.timeScale(0)))
                    .ease("linear")
                    .attr("transform","translate(" + timeHandler.axisScale(timeHandler.currentTime) + ",0)")
                callback(timeHandler);
            }
        }

        return timeHandler
    },
    mapPoints: function(proj,timeHandler) {
        //This drops point on a map: if "time" is one of the dimensions to the plot, it also animates them.

        //Drops a bunch of points, regardless of what sort of map there is.
        var bookworm = this;

        var query = bookworm.query;
        var data = bookworm.data;
        var duration = 300;

        //of displayed points.
        var topsize = 60,minsize=3;

        // Set up color scale:
        var mainPlotArea = this.selections.mainPlotArea;

        if (bookworm.query.aesthetic.color != undefined) {
            var colorValues = data.map(function(d) {
                return(d[bookworm.query.aesthetic.color])
            })
            bookworm.query['scaleType'] = bookworm.query['scaleType'] || "log"
            bookworm.scales.color = bookworm
                .returnScale()
                .values(colorValues)
                .scaleType(d3.scale[bookworm.query['scaleType']])()
        }
        if (timeHandler==undefined & bookworm.query.aesthetic.color != undefined) {
            bookworm.legends.color = Colorbar()
                .scale(bookworm.scales.color)
        }



        var sizeScale = d3.scale.sqrt().range([minsize,topsize]).domain(d3.extent(bookworm.data.map(function(d) {return d[bookworm.query.aesthetic.size]})))

        if (sizeScale.domain()[0]==0) {sizeScale.range([0,topsize])}

        bookworm.query.database=="boston"? sizeScale = function(x) {return 5} : {}


        /**
           TIME HANDLING
           This code should be generally portable, except that
           (in this case) we're passing a "proj" as well as a timeHandler item
           as the argument to the function.

           This needs to be done here because it resets the data to a subset,
           but we want the scales to be continuous across the whole range of data.
        **/
        if (bookworm.query.aesthetic.time != undefined) {

            //create a time handler if it doesn't exist;
            if (typeof(timeHandler) == 'undefined') {
                timeHandler = this.timeHandler(
                    timeHandler,
                    callback = function(timeHandler) {
                        bookworm.mapPoints(proj,timeHandler)
                    })
            }
            //set the data to that for the particular time we're in:
            data = timeHandler.data()

            //set the duration to

            duration = Math.abs(timeHandler.timeScale(1)-timeHandler.timeScale(0))
        }
        /**
           END TIME HANDLING
        **/


        data.forEach(function(d) {
            try {
                d.coordinates = JSON.parse(d[query.aesthetic.point]).reverse();
            } catch(err) {
                d.coordinates = [undefined,undefined]
            }
            d.type="Point";
        })

        data = data.filter(function(d) {return d[bookworm.query.aesthetic.size] > 0})

        var nullpath = d3.geo.path().projection(proj)
            .pointRadius(0)

        var basicPath = d3.geo.path().projection(proj)
            .pointRadius(10)

        var path = d3.geo.path().projection(proj)
            .pointRadius(function(d) {
                return sizeScale(d[bookworm.query.aesthetic.size])
            })

        var points = mainPlotArea.selectAll("path.point")
            .data(data,function(d) {

                return d[bookworm.query.aesthetic.point] + d[bookworm.query.aesthetic.label]
            })

        var getColor = function(d) {
            var val = bookworm.scales.color(d[bookworm.query.aesthetic.color]) || "green"
            return val;
        }

        //opacity scaling will be different depending on the number of points.

        var opacityguess = d3.scale.log().domain([10,60000]).range([.7,.05])
        opacityguess.clamp(true)

        points
            .enter()
            .append("path")
            .style("fill",getColor)
            .attr("d",nullpath)
            .attr("class","point")
            .style("opacity",opacityguess(data.length))

        points
            .transition()
            .ease("linear")
            .duration(duration)
            .style("fill",getColor)
            .attr("d",path)

        points
            .exit()
            .transition()
            .duration(duration)
            .attr("d",nullpath)
            .remove()

        points.makeClickable(bookworm.query,bookworm.legends.color)


        if (timeHandler!=undefined) {
            if (bookworm.query.aesthetic.time != undefined & timeHandler.inmotion) {
                clearTimeout(bookworm.nextEvent)
                bookworm.nextEvent = setInterval(function() {
                    //XXX animation off
                    timeHandler.tickTo(timeHandler.currentTime + 1)
                },duration/2)
            }
        }

        /**MIDPOINT: just for fun:
           an optional secretic query called "midPointBy"
        **/



        if (bookworm.query.midPointBy!=undefined) {
            var sizer = bookworm.query.aesthetic.size

            midPointer = d3.nest()
                .key(function(d) {return d[bookworm.query.midPointBy]})
                .rollup(function(leaves) {
                    var total = d3.sum(leaves.map(function(d) {return d[sizer]}))
                    return (
                        {"coordinates":[
                            d3.sum(leaves.map(function(d) {return d[sizer]*d.coordinates[0]}))/total,
                            d3.sum(leaves.map(function(d) {return d[sizer]*d.coordinates[1]}))/total],
                         "type":"Point",
                         "TextCount":d3.sum(leaves.map(function(d) {return d.TextCount}))}
                    )                                                                                                  })
            var midPoints = midPointer.entries(data)
            midPoints.forEach(function(d) {
                d3.keys(d.values).forEach(function(key) {
                    d[key] = d.values[key]
                })
            })
            var midpointP = mainPlotArea.selectAll("path.midPoint").data(midPoints,function(d) {return d["key"]})
            midpointP.enter().append("path").attr("class","midPoint")
                .attr("d",nullpath).attr("id","midPoint")
                .style("fill","orange")

            midpointP.transition().duration(duration).attr("d",path)
            midpointP.exit().transition().attr("d",nullpath).remove()
        }
    },
    map : function() {
        var mainPlotArea = this.selections.mainPlotArea;
        var container = this.selections.container
        foobar = container

        var width = container.attr("width") || container.style("width").replace("px","")
        var height = container.attr("height") || container.style("height").replace("px","")



        var bookworm = this;
        var parentDiv = d3.select("#selectionOptions")
        bookworm.addFilters(
            {
                "word":"textArray"
            },
            parentDiv
        )
        bookworm.addAestheticSelectors(
            {
                "point":"categoricalAesthetic","size":"numericAesthetic","color":"numericAesthetic","label":"categoricalAesthetic","time":"categoricalAesthetic"
            },
            parentDiv
        )

        var query=bookworm.query;

        bookworm.data.sort(function(a,b) {
            return parseFloat(b[query['aesthetic']['size']] - a[query['aesthetic']['size']])
        })


        var proj

        if (bookworm.projection) {
            //Anyone can custom-define a projection at bookworm.projection.
            var proj = bookworm.projection
        } else {
            if (bookworm.query.projection=="mercator") {
                proj = d3.geo.mercator().scale(220)
            }

            if (bookworm.query.projection=="azimuthal") {
                proj = d3.geo.azimuthalEqualArea()
                    .clipAngle(180 - 1e-3)
                    .scale(275)
                    .translate([width/2, height/2])
                    .precision(.1);
            }
            if (bookworm.query.projection=="albers") {
                proj = d3.geo.albers()
		    .center([0,0])
		    .scale(250).translate([width/2,height*(2/3)])
            }
            if (bookworm.query.projection=="USA") {
                proj = d3.geo.albersUsa()
            }

            if (bookworm.query.projection=="europe") {
                proj = d3.geo.azimuthalEqualArea()
                    .clipAngle(180 - 1e-3)
                    .scale(1200)
                    .center([10,45])
                    .translate([width/2, height/2])
            }

        }


        if (bookworm.query.database=="boston") {
            proj = d3.geo.mercator().center([-71.0636,42.2881]).scale(123000)//.translate([width/2, height / 2])
        }

        if (bookworm.query.database=="SOTUgeo" || bookworm.query.database=="FRUS") {
            proj = d3.geo.mercator()
            //.center([0,0])
                .scale(140)
            //.translate([width / 2, height / 2])
        }

        bookworm.projection = proj


        var polygons = mainPlotArea.selectAll("#mapregion").data([1])

        polygons.enter().append("g").attr("id","mapregion")

        var target
        bookworm.query.database=="boston" ?
            target = "data/boston/neighborhoods.topojson" :
            target = "data/world-countries.json"

        d3.json(target, function(error, mapElements) {
            if (error) {
                d3.json("../bookwormD3/" + target,function(error,mapElements) {
		    if (error) {}
		    callback(mapElements)
		})
            } else {
		callback(mapElements)
	    }

            function callback(mapElements) {
                var itAll = polygons.selectAll("path").data([mapElements])

                if(bookworm.query.database=="boston") {
                    var itAll = polygons.selectAll("path").data(topojson.feature(mapElements, mapElements.objects.collection).features)
                }


                itAll.enter()
                    .append("path")
                    .attr("d", d3.geo.path().projection(proj))
                    .style("fill","black")
                    .style("fill-opacity",.1)
                    .style("stroke-opacity",.1)
                    .style("stroke","black")
            }


        });
        bookworm.mapPoints(proj)
    },
    network : function() {
        var bookworm = this;
        var query = bookworm.query;
        var data = bookworm.data;

        var parentDiv = d3.select("#selectionOptions")
        bookworm.addAestheticSelectors({
            "node":"categoricalAesthetic",
            "edgeVariable":"categoricalAesthetic",
            "width":"numericAesthetic",
            "size":"numericAesthetic"
        },parentDiv)


        var svg = this.selections.container

        var color = d3.scale.category20();


        var nodes = {}
        var edges = {}

        clusters = d3.nest().key(function(d) {return d[query.aesthetic.edgeVariable]}).entries(data)
        clusters.forEach(function(cluster) {
            var name = cluster.key
            while (bit=cluster.values.pop()) {
                var masterKey = bit[query.aesthetic.node]

                nodes[masterKey] = nodes[masterKey] === undefined ?
                    //bit[query.aesthetic.size] :
                    //nodes[masterKey] + bit[query.aesthetic.size]
                    1:
                    1 + nodes[masterKey]
                cluster.values.forEach(function(remaining) {
                    newKey = remaining[query.aesthetic.node]
                    alph = [newKey,masterKey].sort()
                    var combinedKey = alph[0] + "___JOIN___" + alph[1]
                    edges[combinedKey] = edges[combinedKey]===undefined ?
                        1 :
                        edges[combinedKey] + 1
                })
            }
        })

        edgeCodes = {}



        nodes = d3.keys(nodes).map(function(key,i) {out = {}; out.name = key; out.size = nodes[key]; out.color = null; edgeCodes[key] = i; return out})

        edges = d3.keys(edges).map(function(key,i) {
            values = key.split("___JOIN___")
            out = {}
            out.source = nodes[edgeCodes[values[0]]]
            out.target = nodes[edgeCodes[values[1]]]


            out.source.count = out.source.count + edges[key] || edges[key]
            out.target.count = out.target.count + edges[key] || edges[key]

            out.value = edges[key]
            return out
        })

        edgedNodes = d3.set()


        edges.forEach(function(d) {
            //geometric mean seems more appropriate?
            d.meanShare = (d.value/d.source.count +  d.value/d.target.count)
        })

        //sort by descending meanShare
        edges.sort(function (a,b) {return b.meanShare-a.meanShare})

        meanLinks=5;
        edges = edges.slice(0,nodes.length*meanLinks)

        linkScale = d3.scale.linear().domain(d3.extent(edges.map(function(d) {return d.meanShare}))).range([120,30])
        linkScale.clamp()

        var force = d3.layout.force()
            .charge(-90)
            .linkDistance(function(d) {
                return linkScale(d.meanShare)
            })
            .size([svg.attr("width"), svg.attr("height")]);


        edges.forEach(function(d) {
            edgedNodes.add(d.source.name)
            edgedNodes.add(d.target.name)
        })

        nodes = nodes.filter(function(d) {return edgedNodes.has(d.name)})



        nodge = edges

        force
            .nodes(nodes)
            .links(edges)


        force
            .start();

        var link = svg.selectAll(".link")
            .data(edges)
            .enter().append("line")
            .attr("class", "link")
            .style("stroke","grey")
            .style("stroke-opacity",.1)
            .style("stroke-width", function(d) { return Math.sqrt(d.value); });

        var node = svg.selectAll(".node")
            .data(nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", 5)
            .style("fill", function(d) { return color(d.group); })
            .call(force.drag);

        node.append("title")
            .text(function(d) { return d.name; });

        force.on("tick", function() {
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node.attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
        });

    },
    linechart : function() {

        var mainPlotArea = this.selections.mainPlotArea;
        var bookworm = this;
        var query=bookworm.query;

        bookworm.data=bookworm.data.filter(function(d) {
            return d[bookworm.query.aesthetic.y] != undefined & !isNaN(d[bookworm.query.aesthetic.y])
        })

        var parentDiv = d3.select("#selectionOptions")
        bookworm.addFilters({
            "word":"textArray"  },
                            parentDiv
                           )
        bookworm.addAestheticSelectors({
            "y":"numericAesthetic",
            "x":"categoricalAesthetic",
	    "color":"categoricalAesthetic"},
                                       parentDiv)



        bookworm.data.sort(function(a,b) {
            return parseFloat(a[query['aesthetic']['x']] - b[query['aesthetic']['x']])
        })

        var smoothingSpan = this.smoothingSpan || 0;
        var scales = this.updateAxes()
        var xstuff = scales[0]
        var ystuff = scales[1]
        var x = xstuff.scale
        var y = ystuff.scale

        this.xstuff = xstuff;

        //make the lines
        var lineGenerator = d3.svg.line()
            .x(function(d) {
                name = query['aesthetic']['x']
                var value = x(bookworm.plotTransformers[name](d[name]));
                return value})
            .y(function(d) {
                var value =
                    y(bookworm.plotTransformers[query['aesthetic']['y']](d[query['aesthetic']['y']]));
                return value })

        var nestedData = d3.nest().key(function(d) {
            return d[query['aesthetic']['color']]
        }).entries(bookworm.data)


        getColor = function(d) {return colorscale(d[query.aesthetic.color])}

        if (typeof(query['aesthetic']['color']) != 'undefined') {
            topColors = bookworm.topn(255,query['aesthetic']['color'],bookworm.data)

            colorscale = d3.scale.category10()
                .domain(topColors)
	    console.log(topColors)
	    bookworm.makeDiscreteColorLegend(colorscale)
        } else {
            var colors = d3.scale.category20().range().concat(d3.scale.category20b().range()).concat(d3.scale.category20c().range())
            colors = colors.concat(colors).concat(colors).concat(colors)
            var colorscale = d3.scale.category20c().domain(y.domain()).range(colors)
	    bookworm.scales.color=colorscale
            getColor = function(d) {return colorscale(d[query.aesthetic.y])}
        }

        var lines = mainPlotArea
            .selectAll('g.line')
            .data(nestedData,function(d) {return d['key']})

        var newlines = lines
            .enter()
	    .append("g")
	    .attr("class","line")

	newlines
            .append("path")
            .attr('class','line')
	    .style("stroke",function(d) {return colorscale(d.key)})

        lines.exit().transition().style("opacity",0).remove()

        lines.each(
	    function(d) {
		var group = d3.select(this)
		group
		    .selectAll("path")
		    .transition()
		    .duration(2000)
		    .attr('d',lineGenerator(d.values))
		    .style("stroke-width",3)

		var circles = group
		    .selectAll('circle.selector')
		    .data(d.values)
		
		circles.exit().remove()

		circles.enter().append('circle').attr("class","selector")

		circles
		    .style('opacity','.01')
		    .style("stroke","black")
		    .style("stroke-width",10) // Give the points a penumbra
		    .style("stroke-opacity",0)

		circles.makeClickable()


		circles
		    .on('mouseover',function(d) {
			d3.select(this)
			    .style('opacity','1')
			group.selectAll("path").transition().style('stroke-width','6')
		    })
		    .on('mouseout',function(d) {
			d3.select(this).style('opacity','.01')
			group.selectAll("path").transition().style('stroke-width','3')
		    })
		    .attr('cx',function(d) {
			var name = query['aesthetic']['x']
			return x(bookworm.plotTransformers[name](d[name]))})
		    .attr('cy',function(d) {return y(parseFloat(d[query['aesthetic']['y']]))})
		    .attr("r",6)
		    .style('fill',colorscale(d.key));
//
	    })
	
        bookworm.alignAesthetic()



    },

    sparkline : function() {

        //we write directly on the container, here.

        var mainPlotArea = this.selections.container;

        mainPlotArea.selectAll("child").remove()
        var bookworm = this;

        bookworm.data=bookworm.data.filter(function(d) {
            return d[bookworm.query.aesthetic.y] != undefined & !isNaN(d[bookworm.query.aesthetic.y])
        })

        var query=bookworm.query;

        bookworm.data.sort(function(a,b) {
            return parseFloat(b[query['aesthetic']['x']] - a[query['aesthetic']['x']])
        })

        var smoothingSpan = this.smoothingSpan || 0;



        var x = d3.scale.linear()
            .range([3,mainPlotArea.attr("width")-3])
            .domain(d3.extent(bookworm.data.map(function(d) {return parseFloat(d[bookworm.query.aesthetic.x])})))

        var y = d3.scale.linear().range([mainPlotArea.attr("height")-3,3]).domain(d3.extent(bookworm.data.map(function(d) {return parseFloat(d[bookworm.query.aesthetic.y])})))


        //make the lines
        var lineGenerator = d3.svg.line()
            .x(function(d) { return x(d[query['aesthetic']['x']])})
            .y(function(d) { return y(d[query['aesthetic']['y']])})



        var nestedData = d3.nest().key(function(d) {
            return 1
        }).entries(bookworm.data)


        var points = this.selections.mainPlotArea
            .selectAll('.line');

        var selection = points
            .data(nestedData,function(d) {return d['key']})

        selection
            .enter()
            .append("path")
            .attr('class','line')

        selection.exit().remove()

        selection
            .attr('d',function(d) {
                return lineGenerator(d.values)
            })

        var circles = mainPlotArea.selectAll('circle.selector').data([bookworm.data[0]])

        circles.enter().append('circle').attr("class","selector")

        circles.exit().remove()


        //these need to belong to the line somehow.
        circles
            .attr('cx',function(d) {
                name = query['aesthetic']['x']
                return x(d[query['aesthetic']['x']])})
            .attr('cy',function(d) {return y(parseFloat(d[query['aesthetic']['y']]))})
            .attr("r",6)
            .attr('fill','red')

        //        bookworm.query.aesthetic['y'] = JSON.parse(oldy)
        bookworm.alignAesthetic()

        circles.makeClickable()

    },

    updateAxes : function(delays,transitiontime,yVariable,margins) {
        var bookworm = this;

        yVariable = yVariable || "y"
        transitiontime = (typeof(transitiontime)!="undefined") ? transitiontime : 2000;

        delays = (typeof(delays) != "undefined") ? delays : {"x":0,"y":0}

        var bookworm = this;
        var mainPlotArea = this.selections.mainPlotArea;
        var ystuff

        var w = bookworm.selections.container.attr("width") || (bookworm.selections.container.style("width") || window.innerWidth)
        var h = bookworm.selections.container.attr("height") || (bookworm.selections.container.style("height") ||  window.innerHeight)

        w = w.replace("px","")
        h = h.replace("px","")

        console.log(h)

        if (typeof(margins) != "undefined") {
            limits = {'x':[margins['x'][0],w-margins['x'][1]],'y':[margins['y'][0],h-margins['y'][1]] }
        } else {
            //use bounding boxes to find how big the margins should be
            var widths = ['y','x'].map(function(axis) {
                bookworm.selections.container.selectAll("text.test").remove()
                var vals = d3.set(bookworm.data.map(function(d) {
                    return d[bookworm.query.aesthetic[axis]] })).values()
                var tmp = bookworm.selections.container.selectAll("text.test").data(vals)
                var width = 0;
                tmp.enter().append("text").text(function(d) {
                    if (typeof( bookworm.plotTransformers[bookworm.query.aesthetic[axis]])=="undefined") {return "100"}
                    d = bookworm.plotTransformers[bookworm.query.aesthetic[axis]](d)
                    console.log(typeof(d))
                    var text = typeof(d)=="number" ? "100" :d;
                    return text
                })
                    .each(function(d) {
                        var thisWidth = this.getBBox().width
                        width = thisWidth > width ? thisWidth : width
                    }).remove();

                return width
            })
            margins = {'x':[widths[0]+20,25+20],'y':[35,20+widths[1]]}
            // x-axis is always vertical
            margins['y'][1] = 50
            limits = {'x':[margins['x'][0],w-margins['x'][1]],'y':[margins['y'][0],h-margins['y'][1]] }

        }


        // If it's a heatmap, always sort by name. For barcharts, sort by value.
        bookworm.query.plotType=="heatmap" ?
            ystuff = bookworm.makeAxisAndScale('y',limits,"name",false) :
            ystuff = bookworm.makeAxisAndScale('y',limits,"value",false)



        var xstuff = bookworm.makeAxisAndScale('x',limits)

        var x = xstuff.scale
        var y = ystuff.scale



        if (xstuff.type=="numeric") {
            x.domain()[0] > 0 ?
                //              x.domain([0,x.domain()[1]]) :
                x.domain(x.domain()) :
                {}

        }

        var yaxis = mainPlotArea.selectAll('.y.axis').data([ystuff.axis])
        var xaxis = mainPlotArea.selectAll('.x.axis').data([xstuff.axis])

        yaxis.enter().append('g')
        xaxis.enter().append('g')

        //put in a new axis node if it isn't there.



        //axis creation/updating.
        yaxis
            .attr('transform','translate(' +ystuff.limits['x'][0] + ',0)')
            .transition()
            .delay(delays.y)
            .duration(transitiontime)
            .call(ystuff.axis)
            .attr("id","y-axis")
            .attr('class','y axis')


        var i = 1;
        m = setInterval(function() {
            i++;
            if (i> 20) {clearInterval(m)}
        },10)


        xaxis
            .attr('transform','translate(0,' + xstuff.limits['y'][1] + ')')
            .transition()
            .delay(delays.x)
            .duration(transitiontime)
            .call(xstuff.axis)
            .attr("id","x-axis")
            .attr('class','x axis')

        setTimeout(function() {bookworm.labelAxes()},transitiontime + d3.max([delays.x,delays.y]))

        return [xstuff,ystuff]




    },

    title: function() {
        //Title is a query visualization, naturally.
        this.selections.mainPlotArea.selectAll(".titleArea").transition().style("opacity",0).remove()
        var titleArea = this.selections.mainPlotArea.append("g").attr("class","titleArea")

        newTitle = "nothing"
    },

    table: function() {
        var bookworm = this;

        var area = bookworm.selections.container

        var table = area.selectAll('table').data([1])

        table.enter().append('table')


        var keys = bookworm.query.groups.concat(bookworm.query.counttype)

        var data = [keys]

        data = data.concat(bookworm.data.map(function(row) {
            return keys.map(function(key) {
                return row[key]
            })
        }))

        var rows = table
            .selectAll('tr')
            .data(data)

        rows
            .enter()
            .append("tr")
            .each(function(row) {
                rowelement = d3.select(this)
                td = rowelement.selectAll('td').data(row)
                td.exit().remove()
                td.enter().append('td').text(function(d) {return d})
            })

                rows
            .exit()
            .remove()

    },
    wordcloud : function() {
        var n = 1
        var bookworm = this;

        var query = bookworm.query;
        var mainPlotArea = bookworm.selections.mainPlotArea;
        var svg = this.selections.container

        var parentDiv = d3.select("#selectionOptions")

        var sizes = bookworm.data
            .map(function(d) {return Math.abs(d[query.aesthetic.size])})

        var sizer = d3.scale.sqrt()
            .domain(d3.extent(sizes))
            .range([1,150])

        var words = bookworm.data
            .filter(function(d) {return Math.abs(d[query.aesthetic.size]) > 20})
            .map(function(d) {
                return {
                    "text":d[query.aesthetic.label],
                    "color":"black",
                    "size":sizer(Math.abs(d[query.aesthetic.size])),
                    "color":d[query.aesthetic.size] > 0,
                }})

        d3.layout.cloud()
            .size([svg.attr("width"),svg.attr("height")])
            .words(words)
            .padding(0)
            .rotate(function() { return Math.floor(Math.random()*10-5)*3})
            .font("Impact")
            .fontSize(function(d) { return d.size })
            .on("end", draw)
            .start();

        function draw(words) {
            var container = mainPlotArea.selectAll("g.wordcloud.container").data([1])
            container.enter().append("g").attr("class","wordcloud container")
                .attr("transform", "translate(" + window.innerWidth*.45 + "," + window.innerHeight*.4+ ")")

            var selection = container
                .selectAll("text")
                .data(words,function(d) {return d.text})

            selection
                .enter().append("text")
                .text(function(d) { return d.text; })
                .style("font-size", function(d) { return d.size + "px"; })
                .style("font-family", "Impact")
                .style("fill", function(d) { return d.color? "red": "black"; })
                .attr("text-anchor", "middle")
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })

            selection
                .style("font-size", function(d) { return d.size + "px"; })
                .style("font-family", "Impact")
                .style("fill", function(d) { return d.color? "red": "black"; })
                .attr("text-anchor", "middle")
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })

            selection.exit().transition().style("opacity",0).remove()
        }

        /**
           cloud = d3.layout.cloud()
           .size([mainPlotArea.attr("width"),mainPlotArea.attr("height")])
           .words([
           "Hello", "world", "normally", "you", "want", "more", "words",
           "than", "this"].map(function(d) {
           return {text: d, size: 10 + Math.random() * 90};
           }))
           .padding(8)
           .rotate(function() {return Math.random()*90}).font("Impact")
           .fontSize(function(d) {return d.size})
           //       .on("end",draw)
           //            .start()


           var draw = function(words) {
           console.log("in loop")
           parentDiv
           .append("g")
           .selectAll("text")
           .data(words,function(d) {return d.unigram})
           .enter()
           .append("text")
           .style("font-size",function(d) {return d.size + "px"})
           .style("font-family","Impact")
           .style("fill",function(d) {return d.size < 0 ? "red" : "black"})
           .attr("text-anchor","middle")
           .attr("transform", function(d) {
           return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
           })
           .text(function(d) { return d.text; });
           }
        **/
    },

    slopegraph : function() {

        var svg = this.selections.container
        //var svg = d3.select("#svg")
        svg.attr("height",1200)

        var bookworm = this;

        var query = bookworm.query;
        var mainPlotArea = bookworm.selections.mainPlotArea;

        var parentDiv = d3.select("#selectionOptions")

        var sizes = bookworm.data
            .map(function(d) {return Math.abs(d[query.aesthetic.size])})


        var rankLimit = 15;

        bookworm.data = bookworm.data.sort(function(a,b) {
            return b[query.aesthetic.left] - a[query.aesthetic.left]
        })

        bookworm.data.forEach(function(d,i) {
            d.leftRank = i +1
        })


        bookworm.data = bookworm.data.sort(function(a,b) {
            return b[query.aesthetic.right] - a[query.aesthetic.right]
        })

        bookworm.data.forEach(function(d,i) {
            d.rightRank = i +1
        })


        var data = bookworm.data.filter(function(d) {
            return d.rightRank < rankLimit || d.leftRank < rankLimit
        })

        var maxRank = d3.max(data.map(function(d) {
            return d3.max([d.rightRank,d.leftRank])
        }))

        var h = svg.attr("height")
        var w = svg.attr("width")

        var yScale = d3.scale.log().domain([1,maxRank]).range([h*.1,svg.attr("height")*.8])

        var elements = svg.selectAll("g.words").data(data)

        elements.exit().transition().duration(1000).style("opacity",0).remove()
        var words = elements.enter().append("g").attr("class","words").style("opacity",0)

        elements.transition().style("opacity",1)

        var y1 = function(d) {
            return yScale(d.leftRank)
        }
        var y2 = function(d) {
            return yScale(d.rightRank)
        }

        elements.selectAll("text").remove()

        elements.append("text").attr("class","left").attr("x",w*.25).attr("y",y1)

            .text(function(d) {     return (d.leftRank + ". " +
                                            d[query.aesthetic.label] + " (" +
                                            d[query.aesthetic.left] + ")")})
            .style("text-anchor","end")

        elements.append("text").attr("x",w*.75).attr("y",y2)
            .text(function(d) {     return (d.rightRank + ". " +
                                            d[query.aesthetic.label] + " (" +
                                            d[query.aesthetic.right] + ")")})


        elements.selectAll("line").remove()
        elements.append("line").attr("x1",w*.25).attr("x2",w*.75).attr("y1",y1).attr("y2",y2).style("stroke","black")


    },

    worddiv : function() {
        /**
           Use sized text in divs to represent the distinctive vocab of search and compare limits.

        **/

        var n = 1
        var bookworm = this;
        var data = this.data;

        var query = bookworm.query;
        var div = this.selections.container
        div.selectAll("text").remove()


        if (div[0][0].tagName == "svg")
        {//on the main page
            d3.selectAll("svg").remove()
            div = d3.select("div#chart")
        }
        //var div = d3.select("div#chart")
        //div.style("display","inline-block")

        data = data.sort(function(b,a) {return Math.abs(a[query.aesthetic.size]) - Math.abs(b[query.aesthetic.size])})

        data = data.filter(function(d) {return d[query.aesthetic.label].length > 1})
        groups = d3.nest().key(function(d) {return d[query.aesthetic.size] > 0}).entries(data)

        groups.sort(function(a,b){return a.key=="false"})

        var divs = div.selectAll("div.textgroup").data(groups)

        var sizes = data.map(function(d) {return Math.abs(d[query.aesthetic.size])})

        var sizer = d3.scale.sqrt()
            .domain(d3.extent(sizes))
            .range(["8px","90px"])

        divs.enter()
            .append("div")
            .classed("textgroup",true)
            .attr("id",function(d) {return d})
            .style("width","50%").style("display","inline-block")
            .style("vertical-align","top")
            .each(function(d) {
                var values = d.values.sort(function(a,b) {return Math.abs(b[query.aesthetic.size])- Math.abs(a[query.aesthetic.size])})
                values = values.slice(0,100)
                var words = d3.select(this).selectAll("text.label").data(values)
                    .enter()
                    .append('span')
                    .text(function(d) {sep = query.aesthetic.label == "topic_label" ? " ----- " : " ";return sep + d[query.aesthetic.label]}).style("font-size",function(d) {return sizer(Math.abs(d[query.aesthetic.size]))})
                    .style("text-fill","red")
                    .style("opacity",.75)
                    .style("font-family","impact")
                    .on("mouseover",function(d) {})//d3.select(this).style("opacity","")})
            })

                },

    barchart : function() {
        var colorscale
        var bookworm = this;
        var query = bookworm.query;
        var mainPlotArea = this.selections.mainPlotArea;
        var data = this.data
        var parentDiv = d3.select("#selectionOptions")

        bookworm.addFilters({"word":"textArray"},parentDiv)

        bookworm.addAestheticSelectors({
            "y":"categoricalAesthetic",
            "x":"numericAesthetic"},
                                       parentDiv)


        //this order matters, because the y-axis is curtailed and can exclude
        //elements from the x-axis. Yikes. That's no good.
        transition=2000

        if (d3.set(data.map(function(d) {
            return d[query.aesthetic.y]
        })).size() > 50) {
            topHits = data.map(function(d) {return d[query.aesthetic.x]}).sort(function(a,b) {return b-a})
            bookworm.data=data.filter(function(b) {return b[query.aesthetic.x] > topHits[50]})
        }

        var scales = this.updateAxes(delays = {"x":0,"y":transition},transitiontime=transition)

        var xstuff = scales[0]
        var ystuff = scales[1]
        var x = xstuff.scale
        var y = ystuff.scale

        getColor = function(d) {return colorscale(d[query.aesthetic.color])}

        if (typeof(query['aesthetic']['color']) != 'undefined') {
            topColors = bookworm.topn(5,query['aesthetic']['color'],bookworm.data)

            bookworm.data = bookworm.data
                .filter(function(d) {
                    return(topColors.indexOf(d[query['aesthetic']['color']]) > -1)
                });

            topColors.sort()
            colorscale = d3.scale.category10()
                .domain(topColors)
        } else {

            var colors = d3.scale.category20().range().concat(d3.scale.category20b().range()).concat(d3.scale.category20c().range())
            colors = colors.concat(colors).concat(colors).concat(colors)
            colorscale = d3.scale.category20c().domain(y.domain()).range(colors)
            getColor = function(d) {return colorscale(d[query.aesthetic.y])}
        }

        bookworm.colorscale=colorscale
        /**
           var points = mainPlotArea.selectAll('circle')
           .data(bookworm.data,function(d) {
           key = d[query['aesthetic']['y']]
           if (typeof(d[query['aesthetic']['color']]) != undefined) {
           key = key + d[query['aesthetic']['color']]
           }
           return key
           })
        **/
        var bars = mainPlotArea
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
            .attr("height",y.pixels)
            .attr('x',xstuff.limits.x[0])
            .attr('y',function(d) {
                return y(d[query['aesthetic']['y']])
            })
            .style("fill",function(d) {return getColor(d)})

        bars.exit().remove()

        bars
            .transition()
            .duration(transition)
            .attr("height",y.pixels)
            .attr('x',xstuff.limits.x[0])
            .attr("width",function(d) {
                return x(d[query['aesthetic']['x']]) - xstuff.limits.x[0]
            })
            .transition()
            .duration(transition)
            .attr('y',function(d) {
                var yVariable = query['aesthetic']['y']
                return y(bookworm.plotTransformers[yVariable](d[yVariable]))
            })


        bars
            .makeClickable(bookworm.query)

    }
    ,
    "pointchart" : function() {
        var bookworm = this;
        var query = bookworm.query;
        var mainPlotArea = this.selections.mainPlotArea;

        var parentDiv = d3.select("#selectionOptions")
        bookworm.addFilters({
            "word":"textArray"  },
                            parentDiv)

        bookworm.addAestheticSelectors({
            "x":"numericAesthetic",
            "y":"categoricalAesthetic",
            "color":"categoricalAesthetic"},
                                       parentDiv)
        bookworm.alignAesthetic()

        //this order matters, because the y-axis is curtailed and can exclude
        //elements from the x-axis. Yikes. That's no good.

        var transition = 2000

        var scales = this.updateAxes(delays = {"x":0,"y":transition},transitiontime=transition)

        var xstuff = scales[0]
        var ystuff = scales[1]
        var x = xstuff.scale
        var y = ystuff.scale


	var colorscale;

        getColor = function(d) {return colorscale(d[query.aesthetic.color])}

        if (typeof(query['aesthetic']['color']) != 'undefined') {
            topColors = bookworm.topn(255,query['aesthetic']['color'],bookworm.data)

            bookworm.data = bookworm.data
                .filter(function(d) {
                    return(topColors.indexOf(d[query['aesthetic']['color']]) > -1)
                });

            topColors.sort()
            colorscale = d3.scale.category10()
                .domain(topColors)
        } else {
            var colors = d3.scale.category20().range().concat(d3.scale.category20b().range()).concat(d3.scale.category20c().range())
            colors = colors.concat(colors).concat(colors).concat(colors)
            colorscale = d3.scale.category20c().domain(y.domain()).range(colors)
            getColor = function(d) {return colorscale(d[query.aesthetic.y])}
        }


        function makeColorScale() {
            bookworm.colorscale=colorscale

            legendscale = d3.svg.legend()
                .inputScale(colorscale).orientation("vertical")
                .labelFormat("none")
                .cellPadding(4)
                .units(bookworm.query.aesthetic.color)

            d3.selectAll(".color.scale").remove()


            var w = bookworm.selections.container.attr("width")
            var h = bookworm.selections.container.attr("height")
            var legendg = bookworm
                .selections.container.append("g")
                .attr("id","scale")
                .classed("color scale",true)
                .classed("axis",true)
                .attr("transform","translate(" + w * .8+ ","+  h*.05+ ")")

            legendg.call(legendscale)
        }


        points = mainPlotArea.selectAll('circle')
            .data(bookworm.data,function(d) {
                key = d[query['aesthetic']['y']]
                if (typeof(d[query['aesthetic']['color']]) != undefined) {
                    key = key + d[query['aesthetic']['color']]
                }
                return key
            })

        points
            .enter()
            .append('circle')
            .classed("plot",true)
            .attr("r",5)
            .makeClickable()
            .attr('cx',function(d) {
                return(x(0))
            })
            .attr('cy',function(d) {
                return y(d[query['aesthetic']['y']])
            })

        points
            .exit()
            .transition()
            .duration(transition)
            .attr('opacity',0)
            .attr("r",0)
            .remove()

        bookworm.yscale = y;


        points
            .style('fill',function(d) {
                return colorscale(d[query['aesthetic']['color']])})
            .transition()
            .duration(transitiontime)
            .attr('cx',function(d) {
                return x(d[query['aesthetic']['x']])
            })
            .transition(transitiontime)
            .attr('cy',function(d) {
                return y(d[query['aesthetic']['y']])
            })

    },

    "scatter" : function() {
        var bookworm = this;
        var query = bookworm.query;
        var mainPlotArea = this.selections.mainPlotArea;

        var parentDiv = d3.select("#selectionOptions")
        bookworm.addFilters({
            "word":"textArray"
        },
                            parentDiv)

        bookworm.addAestheticSelectors({
            "x":"numericAesthetic",
            "y":"numericAesthetic",
            "label":"categoricalAesthetic",
            "color":"categoricalAesthetic",
            "size":"numericAesthetic"
        },
                                       parentDiv)
        bookworm.alignAesthetic()

        //this order matters, because the y-axis is curtailed and can exclude
        //elements from the x-axis. Yikes. That's no good.

        var transition = 2000

        var scales = this.updateAxes(delays = {"x":0,"y":transition},transitiontime=transition)
        var xstuff = scales[0]
        var ystuff = scales[1]
        var x = xstuff.scale
        var y = ystuff.scale

        getColor = function(d) {return colorscale(d[query.aesthetic.color])}

        if (typeof(query['aesthetic']['color']) != 'undefined') {
            topColors = bookworm.topn(255,query['aesthetic']['color'],bookworm.data)

            bookworm.data = bookworm.data
                .filter(function(d) {
                    return(topColors.indexOf(d[query['aesthetic']['color']]) > -1)
                });

            topColors.sort()
            colorscale = d3.scale.category10()
                .domain(topColors)
        } else {

            colors = d3.scale.category20().range().concat(d3.scale.category20b().range()).concat(d3.scale.category20c().range())
            colors = colors.concat(colors).concat(colors).concat(colors)
            colorscale = d3.scale.category20c().domain(y.domain()).range(colors)
            getColor = function(d) {return colorscale(d[query.aesthetic.y])}
        }

        bookworm.colorscale=colorscale

        points = mainPlotArea.selectAll('circle')
            .data(bookworm.data,function(d) {
                key = d[query['aesthetic']['label']]
                if (typeof(d[query['aesthetic']['color']]) != undefined) {
                    key = key + d[query['aesthetic']['color']]
                }
                return key
            })

        points
            .enter()
            .append('circle')
            .classed("plot",true)
            .attr("r",5)
            .makeClickable()
            .attr('cx',function(d) {
                return(x(d.query.aesthetic.y))
            })
            .attr('cy',function(d) {
                return y(d[query['aesthetic']['y']])
            })

        points
            .exit()
            .transition()
            .duration(transition)
            .attr('opacity',0)
            .attr("r",0)
            .remove()

        bookworm.yscale = y;

        points
            .style('fill',function(d) {
                return colorscale(d[query['aesthetic']['color']])})
            .transition()
            .duration(transitiontime)
            .attr('cx',function(d) {
                return x(d[query['aesthetic']['x']])
            })
            .transition(transitiontime)
            .attr('cy',function(d) {
                return y(d[query['aesthetic']['y']])
            })

    },


    "vectorspace" : function(transition,usingPCs) {
        var bookworm = this;
        var query = bookworm.query;
        var mainPlotArea = this.selections.mainPlotArea;
        var data = bookworm.data

        if (typeof(logTransform)=="undefined") {var logTransform = false}
        if (typeof(usingPCs)=="undefined") {
            //default to principal components when 'weights' is undefined or empty.
            if (typeof(bookworm.query.weights)=="undefined") {
                bookworm.query.weights={}
                usingPCs=true
            } else if (d3.keys(bookworm.query.weights).length==0) {
                usingPCs=true
            } else {
                usingPCs=false
            }
        }

        if (typeof(transition)=="undefined") {
            transition = 1500
        }

        var frozenData = JSON.stringify(data)



        //What are the dimensions of the map?

        var needsWeights = d3.set(
            data.map(function(d) {
                var dimension = query.aesthetic.dimensions
                //if(d.dimension=="0") {console.log(d)}
                return d[dimension]
            }))
            .values()
            .filter(function(d) {
                return d != "0"
            })

        // Split up the data in groups; each point will be several different rows of the data
        // (by year, etc.)



        // Only a few things can be aesthetics.

        var aesthetics = d3.keys(bookworm.query.aesthetic).filter(function(d) {
            return(!d3.set(["dimensions","variable","weights"]).has(d))
        })

        var nester = d3.nest().key(function(d) {
            return(
                aesthetics.map(function(key) {
                    return d[query.aesthetic[key]]}).join("_XbX_"))
        })

        var parentDiv = d3.select("#selectionOptions")
        bookworm.addFilters({
            "word":"textArray"
        }, parentDiv)

        bookworm.addAestheticSelectors({
            "dimensions":"categoricalAesthetic",
            "variable":"numericAesthetic",
            "color":"categoricalAesthetic",
            "group":"categoricalAesthetic",
            "label":"categoricalAesthetic"
        },parentDiv)

        bookworm.alignAesthetic()

        //

        groups = nester.entries(data)
        bookworm.data = groups

        function setWeights() {//weights are passed manually.
            if (typeof(bookworm.query.weights)!="object") {bookworm.query.weights = {}}
            needsWeights.forEach(function(key) {
                if (typeof(bookworm.query.weights[key])=="undefined") {
                    var weight = Math.random() > .5 ? -.75 : .75
                    bookworm.query.weights[key] = Math.random() < .5 ? {"x":0,"y":weight} : {"x":weight,"y":0}

                }
            })
            setGroupPositions(usingPCs)
        }

        setWeights()

        function drawPoints() {

            var container = bookworm.selections.container
            var parentDiv = d3.select(container.node().parentNode)
            var legendDivWrapper = parentDiv.style("display","float").style("clear","both").selectAll("div.controlWrapper").data([1])

            legendDivWrapper.enter().append("div").attr("class","controlWrapper").style("display","block")

            parentDiv.style("display","block")


            legendDivWrapper.selectAll("p").remove()

            var legendDivs=legendDivWrapper
                .selectAll("div.vectorLegend")
                .data(needsWeights,function(d) {return d})

            legendDivs.exit().remove()

            var radius = 50;
            var blockWidth = radius*2 + 10;
            var blockHeight = radius*2 + 3;

            var newbits = legendDivs
                .enter()
                .append("div")
                .style("width",radius*2+10 + "px")
                .attr("class","vectorLegend")
                .style("display","inline-block")
            //          .style("float","left")

            newbits.append('text').style("text-anchor","middle").style("display","block")//.attr("transform","translate(0," + (-radius -1) + ")").style("text-anchor","middle")

            var newsvgs = newbits
                .append("svg")
                .attr("width",blockWidth)
                .attr("height",blockHeight)
                .attr("class","vectorLegend")
                .append("g")
                .attr("transform","translate(" + (radius + 10) + "," + (radius + 1) + ")")
                .style("display","block")


            newsvgs.append("circle").attr("r",radius).style("fill","none").style("stroke","black")
            newsvgs.append("circle").attr("r",1).style("fill","none").style("stroke","black")
            newsvgs.append("circle").attr("r",4).style("fill","red").style("stroke","red").attr("class","pointer")


            var x = d3.scale.linear().domain([-1,1]).range([-radius,radius])
            var y = d3.scale.linear().domain([-1,1]).range([radius,-radius])

            var drag = d3.behavior.drag()
                .origin(function(d) { return d })
                .on("drag", function(d) {
                    pos = d3.mouse(this)
		    pos[0] = Math.abs(pos[0]) > radius ? pos[0] < 0 ? -radius : radius : pos[0]
		    pos[1] = Math.abs(pos[1]) > radius ? pos[1] < 0 ? -radius : radius : pos[1]
//                    if (totalShowing > radius) {
//                        pos = [pos[0]/totalShowing*radius,pos[1]/totalShowing*radius]
//                    }
                    d3.select(this).selectAll("circle.pointer")
                        .attr("cx", pos[0])
                        .attr("cy", pos[1])


                    bookworm.query.weights[d] =
                        {"x":Math.round(x.invert(pos[0])*1000)/1000,"y":(Math.round(y.invert(pos[1])*1000))/1000}


                    bookworm.alignAesthetic()


                    window.location.hash = encodeURIComponent(JSON.stringify(bookworm.query))
                    bookworm.vectorspace(100,usingPCs=false)
                });

            legendDivs.each(function(d) {
                d3.select(this).selectAll("g").call(drag)
                d3.select(this).selectAll('text').text(d)

                d3.select(this).selectAll('circle.pointer')
                    .attr("cx",x(bookworm.query.weights[d]['x']))
                    .attr("cy",y(bookworm.query.weights[d]['y']))
            })
                }

        if (transition > 100) {
            drawPoints()
        }


        function setGroupPositions(usingPCs) {
            usingPCs = typeof(usingPCs)=="undefined" ? true : usingPCs
            var matrix = []

            groups.forEach(function(group) {

                var xes = []
                var ys  = []
                var row = []

                // each group has as many elements as there are values; so if we're searching
                // with dimensions as unigrams filtered to top 20, there will be like 20 of them.
                var demo = group.values[0]
                aesthetics.forEach(function(aes) {group[query.aesthetic[aes]] = demo[query.aesthetic[aes]]})
                needsWeights.forEach(function(key) {
                    var val,match;
                    var weights = bookworm.query.weights[key]
                    match = group.values.filter(function(d) {return d[query.aesthetic.dimensions]==key})
                    if (match.length==0) {
                        val = 0;
                    }
                    else {
                        match = match[0]
                        val = match[query.aesthetic.variable]
                    }
                    xes.push(val * weights['x'])
                    ys.push(val * weights['y'])
                    row.push(val)
                })

                logSafe = function(row) {
                    min = d3.min(row.filter(function(d) {return d > 0}))
                    return row.map(function(d) {return d<min ? min/10 : d})
                }

                if (logTransform) {
                    xes = logSafe(xes)
                    ys = logSafe(ys)
                }
                group.x = d3.sum(xes)
                group.y = d3.sum(ys)

                matrix.push(row)
            })

            //Thanks to http://bl.ocks.org/ktaneishi/9499896
            if (usingPCs) {
                var pca = new PCA()
                prweights = []
                var rotation = pca.rotation(matrix)

                d3.range(rotation.length).forEach(function(i) {
                    var newRow = {}
                    d3.range(rotation[0].length).forEach(function(j) {
                        newRow[needsWeights[j]] = rotation[j][i]
                    })
                    prweights.push(newRow)
                });

                var variables = {"x":0,"y":1}

                d3.keys(bookworm.query.weights).forEach(function(key) {
                    var dims = ["x","y"]
                    dims.forEach(function(dim) {
                        if (bookworm.query.weights[key]===undefined) {
                            bookworm.query.weights[key] = {};}
                        bookworm.query.weights[key][dim] = prweights[variables[dim]][key].toPrecision(2)

                    })
                })

                // after calculating the PCs, reset the dots again to mirror the new weights.
                setGroupPositions(usingPCs = false)
            }

        }

        bookworm.query.aesthetic.x = 'x'
        bookworm.query.aesthetic.y = 'y'


        var scales = this.updateAxes(delays = {"x":0,"y":0},transitiontime=transition)
        var xstuff = scales[0]
        var ystuff = scales[1]
        var x = xstuff.scale
        var y = ystuff.scale

        //        getColor = function(d) {return colorscale(d[query.aesthetic.color])}


        if (typeof(query['aesthetic']['color']) != 'undefined') {
            topColors = bookworm.topn(255,query['aesthetic']['color'],bookworm.data)

            bookworm.data = bookworm.data
                .filter(function(d) {
                    return(topColors.indexOf(d[query['aesthetic']['color']]) > -1)
                });

            topColors.sort()
            colorscale = d3.scale.category10()
                .domain(topColors)
        } else {
            colors = d3.scale.category20().range().concat(d3.scale.category20b().range()).concat(d3.scale.category20c().range())
            colors = colors.concat(colors).concat(colors).concat(colors)
            colorscale = d3.scale.category20c().domain(y.domain()).range(colors)
            getColor = function(d) {return colorscale(d[query.aesthetic.y])}
        }

        bookworm.colorscale=colorscale

        if (typeof(query['aesthetic']['color']) != 'undefined') {
            bookworm.makeDiscreteColorLegend(colorscale)
        }

        points = mainPlotArea.selectAll('g.plot')
            .data(groups,function(d) { return d.key })

        newPoints = points
            .enter()

        newPoints
            .append('g')
            .classed("plot",true)
            .attr("transform",function(d) {
                return "translate(" + x(d.x) + "," + y(d.y) + ")"
            })
            .makeClickable()
            .append(
                typeof(bookworm.query.aesthetic.label) =="undefined" ? "circle":"text")
            .attr("r",5)
            .style('fill',function(d) {
                return colorscale(d[query['aesthetic']['color']])
            })
            .text(function(d) {return d[query.aesthetic.label]})



        points
            .exit()
            .transition()
            .duration(transition)
            .attr('opacity',0)
            .attr("r",0)
            .remove()

        bookworm.yscale = y;

        points
            .transition()
            .duration(transition)
            .attr("transform",function(d) {
                return "translate(" + x(d.x) + "," + y(d.y) + ")"
            })


        //reset the state at the end to avoid confusing things.

        bookworm.query.aesthetic.x = undefined
        bookworm.query.aesthetic.y = undefined
        bookworm.data = JSON.parse(frozenData)





    },

    "labelAxes":function() {
        var bookworm = this;

        function labelText(axis) {
            if (bookworm.query.plotType=="vectorspace") {
                var labs = []
                d3.keys(bookworm.query.weights).forEach(function(key) {
                    var loc = bookworm.query.weights[key]
                    if (loc[axis] != 0) {
                        labs = labs.concat(key + "*" + loc[axis].toFixed(2))
                    }
                })
                return labs.join(" + ")
            }

        }

        ["x","y"].forEach(function(axis) {
            var working = bookworm.selections.container.selectAll("." + axis + ".axis")
            working.selectAll("text.label").remove()
            working.append("text")
                .attr("class","label")
                .text(labelText(axis))
                .attr("transform",function() {return axis=="x" ? "translate(10,35)" : "translate(-35,25)"}).style("font-style","bold")

        })
    },

    "addFilters" : function(fields,attachTo,limitthing) {
        /**

         **/
        var bookworm = this;

        var elements = d3.keys(fields).map(function(key){
            return {"element":key,"type":fields[key]}
        })
        var selectors = attachTo
            .selectAll("div.filter.selector")
            .data(elements,function(d) {return d.element + d.type})

        selectors
            .enter()
            .append("div")
            .attr("class","filter selector")
            .style("display","inline")
            .each(function(d) {
                d3.select(this)
                    .text(function(d) {return d.element + " limited to "})

                var box = bookworm.queryVisualizations[d.type]()
                box.target(d.element)
                box.createOn(d3.select(this))
                box.initialize()
            })
                },
    "addAestheticSelectors" : function (types,attachTo) {
        var bookworm = this;
        // for example: pass {"x":"numericAesthetic","y":"categoricalAesthetic","color":"numericAesthetic"}
        var elements = d3.keys(types).map(function(key){
            return {"aesthetic":key,"type":types[key]}
        })

        var selectors = attachTo
            .selectAll("div.aesthetic.selector")
            .data(elements,function(d) {return d.aesthetic + d.type})

        selectors.exit().remove()

        selectors
            .enter()
            .append("div")
            .attr("class","aesthetic selector")
            .each(function(d) {
                d3.select(this)     .text(function(d) {return d.aesthetic + " representing "})

                var addition = bookworm.queryVisualizations[d.type]()
                addition.target(d.aesthetic)
                addition.createOn(d3.select(this))
                addition.initialize()
            })
                //drop obsolete elements
                d3.keys(bookworm.query.aesthetic).forEach(function(d) {
                    if (types[d] === undefined) {
                        bookworm.query.aesthetic[d]=undefined
                    }
                })


    },
    "queryVisualizations" : {
        "categoricalAesthetic" : function () {
            return this.aesthetic().datatype("categorical")
        },
        "numericAesthetic": function () {
            return this.aesthetic().datatype("quantitative")
        },
        "aesthetic" : function () {
            var that = {};
            var datatype = "categorical";
            var selector;//the actual box.
            var options;// a selection of the options.
            var target;

            that.target = function(x) {
                if (!arguments.length) return target;
                target= x
                return that
            }

            that.datatype = function(x) {
                if (!arguments.length) return datatype;
                datatype= x
                return that
            }

            that.pull = function() {
                selector.node().value = bookworm.query.aesthetic[target]
            }

            that.push = function() {
                bookworm.query.aesthetic[target] = selector.node().value
            }

            that.createOn = function(domElement) {
                selector = domElement
                    .append("div")
                    .style("display","inline")
                    .append("select")
                    .attr("class","category queryVisualization " + target)
                    .on("change",that.push)
                    .style("display","inline")
                that.pull()
                return that
            }

            that.initialize = function() {
                options = selector
                    .selectAll("option")
                    .data(function(d) {
                        return datatype=="categorical" ?
                            bookworm.variableOptions.options :
                            datatype=="quantitative" ?
                            bookworm.variableOptions.quantitative:
                            []
                    })

                if (options.data().length==0) {
                    //keep trying until the options are actually posted.
                    setTimeout(that.initialize,100)
                    return
                }
                options.exit().remove()
                options.enter().append("option")
                options
                    .text(function(d) {return d['name']})
                    .attr("value",function(d) {return d['dbname']})
                that.pull()
                return that;
            }
            return that
        },
        "limitation" : function() {
            d3.json(BookwormClasses.destinationize(myQuery),function(json) {
                var bookworm = parent
                myData = BookwormClasses.parseBookwormData(json,myQuery);
                if (sortBy=="WordCount") {
                    myData.sort(function(a,b) {return(b.WordCount - a.WordCount)})
                }

                var thisSelection = selector.selectAll('option').data(myData)
                thisSelection.enter()
                    .append('option')
                    .attr('value',function(d){
                        return d[category]})
                    .text(function(d) {
                        text = d[category]
                        if( d[category]=="") {text = "[value blank]"}
                        return text + " (" +prettyName(d.WordCount) + " words in " + prettyName(d.TextCount) + " Texts)"
                        that.pull()
                    })
                return that
            })
        },
        "textArray" : function() {

            //these all rely on the local variable "bookworm" from the calling parent.
            var that = {}
            var box;
            var target = "word"

            that.pull = function() {
                try {
                    box
                        .property("value",bookworm.query.search_limits[target].join(","))
                } catch(err) {}
                return that
            }
            that.target = function(x) {
                if (!arguments.length) return target;
                target= x
                return that
            }



            that.push = function() {
                text = box.property("value")
                text = text.replace(" *, *",",")
                bookworm.query.search_limits[target] = text.split(",")
                return that
            }

            that.createOn = function(domElement) {
                box = domElement
                    .append("div")
                    .append("input")
                    .attr("class","text queryVisualization")
                    .on("keyup",function(d) {
                        that.push()
                        if(d3.event.keyCode == 13){
                            bookworm.updatePlot()
                        }
                    })
                return that
            }

            that.initialize = function() {
                //boundTo = parent.query.search_limits.word
                that.pull()
                return that
            }

            return that
        },

        "corpusSelector" : function(selection,bindTo) {
            //Adds a corpus box to a div passed in.
            //That would be pretty useful--really, though, this should be
            //using some of the code that Billy Janitsch wrote.

            var that = {}; //the corpus selector that will be pushed out

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
                    bookworm.updatePlot(function() {
                        bookworm[bookworm.query.plotType]
                    })
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

        "createDropbox" : function(category,parentSelection) {
            //Drops in a new query box for a categorical value:
            //going to be useful for other applications, but not implemented in the basic one.
            //Possibly the first part should just return the data.

            var myQuery = JSON.parse(JSON.stringify(query));
            myQuery['search_limits']['word'] = []
            myQuery['groups'] = [category]
            myQuery['counttype'] = ['WordCount','TextCount']
            return d3.json(destinationize(myQuery),function(json) {
                //add error handling?
                myData = bookworm.parseBookwormData(json,myQuery);

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

    "removeElementsFromOtherPlots" : function(geometryName) {
        if (lastPlotted != geometryName) {
            removeElements()
            lastPlotted = geometryName
        }
    },

    removeElements : function() {
        vals = ['rect','text','path','circle','line','tick'].map(
            function(type) {
                bookworm.selections.container.selectAll(type).transition().remove()
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
        var bookworm = this;
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
		if (max==min) {
		    scale.domain([min-.000000001,max+.00000001])
		    //a rare case
		} else {
		    //the common case
                    scale
			.domain(
			    d3.range(
				min,
				max+max*.0001,(max-min)/(bookworm.scales.color.range().length-1)
			    ).map(function(n) {return(n)})
			)
		}
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
        // Changes the shape of the hierarchical json the API
        // delivers to a flat one with attribute names
        // which takes more space but plays more nicely with d3/javascript.
        // Uses recursion, yuck.
        var names = []
        var bookworm = this

        names = names.concat(locQuery.groups).concat(locQuery.counttype);

        function flatten(hash,prepend) {
            prepend = prepend || [];
            var results = Object.keys(hash).map(function(key) {
                var newpend = prepend.concat(key)
                if (hash[key] instanceof Array)
                {
                    return(newpend.concat(hash[key]))
                }
                else {
                    var vals = flatten(hash[key],newpend)
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
        try {
            var flat = flatten(json);
        } catch(err) {
            var flat = []
        }
        //add the labels.
        var results = flat.map(function(localdata){
            return(toObject(names,localdata));
        })

        bookworm.data = results


        d3.keys(results[0]).map(function(key) {
            bookworm.updateKeysTransformer(key)
        })
        return(results)

    },
    variableOptions : {
        quantitative : [
            {"dbname":"WordsPerMillion","name":"Uses per Million Words"},
            {"dbname": "WordCount","name":"# of matches"},
            {"dbname":"TextPercent","name":"% of texts"},
            {"dbname":"TotalWords","name":"Total # of words"},
            {"dbname":"TextCount","name":"# of Texts"},
            {"dbname":"TotalTexts","name":"Total # of Texts"},
            {"dbname":"WordsRatio","name":"Ratio of group A to B"},
            {"dbname":"SumWords","name":"Total in both sets"}
        ],
        options : []
    },
    updateVariableOptions : function(database,callback) {
        //this can't refer to "bookworm" here.
        bookworm=this
        variableOptions = bookworm.variableOptions;
        bookworm.variableOptions.options = []
        var localQuery = {"method":"returnPossibleFields","database":database}
        d3.json(bookworm.destinationize(localQuery),
                function(error, json) {
                    if (error) {
                        console.warn(error)
                    }
                    json.push({"name":"","dbname":undefined})
                    json.map(function(row) {
                        row['database'] = bookworm.query['database']
                        variableOptions.options.push(row)
                    })
                    variableOptions.options = variableOptions.options.filter(function(row){
                        if (row.database==bookworm.query.database ) return true
                    })
                    callback()
                });
    }
    ,
    updateAxisOptionBoxes : function() {
        var bookworm = this;
        var updateQuantitative = function() {
            var axes = d3.selectAll(".metric.options")
            selected = axes.selectAll('option').data(bookworm.quantitativeVariables)
            selected.exit().remove()
            selected.enter().append('option')
            selected.attr('value',function(d) {return(d.variable)})
                .text(function(d) {return d.label})

        }

        var followup = function() {
            var axes = d3.selectAll(".categorical.options")
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
        bookworm.updateVariableOptions(bookworm.query['database'],followup)

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
        bookworm.dataTypes[key]="Categorical"




        //if a date: return a dateTime object
        var isADate = false

        var timeSignifiers = ['year','month','day','week','decade','century',"Year","Decade","yearchunk","MovieYear"]

        key.split("_").map(function(part) {
            //I'm just coming up with descriptions, here.
            part = part.replace("*","")
            if (timeSignifiers.indexOf(part) >=0) {isADate=true}
        })

        if (isADate) {
            var getDate2 = function(intval) {
                var val = new Date();
                val.setFullYear(0,0,intval+1)
                //console.log(intval,"----------",val)
                return val
            }


            bookworm.plotTransformers[key] = function(originalValue) {
                originalValue = parseInt(originalValue)
                var datedValue = new Date()
                //This code could be useful in the other Bookworm.
                var extractRelevantField = function(dateKey) {
                    var output = undefined
                    dateKey.split("_").reverse().forEach(function(phrase) {
                        //The first date phrase to appear is the one we're using.
                        if (['year','month','day','week','decade','century',"Year","Decade","yearchunk","hour"].indexOf(phrase) >=0) {output=phrase}
                    })
                    return output
                }

                var relevantField = extractRelevantField(key)
                if (relevantField == "day") { return getDate2(originalValue)}
                else if (relevantField=="week") {return getDate2(originalValue) }
                else if (relevantField=="month") {return getDate2(originalValue) }
                else if (relevantField=="hour") {var val=new Date(); val.setHours(originalValue); val.setMinutes(0); return val; }
                else {
                    datedValue.setFullYear(originalValue,1,1)
                    return datedValue
                }
            }
            bookworm.dataTypes[key]="Date"
            return

        }

        //if numeric: return a numeric object
        //iterate through all the values, and give up once hitting a non-numeric value
        for (var i =0; i < bookworm.data.length; i++) {
            var entry = bookworm.data[i]
            d = entry[key]
            if (isNaN(d) & d!="" & d!="None" & d!="undefined" & d!== undefined) {
                //console.log(d)
                //console.log("d has non-numeric values")
                return
                break
            }
        }

        bookworm.plotTransformers[key] = function(originalValue) {
            return parseFloat(originalValue)
        }
        bookworm.dataTypes[key]="Numeric"
    },

    comparisontype: function() {
        var query = this.query;
        var bookworm = this;
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
        var value;

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
        bookworm.alignAesthetic()

        //update all listening boxes based on the query
        var needsUpdate = d3.selectAll("[bindTo]")
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
        var quantitativeVariables = bookworm.quantitativeVariables

        if ('aesthetic' in query) {
            var counttypes = {}
            var groups     = {}

            //pushes the aesthetic values into the appropriate boxes.

            var aesthetics = d3.keys(query['aesthetic'])

            aesthetics.map(function(aesthetic) {
                var possibleQuants = quantitativeVariables
                    .map(function(counttype) {return counttype.variable})

                if (possibleQuants.indexOf(query['aesthetic'][aesthetic]) > -1) {
                    counttypes[query['aesthetic'][aesthetic]] = 1
                } else if (typeof(query['aesthetic'][aesthetic])=="object") {
                    //do nothing if the type of the aesthetic is not a string; useful
                    //for complicated internal representations.
                }
                else if (typeof(query['aesthetic'][aesthetic])=="undefined") {
                    //do nothing if the type of the aesthetic is not a string; useful
                    //for complicated internal representations.
                }
                else
                {
                    groups[query['aesthetic'][aesthetic]] = 1
                }
            }
                          );
            query['counttype'] = d3.keys(counttypes);
            query['groups'] = d3.keys(groups)
        }
    },
    topn : function(n,key,dataset) {
        var query = this.query;
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
    functions:{


        "prettyName" : function(number) {
            comparisontype = bookworm.comparisontype
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

        // define some defaults
        if (origin===undefined) { origin = [73,132] }
        var bookworm = this;
        var sizescale = scale;

        sizeAxis = d3.svg.axis()
            .scale(sizescale)
            .orient("right")
            .tickValues(function() {
                nestedScale = d3.scale.linear()
                    .range(sizescale.range())
                    .domain(sizescale.range());
                nestedScale.nice();
                return nestedScale.ticks(6).map(function(n) {return sizescale.invert(n)})
            })
            .tickFormat(bookworm.prettyName)


        sizeLegend = bookworm.selections.container
            .selectAll(".legend.size")
            .data([{"x":origin[0],"y":origin[1]}])

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
            .text(bookworm.nameSubstitutions[bookworm.query['aesthetic']['size']])
            .on('click',function(d){chooseVariable(sizeLegend,"sizeSelector",quantitativeVariables,'aesthetic','size')})
    },

    "destinationize" : function(query) {
        //Constructs a cgi-bin request to local host.
        //Can be used with runSearch and searchWindow (below);
        //Or to get other things, like lists of variables.
        query['method'] = query['method'] || "return_json"

        return( "/cgi-bin/dbbindings.py/?queryTerms=" + encodeURIComponent(JSON.stringify(query)))
    },

    "runSearch" : function(d) {
        var query = this.query;
        //takes an element that has attributes corresponding to groups:
        //opens up a search window with the full query restrictions, plus the particular restrictions
        //for which it is grouped.

        myQuery = JSON.parse(JSON.stringify(query).replace("*",""))

        myQuery['groups'].map(function(group) {
            myQuery['search_limits'][group.replace("*","")] = [d[group]]
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
            rows.selectAll("a").attr("target","_blank")
        })
    },

    "makeAxisAndScale" : function(axis,limits,sortBy,descending) {

        var bookworm = this;
        var query = bookworm.query



        //axis is either "x" or "y"
        //limits are defined in pixels.
        var scale;

        var w = bookworm.selections.container.attr("width") || (bookworm.selections.container.style("width") || window.innerWidth)
        var h = bookworm.selections.container.attr("height") || (bookworm.selections.container.style("width") ||  window.innerHeight)

        w = w.replace("px","")
        h = h.replace("px","")

        limits = limits || {'x':[w*.2,w*.9],'y':[85,h*.9]}
        //the scale can be sorted by either by "name" or "values",
        sortBy = sortBy || "name";

        //And that direction can be descending (true) or ascending (false)
        descending = descending || "default";

        var variableName = query['aesthetic'][axis]





        var vals = d3.nest()
            .key(function(d) {
                return d[variableName]
            })
            .entries(bookworm.data)
            .map(function(d) {
                //Some variables will have transformers defined for them
                //that (for example) turn a year into a date.
                //It would perhaps be better to build the transformers
                //straight into the scales, but I don't know how.

                var transformer = bookworm.plotTransformers[variableName]
                if ('undefined'==typeof transformer) {
                    return d.key
                } else {
                    var m = (transformer(d.key))
                    return(m)
                }
            })

        var datatype = bookworm.dataTypes[variableName]

        if(typeof(datatype)=="undefined") {
            datatype="Numeric"
        }




        function updateOrder() {

            var nester = d3.nest().key(function(d) {return d[query.aesthetic[axis]]})

            var lookup = nester.map(bookworm.data)


            if (sortBy == "value") {
                value = function(keyname) {
                    return d3.median(
                        lookup[keyname].map(function(d) {
                            return d[query.aesthetic.x]
                        })
                    )}
                //value = function(keyname) {
                //local = bookworm.data.filter(function(d) {
                //      return d[query["aesthetic"][axis]]==keyname
                //}).map(function(d) {return d[query["aesthetic"]["x"]]})
                //return d3.median(local)
                vals.sort(function(a,b) {
                    return (value(a) - value(b))
                })
            }

            if (sortBy == "name") {
                if (datatype == "Date" || datatype == "Numeric") {
                    vals.sort(function(a,b){return(a-b)})
                } else { vals.sort() }
            }

            if (descending=="default") {
                vals.reverse()
            }
        }

        if (datatype=="Categorical") {
            n = function() {
                //home many elements to display depends on the width: no more than ten pixels
                //vertically, and 30 pixels horizontally
                if (axis=='y') {minSize=10}
                if (axis=='x') {minSize=100}
                return Math.round((limits[axis][1]-limits[axis][0])/minSize)
            }()
            names = d3.set(
                bookworm.data.map(function(d) {
                    return d[variableName]}
                                 )).values()
            //            names = bookworm.topn(n,variableName,bookworm.data)
            bookworm.data = bookworm.data.filter(function(entry) {
                return(names.indexOf(entry[variableName]) > -1)
            })
            //order by the names by defaut.

            vals = names
            updateOrder()
            scale = d3.scale.ordinal().domain(vals).rangePoints(limits[axis])
            bookworm.query.plotType=="heatmap" || bookworm.query.plotType=="barchart" ?
                scale.rangeBands(limits[axis]) :
                {}
            if (bookworm.query.aesthetic[axis]=="state" && bookworm.query.database=="SSA") {
                scale.domain(["HI","AK","WA","OR","CA","AZ","NM","CO","WY","UT","NV","ID","MT","ND","SD","NE","KS","IA","MN","MO","OH","MI","IN","IL","WI","OK","AR","TX","LA","MS","AL","TN","KY","GA","FL","SC","WV","NC","VA","DC","MD","DE","PA","NJ","NY","CT","RI","MA","NH","VT","ME"])
            }
            pointsToLabel = vals
            var thisAxis = d3.svg.axis()
                .scale(scale)
            scale.pixels = scale.rangeBand()//(limits[axis][1]-limits[axis][0])/vals.length;
        } else if (datatype=="Numeric") {
            vals = vals.map(function(d) {return parseFloat(d)})
            updateOrder()
            //the binwidth should be minimum difference between points.
            var differences = [];
            for (var i = 0; i < (vals.length-1); i++) {
                differences.push(Math.abs(vals[i+1]-vals[i]));
            };
            var binwidth = d3.min(differences)
            var binsneeded = (d3.max(vals) - d3.min(vals))/binwidth + 1

            var pixels = (limits[axis][1]-limits[axis][0])/binsneeded;

            var domain = d3.extent(vals)
            var oldLow = domain[0]
            if (bookworm.query.aesthetic[axis] != "chunk" && domain[0] > 0) {
                domain[0] = 0;
            }
            if (axis=='y') {
                //because svg is defined from the upper right corner,
                //but we want lower numbers lower.
                domain.reverse()
            }

            scale = d3.scale.linear().domain(domain).range([limits[axis][0],limits[axis][1]-pixels])

            if (query.aesthetic[axis] == "WordsRatio" | query.aesthetic[axis]=="TextRatio") {
                domain[0] = oldLow
                scale = d3.scale.log().domain(domain).range([limits[axis][0],limits[axis][1]-pixels])
            }
            thisAxis = d3.svg.axis()
                .scale(scale)
                .tickFormat(d3.format('g'))
                .tickSubdivide(1)
            scale.pixels = pixels
        } else if (datatype=="Date") {
            updateOrder()
            pixels = (limits[axis][1]-limits[axis][0])/vals.length;

            scale = d3.time.scale()
                .domain(d3.extent(vals))
                .range([limits[axis][0],limits[axis][1]-pixels])

            thisAxis = d3.svg.axis()
                .scale(scale)
                .tickSubdivide(1)

            scale.pixels = pixels
        } else {
            thisAxis = d3.svg.axis()
            scale = d3.scale.linear()
        }
        if (axis=='x') {
            thisAxis = thisAxis.orient("bottom")
        }

        if (axis=='y') {
            thisAxis = thisAxis.orient("left")
        }

        return({"scale":scale,"axis":thisAxis,"datatype":datatype,"limits":limits})

    },

    quantitativeVariables : [
        {"variable":"WordsPerMillion","label":"Uses per Million Words"},
        {"variable": "WordCount","label":"# of matches"},
        {"variable":"TextPercent","label":"% of texts"},
        {"variable":"TotalWords","label":"Total # of words"},
        {"variable":"TextCount","label":"# of Texts"},
        {"variable":"TotalTexts","label":"Total # of Texts"},
        {"variable":"WordsRatio","label":"Ratio of group A to B"},
        {"variable":"SumWords","label":"Total in both sets"},
        {"variable":"TextLength","label":"Mean text length (in words)"},
        {"variable":"MatchesPerText","label":"Mean hits per matching text"},
        {"variable":"TFIDF","label":"TFIDF"},
        {"variable":"Dunning","label":"Dunning Log Likelihood"},
        {"variable":"DunningTexts","label":"Dunning Log Likelihood (Text count)"}
    ],
    nameSubstitutions : function() {
        var that = {};
        for (item in this.quantitativeVariables) {
            that[item.variable] = item.label
        }
        return that
    }(),

    "scales":{
        "x":null,
        "y":null,
        "color":d3.scale.log().range(["#D61818","#FFAE63","#FFFFBD","#B5E384"].reverse()),
        "size":d3.scale.sqrt().range([3,55])
    },
    "legends":{
    }
}


//finally, a behavior called "drag" is defined; this is super-optional.
//Then the d3.selection prototype is expanded to allow clicks bound t data.
//Finally, a class "Bookworm" is defined, essentially, based on a function
//and a huge object with various methods which includes charts, and so forth.

var drag  =d3.behavior.drag()
    .on("drag", function(d,i) {
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        d3.select(this).attr("transform", function(d,i){
            return "translate(" + d.x + ',' + d.y  + ")";
        })
    });


// And here's the class creator itself.

Bookworm = function(query) {

    //A bookworm is initialized with a query.
    var newBookworm;

    newBookworm = function(selection) {
        //when called as a function, it runs against a selection.
        newBookworm.makePlotArea(selection)
        newBookworm.updatePlot()
    }



    //The various functions are cloned off the classes. It would be better to have them defined inside the closure here.
    d3
        .keys(BookwormClasses)
        .forEach(function(classname) {
            newBookworm[classname] = BookwormClasses[classname]
        })


    newBookworm.selections = {};
    newBookworm.dataTypes = {};
    newBookworm.plotTransformers = {};
    newBookworm.query = query || {};
    newBookworm.query.method = newBookworm.query.method || "return_json"
    //bookworm.initializeInterfaceElements();
    return newBookworm
}
