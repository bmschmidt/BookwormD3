//first, a behavior called "drag" is defined; this is super-optional.
//Then the d3.selection prototype is expanded to allow clicks bound t data.
//Finally, a class "Bookworm" is defined, essentially, based on a function
//and a huge object with various methods which include charts, and so forth.

var drag = d3.behavior.drag()
    .on("drag", function(d,i) {
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        d3.select(this).attr("transform", function(d,i){
            return "translate(" + d.x + ',' + d.y  + ")";
        })
    });

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

    /**
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
    */



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

            //For each key, we put on the values.
            d3.keys(query.aesthetic).forEach(function(key) {
                title = query.aesthetic[key]
                value = d[title]
                if (typeof(value)=="number") {value = bookworm.functions.prettyName(value)}
                textArea.append("text").append("strong").text(title + ":" + String.fromCharCode(160))
                textArea.append("text").text(value)
                textArea.append("br")
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
            BookwormClasses.runSearch(d)
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

        guessDatabase = function() {
            guess.database = window.location.pathname.split("/").reverse()[1]
            if (window.location.host.split(".").length > 2) {
                guess.database = window.location.host.split(".")[0]
            }
            if (guess.database=="bookworm") {guess.database="historydiss"}
        }

        guessPlotType = function() {
            //The plottype is the very end of the thing, minus any ".html" or ".htm"
            guess.plotType = window.location.pathname.split("/").reverse()[0].split(".")[0]
            if (guess.plotType == "" || guess.plotType=="index") {guess.plotType = "linechart"}
        }

        guessQuery = function () {
            guess.method="return_json"
            guess.search_limits = {"word":["test"],"date_year":{"$gte":1}}
            guess.aesthetic = {"x":"date_year","y":"WordsPerMillion"}
        }

        if (consultDatabases) {
            var category  = bookworm
                .variableOptions
                .options
                .filter(function(d) {return d.type=="character"})[0]
                .dbname
        }

        if  (window.location.hash!=="") {
            console.log("returning guess from hash")
            return (JSON.parse(decodeURIComponent(window.location.hash.split("#")[1])))
        }

        guessDatabase()
        guessPlotType()
        guessQuery()
        return guess
    },

    updateData: function(callback,append) {

        //callback is a string relative to the layer we're working with here.
        //that *names* a function to be called.

        callback = callback || "nothing"
        append = append || false;
        var bookworm = this;

        destination = (
            "/cgi-bin/dbbindings.py/?queryTerms=" +
                encodeURIComponent(JSON.stringify(this.query)))

        d3.json(destination, function(error,data) {
            if (error) {
                console.log("error parsing JSON: " + console.log(error))
                console.log(destination)
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
    smooth : function(span,axis) {
        axis = axis || "y"
        //currently this really sucks:
        //it only lets you smooth once, and overwrites the original data.
        //and it only works on the y axis.
        //But proof of concept, baby.
        bookworm = this
        dat = bookworm.data;

        dat.map(function(d,i) {
            d[this.query.aesthetic[axis] + "smoothedValues"] =
                d3.mean(
                    dat.slice(
                        d3.max([0,i-span]),d3.min([dat.length,i+span+1]
                                                 ))
                        .map(function(d) {
                            return d[bookworm.query.aesthetic["y"]]
                        }))})
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
        console.log(output)
        return output
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

    updatePlot : function(callback) {
	callback = callback || function() {}
        var bookworm = this;

	history.pushState(window.location.hash)
	window.location.hash = encodeURIComponent(JSON.stringify(this.query))
        //housekeeping;

        bookworm.alignAesthetic()
        bookworm.updateQuery()
        //test if the query has changed since the last update;
        //string equality is not exactly the correct way to do this, but
        //the cost of an extra query isn't extraordinary so 90% accuracy
        // is fine.


        if (this.lastPlotted != this.query.plotType) {
            //hide all the selectors for other kinds of bookworms.
            d3.selectAll(".chartSpecific").style('display','none')
            if (bookworm.selections.mainPlotArea !== undefined) {
                ["point","line","g","path","circle","rect"].forEach(function(d) {
                    bookworm.selections.mainPlotArea.selectAll(d).transition().style("opacity",0).remove()
                })
            }
            //display elements that are classed with this chart type.
            d3.selectAll("." + bookworm.query.plotType).style('display','inline')
            bookworm.updateAxisOptionBoxes()
            bookworm.makePlotArea()


        }

        if (this.lastQuery != this.serverSideJSON(bookworm.query)) {
            bookworm.updateData(function() {bookworm[bookworm.query.plotType]()});
        } else if (this.lastQuery != this.serverSideJSON(bookworm.query)) {
            bookworm[bookworm.query.plotType]()
	    updateData
        }

        this.lastQuery = this.serverSideJSON(this.query);
        this.lastPlotted = this.query.plotType;

    },

    requireAesthetics : function(aesthetics,type) {
        //lets you require that an aesthetic be set.
        var bookworm = this;

        type = type || "character";
        aesthetics.forEach(function(aesthetic) {
            console.log(bookworm.variableOptions.options)
//            var category  = bookworm.variableOptions.options.filter(function(d) {return d.type==type})[0].dbname
            bookworm.query.aesthetic[aesthetic] = bookworm.query.aesthetic[aesthetic] || category
        });
    },

    treemap: function () {

        var bookworm = this;

        bookworm.requireAesthetics(["level1","level2","level3"],"categorical")

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
            .value(function(d) {
                return d[bookworm.query.aesthetic.x];
            })
            .children(function(d, depth) { return depth ? null : d.children; })
            .sort(function(a, b) {return a.value - b.value; })
            .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
            .round(false);

        var svg = d3.select("#svg")
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

    resetAesthetics: function() {

    },

    sunburst : function() {
        var bookworm = this;
        var root = bookworm.nestData()

        this.requiredAesthetics  = ["level1","level2","level3","θ"]
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
            .on("click", click)
            .attr("title",function(d) {
                return d[bookworm.query.aesthetic.x]
            })
            .transition()
        //          .duration(1000)
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

        console.log(newWords);
        newData = layout.points(newWords.filter(function(d) {
            return out.extraField;
        }))

        console.log(newData);
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

        newElements = d3
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

    makePlotArea: function(svgSelection) {

        //create if not exists
        root = d3.selectAll("#svg") || svgSelection

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
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
        this.selections.tooltip = tooltip

    },

    heatmap : function() {

        var bookworm = this;
        var w = window.innerWidth*.9,h=window.innerHeight*.9
        var limits = {'x':[w*.1,w*.66],'y':[75,h*.95]}
        var myQuery = this.query
        var colorScaler = bookworm.returnScale()
        var sizeScaler  = bookworm.returnScale()
        var mainPlotArea= bookworm.selections.mainPlotArea

        transition=2000

        var scales = this.updateAxes(delays = {"x":0,"y":0},transitiontime=transition)
        var xstuff = scales[0]
        var ystuff = scales[1]
        var x = xstuff.scale
        var y = ystuff.scale

        bookworm.data = bookworm.data.map(function(d) {
            d.key = d[myQuery['aesthetic']['x']] + d[myQuery['aesthetic']['y']]
            return(d)
        })

        if (myQuery['scaleType']==undefined) {myQuery['scaleType'] = "linear"}

        colorValues = bookworm.data.map(function(d) {
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
        xVariable = myQuery['groups'][0]
        yVariable = myQuery['groups'][1]


        bookworm.legends.color = Colorbar()
            .scale(bookworm.scales.color)
            .update()

        gridPoint
            .attr('x',function(d) {return x(bookworm.plotTransformers[xVariable](d[xVariable]))})
            .attr('y',function(d) {return Math.round(y(bookworm.plotTransformers[yVariable](d[yVariable])))})
            .attr('height', y.pixels)
            .attr('width', x.pixels)
            .makeClickable(bookworm.query,bookworm.legends.color)
            .transition()
            .duration(2500)
            .style('fill',function(d) {
                var color = bookworm.scales.color(d[myQuery['aesthetic']['color']]);
                if (d[myQuery['aesthetic']['color']]==0) {color='#393939'}
                if (color=="#000000") {color='#393939'}
                return color;
            })

        bookworm.legends.fill.update(bookworm.scales.color)

    },

    settings:{
        //things we need to remember for plotting preferences.
        "lastPlotted":null,
    },

    linechart : function() {
        var mainPlotArea = this.selections.mainPlotArea;
        var bookworm = this;
        console.log(bookworm.data)
        var query=bookworm.query;

        if ('undefined' == typeof(query['aesthetic']['x'])) {
            query['aesthetic']['x'] = query['groups'][0]
        }

        //        if ("undefined" == typeof(query['aesthetic']['group'])) {
        //          if ("undefined" != typeof(query['groups'][1])) {
        //            query['aesthetic']['group'] = query['groups'][1]
        //        }
        //     }

        bookworm.data.sort(function(a,b) {
            return parseFloat(a[query['aesthetic']['x']] - b[query['aesthetic']['x']])
        })

        var smoothingSpan = this.smoothingSpan || 0;

        var oldy = JSON.stringify(bookworm.query.aesthetic['y'])
        this.smooth(smoothingSpan)

        bookworm.query.aesthetic['y'] = JSON.parse(oldy) + "smoothedValues"

        bookworm.updateKeysTransformer(bookworm.query.aesthetic['y'])

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

                value = x(bookworm.plotTransformers[name](d[name]));
                return value})
            .y(function(d) {
                value =
                    y(bookworm.plotTransformers[query['aesthetic']['y']](d[query['aesthetic']['y']]));
                return value })


        nestedData = d3.nest().key(function(d) {return d[query['aesthetic']['group']]}).entries(bookworm.data)


        points = this.selections.mainPlotArea
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
                return lineGenerator(d.values)
            })


        //        selection
        //          .attr('stroke','#F0E1BD')
        //        .attr('fill','#F0E1BD')


        selection
            .on('mouseover',function(d) {
                d3.select(this).style('stroke-width','5')
            })
            .on('mouseout',function(d) {
                d3.select(this).style('stroke-width','')
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
            .attr("r",6)
            .attr('fill','yellow')



        bookworm.query.aesthetic['y'] = JSON.parse(oldy)
        bookworm.alignAesthetic()

        circles.makeClickable()

    },

    updateAxes : function(delays,transitiontime,yVariable) {
        yVariable = yVariable || "y"
        transitiontime = transitiontime || 2000;
        delays = delays || {"x":0,"y":0}
        var bookworm = this;
        var mainPlotArea = this.selections.mainPlotArea;

        var ystuff = bookworm.makeAxisAndScale('y',undefined,"value")

        var xstuff = bookworm.makeAxisAndScale('x')

        var x = xstuff.scale
        var y = ystuff.scale

        if (xstuff.type=="numeric") {
            x.domain([0,x.domain()[1]])
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

        xaxis
            .attr('transform','translate(0,' + xstuff.limits['y'][1] + ')')
            .transition()
            .transition()
            .delay(delays.x)
            .duration(transitiontime)
            .call(xstuff.axis)
            .attr("id","x-axis")
            .attr('class','x axis')

        return [xstuff,ystuff]
    },

    title: function() {
        //Title is a query visualization, naturally.
        this.selections.mainPlotArea.selectAll(".titleArea").transition().style("opacity",0).remove()
        var titleArea = this.selections.mainPlotArea.append("g").attr("class","titleArea")

        newTitle = tmp

    },

    barchart : function() {
        var bookworm = this;
        var query = bookworm.query;
        var mainPlotArea = this.selections.mainPlotArea;

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

        //this order matters, because the y-axis is curtailed and can exclude
        //elements from the x-axis. Yikes. That's no good.
        transition=2000

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

            colors = d3.scale.category20().range().concat(d3.scale.category20b().range()).concat(d3.scale.category20c().range())
            colors = colors.concat(colors).concat(colors).concat(colors)
            colorscale = d3.scale.category20c().domain(y.domain()).range(colors)
            getColor = function(d) {return colorscale(d[query.aesthetic.y])}
        }

        bookworm.colorscale=colorscale
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
            .attr("height",y.pixels)
            .attr('x',xstuff.limits.x[0])
            .attr('y',function(d) {
                return y(d[query['aesthetic']['y']])
            })
            .style("fill",function(d) {return getColor(d)})

        bars.exit().remove()

        bars
            .transition()
            .duration(2000)
            .attr("height",y.pixels)
            .attr('x',xstuff.limits.x[0])
            .attr("width",function(d) {
                return x(d[query['aesthetic']['x']]) - xstuff.limits.x[0]
            })
            .transition()
            .duration(2000)
            .attr('y',function(d) {
                yVariable = query['aesthetic']['y']
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

        //this order matters, because the y-axis is curtailed and can exclude
        //elements from the x-axis. Yikes. That's no good.

        transition = 2000

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
    "queryVisualizations" : {

        "categorical" : function () {
            var that = {};
	    var selector,bworm,boundTo;

            function labelSizes() {
                //will eventually give the number of words and texts for each thing; should not block.
            }

            that.pull = function() {
                labelSizes()
            }

            that.push = function() {
                text = box.property("value")
                text = text.replace(" *, *",",")
                console.log(text)
                boundTo = text.split(",")
                parent.query.search_limits.word = boundTo
                return that
            }

            that.create = function(domElement) {
                selector = domElement
                    .append("div")
                    .append("select")
                    .attr("class","category queryVisualization")

                return that
            }

            that.initialize = function(bworm,target) {
                var sortBy = "WordCount"
                parent = bworm
                boundTo = parent.query.aesthetic[target]
		parent.variableOptions.update()
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

                    thisSelection = selector.selectAll('option').data(myData)
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
            var that = {}
            var box;
            var parent; //holds a reference to the bookworm itself--seems necessary
            // to update inside the scope.
            var boundTo;

            that.pull = function() {
                box.property("value",boundTo.join(", "))
                return that
            }

            that.push = function() {
                text = box.property("value")
                text = text.replace(" *, *",",")
                console.log(text)
                boundTo = text.split(",")
                parent.query.search_limits.word = boundTo
                return that
            }

            that.create = function(domElement) {
                box = domElement
                    .append("div")
                    .append("input")
                    .attr("class","text queryVisualization")
                    .on("keyup",function(d) {
                        that.push()
                        parent.alignAesthetic()
                        if(d3.event.keyCode == 13){
                            parent.updatePlot()
                        }
                    })


                return that
            }

            that.initialize = function(bworm) {
                parent = bworm
                boundTo = parent.query.search_limits.word
                that.pull()
                return that
            }

            return that
        },

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
                    bookworm.updatePlot(function() {bookworm[bookworm.query.plotType]})
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

            myQuery = JSON.parse(JSON.stringify(query));
            myQuery['search_limits']['word'] = []
            myQuery['groups'] = [category]
            myQuery['counttype'] = ['WordCount','TextCount']
            return d3.json(destinationize(myQuery),function(json) {
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
    "myPlot" : function() {
        updateAxisOptionBoxes()

        //Don't show any chartSpecific elements at all (including this type)
        d3.selectAll(".chartSpecific").style('display','none')

        //display elements that are classed with this chart type.
        d3.selectAll("." + query.plotType).style('display','inline')

        if (query.plotType=='heatMap') {return Bookworm.functions.heatMapFactory() }
        if (query.plotType=='map') {return mapQuery()}
        if (query.plotType=='line') {return linePlot()}

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
        // Changes the shape of the hierarchical json the API
        // delivers to a flat one with attribute names
        // which takes more space but plays more nicely with d3/javascript.
        // Uses recursion, yuck.
        var names = []

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
        var flat = flatten(json);

        //add the labels.
        results = flat.map(function(localdata){
            return(toObject(names,localdata));
        })

        bookworm.data = results

        d3.keys(results[0]).map(function(key) {
            BookwormClasses.updateKeysTransformer(key)
        })
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
        update : function(database,callback) {
	    //this can't refer to "bookworm" here.
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

                callback()

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
        bookworm.dataTypes[key]="Categorical"
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
            bookworm.dataTypes[key]="Date"
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
    "topn" : function(n,key,dataset) {
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
    "functions":{


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

        sizeLegend = svg
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
        return( "/cgi-bin/dbbindings.py/?queryTerms=" + encodeURIComponent(JSON.stringify(query)))
    },

    "runSearch" : function(d) {
        var query = this.query;
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

    "makeAxisAndScale" : function(axis,limits,sortBy,descending) {

        var bookworm = this;
        var query = bookworm.query

        //axis is either "x" or "y"
        //limits are defined in pixels.

        var w = bookworm.selections.container.attr("width")
        var h = bookworm.selections.container.attr("height")

        limits = limits || {'x':[w*.2,w*.9],'y':[85,h*.9]}
        //the scale can be sorted by either by "name" or "values",
        sortBy = sortBy || "name";

        //And that direction can be descending (true) or ascending (false)
        descending = descending || true;

        variableName = query['aesthetic'][axis]

        vals = d3.nest()
            .key(function(d) {
                return d[variableName]
            })
            .entries(bookworm.data)
            .map(function(d) {
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

        datatype = bookworm.dataTypes[variableName]

        function updateOrder() {
            if (sortBy == "value") {
                value = function(keyname) {
                    local = bookworm.data.filter(function(d) {
                        return d[query["aesthetic"][axis]]==keyname
                    }).map(function(d) {return d[query["aesthetic"]["x"]]})
                    return d3.median(local)
                }
                vals.sort(function(a,b) {
                    return (value(a) - value(b))
                })
            }

            if (sortBy == "name") {
                if (datatype == "Date" || datatype == "Numeric") {
                    vals.sort(function(a,b){return(a-b)})
                } else { vals.sort() }
            }

            if (descending) {
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

            names = bookworm.topn(n,variableName,bookworm.data)

            bookworm.data = bookworm.data.filter(function(entry) {
                return(names.indexOf(entry[variableName]) > -1)
            })
            //order by the names by defaut.

            vals = names
            updateOrder()
            scale = d3.scale.ordinal().domain(vals).rangeBands(limits[axis])
            pointsToLabel = vals
            thisAxis = d3.svg.axis()
                .scale(scale)
            scale.pixels = scale.rangeBand()//(limits[axis][1]-limits[axis][0])/vals.length;
        }

        if (datatype=="Numeric") {
            console.log("numeric")
            vals = vals.map(function(d) {return parseFloat(d)})
            updateOrder()
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

            if (query.aesthetic[axis] == "WordsRatio") {
                scale = d3.scale.log().domain(domain).range([limits[axis][0],limits[axis][1]-pixels])
            }
            thisAxis = d3.svg.axis()
                .scale(scale)
                .tickFormat(d3.format('g'))
                .tickSubdivide(1)
            scale.pixels = pixels
        }

        if (datatype=="Date") {
            updateOrder()
            pixels = (limits[axis][1]-limits[axis][0])/vals.length;

            scale = d3.time.scale()
                .domain(d3.extent(vals))
                .range([limits[axis][0],limits[axis][1]-pixels])

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
        "color":d3.scale.log().range(["#D61818","#FFAE63","#FFFFBD","#B5E384"].reverse()),
        "size":d3.scale.sqrt().range([3,55])
    },
    "legends":{
    }
}

Bookworm = function(query) {
    that = BookwormClasses;
    that.query = query || {};
    that.plotTransformers = {};
    that.dataTypes={};
    bookworm = that;//kludgy--the scoping requires bookworm be defined for some grandchild of this function.
    //that.initializeInterfaceElements();



    return that
}
