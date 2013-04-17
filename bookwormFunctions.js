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
        .attr('fill','white')
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
        .style('font-family','sans-serif')
        .style('font-size','9')
        .style('text-anchor','middle')
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
            //            query['aesthetic']['color'] = d.variable;
            query[queryPartBeingUpdated][partOfQueryPartBeingUpdated] = d.variable
            queryAligner.updateQuery();
            shutWindow()
            removeOverlay()
            currentPlot = myPlot()
            currentPlot()
        })
}


updatePointer = function() {
    //this function will be defined by the pointer when it's created.
    //That seems wrong, doesn't it
    console.log("updatePointer is undefined")
}

fillLegendMaker = function(colorscale) {
    var yrange = [0,h*.75]
    colorticks = colorscale.ticks(15);

    width = 25
    plot = true
    colorpoints = colorLegend.selectAll('rect')
    colorlabels = colorLegend.selectAll('text')

    function my() {
        var data1 = d3.range(yrange[0],yrange[1]);

        scaleRects = colorLegend.selectAll("rect")
            .data(data1,function(d){return(d)});

        legendScale=colorscale.copy()
        legendScale.range(d3.range(yrange[0],yrange[1]+yrange[1]*.001,by=(yrange[1]-yrange[0])/(legendScale.domain().length-1)))

        scaleRects.enter()
            .append("rect")
            .attr({
                width: width,
                height:1,
                y: function(d) { return d},
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

        colorAxis = d3.svg.axis()
            .scale(legendScale)
            .orient("right")
            .tickFormat(formatter)

        colorLegend.selectAll('text').remove()

        colorLegend.append("g")
            .attr('id','color-axis')
            .call(colorAxis)
            .attr("class","axis") // note new class name
            .attr("transform","translate (" + (width) + ",0)")


        writeTitle = function() {
            //Figure out what they're trying to plot, for the title.
            //starredKeys are the numerator in a ratio query.
            starredKeys = d3.keys(query['search_limits']).filter(function(d) {
                return d.search("\\*") > 0
            })

            if (starredKeys.length==0) {starredKeys=["word"]}

            text1 = starredKeys.map(function(key) {

                values = query['search_limits'][key].join('"/"')
                var pretty = key.replace("\*","")
                console.log(pretty)
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
                .attr('text-anchor','middle')
                .text(text1)
                .attr('fill','white')
                .attr('font-size',35)
                .attr('font-family',"Arial")
                .attr('transform','translate(10,0)')
        }

        writeTitle()

        colorLegend.append('text')
            .attr('transform','translate (0,-10)')
            .attr('class','axis')
            .text(nameSubstitutions[query['aesthetic']['color']])
            .attr('fill','white')
            .attr('font-size','12')
            .attr('text-anchor','middle')
            .attr('font-family','sans-serif')
            .on('click',function(d){chooseVariable(colorLegend,"colorSelector",quantitativeVariables,'aesthetic','color')})
        //function(parentNode,nodeName,quantitativeVariables,queryPartBeingUpdated,partOfQueryPartBeingUpdated)
        //set up pointer

        d3.selectAll('#pointer').remove()

        console.log("Trying to set up pointer")

        //The pointer is 14 pixels wide. That's what all the 14s here are doing.
        colorLegendPointer = colorLegend
            .append('path')
            .attr('id','pointer')
            .attr('d', function(d) {
                var y = 0, x = width-14;
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

myPlot = function() {
    updateAxisOptionBoxes()

    d3.selectAll(".chartSpecific").style('display','none')
    d3.selectAll(".debugging").style('display','none')
    d3.selectAll("." + query.plotType).style('display','inline')

    if (query.plotType=='heatMap') {return heatMapFactory() }
    if (query.plotType=='map') {return mapQuery()}
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

removeElements = function() {
    vals = ['rect','text','path','circle','line','tick'].map(function(type) {svg.selectAll(type).transition().remove()})
}


returnScale = function() {
    var colors = greenToRed,
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
            scale.domain(d3.range(min,max,(max-min)/(colorscale.range().length)).map(function(n) {return(Math.exp(n))}))
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

function key(d) {return d.key;};

function popitup(url) {
    newwindow=window.open(url,'name','height=640,width=1000');
    if (window.focus) {newwindow.focus()};
    return false;
}

function destinationize(query) {
    //Constructs a cgi-bin request to local host.
    return( "/cgi-bin/dbbindings.py/?queryTerms=" + encodeURIComponent(JSON.stringify(query)))
};

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
    defaultOptions : [
        {"name":"Year","dbname":"year","database":"presidio","type":"time"},
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
	{"name":"Date (yearly resolution)","dbname":"date_year","database":"ChronAm","type":"time"}
    ]
,
    options : [],
    update : function(database,followupFunction) {
	variableOptions.options = []
	localQuery = {"method":"returnPossibleFields","database":database}
	d3.json(destinationize(localQuery), function(error, json) {
            if (error)        console.warn(error);
	    console.log("hi")
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
    followup = function() {
            axes = d3.selectAll(".categoricalOptions")
            axes.selectAll('option').remove()
	    
            selected = axes.selectAll('option').data(variableOptions.options)
            selected.exit().remove()
	    
            newdata = selected.enter()
	    
            newdata.append('option')
		.attr('value',function(d) {return d.dbname})
		.text(function(d) {return d.name})
            queryAligner.updateQuery()
    }
    variableOptions.update(query['database'],followup)
}



updateKeysTransformer = function(key) {
    //This is called for its side-effect: assigning a function to each key in plotTransformers
    //default: return as is.
    plotTransformers[key] = function(key) {return(key)}
    dataTypes[key]="Categorical"
    //if a date: return a dateTime object
    isADate = false
    key.split("_").map(function(part) {
        if (['year','month','day','week','decade','century',"Year","Decade","yearchunk"].indexOf(part) >=0) {isADate=true}
    })

    if (isADate) {
        plotTransformers[key] = function(originalValue) {
            datedValue = new Date()
            extractRelevantField = function(dateKey) {
                strings = dateKey.split("_")
                if (strings.length>1) {return strings[1]}
                return strings[0]
            }
            relevantField = extractRelevantField(key)
            if (['month','day','week'].indexOf(relevantField) >=0) {
                datedValue.setFullYear(0,0,originalValue)
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
        //console.log(d)
        if (isNaN(d) & d!="" & d!="None") {
            console.log("giving up on" + d)
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
                //So we don't have to store strings as quoted json
                value = JSON.stringify(value)
            }
            eval (bindTo + ' = ' + value)
        }
        //update based on the aesthetics
        queryAligner.alignAesthetic()

        //update all listening boxes based on the query
        d3.selectAll("[bindTo]")
            .property('value', function() {
                value = eval(d3.select(this).attr("bindTo"))
                if (typeof(value)=="object") {
                    return(JSON.stringify(value))
                }
                return(value)
            })

    },

    alignAesthetic: function() {
        dummy={}
        if ('aesthetic' in query) {
            m = d3.keys(query['aesthetic'])
            m.map(function(d) {
                dummy[query['aesthetic'][d]] = 1
            }
                 );
            query['counttype'] = d3.keys(dummy);
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



drawSizeLegend = function() {
    sizeLegend.selectAll('text').remove()
    sizeLegend.selectAll('circle').remove()

    sizeAxis = d3.svg.axis().scale(sizescale).orient("right").tickValues(function() {
        nestedScale = d3.scale.linear().range(nwords.range()).domain(nwords.range());
        nestedScale.nice();
        return nestedScale.ticks(6).map(function(n) {return nwords.invert(n)})
    }).tickFormat(prettyName)

    sizeLegend.append('g').attr('id','size-axis').call(sizeAxis).attr('class','axis')

    sizescale.ticks(6)

    sizeLegendPoints = sizeLegend.selectAll('circle').data(sizeAxis.tickValues()())

    sizeLegendPoints.enter().append('circle')
        .attr('r',function(d) {return nwords(d)/2 })
        .attr('class','axis')
        .attr('stroke','white')
        .attr('fill','white')
        .attr('opacity',.2)
        .attr('transform',function(d) {
            return('translate(0,' + nwords(d)/2+')')
        })

    sizeLegend
        .append('text')
        .attr('transform','translate(0,-10)')
        .attr('class','axis')
        .text(nameSubstitutions[query['aesthetic']['size']])
        .attr('fill','white')
        .attr('font-size','12')
        .attr('font-family','sans-serif')
        .attr('text-anchor','middle')
        .on('click',function(d){chooseVariable(sizeLegend,"sizeSelector",quantitativeVariables,'aesthetic','size')})
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

    var myQuery = query

    var baseMap = drawMap(document.getElementById('mapChoice').value)
    var initialOpacity = .7

    //This breaks in some cases, so I'm just removing it. The additional groups will have to specified in 'aesthetic' somehow
    var additionalGroupings = query['groups'].filter(function(d) {if (d!='lat' & d!='lng') {return false}}) //allow multiple circles on the same point?
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
        paperdata.sort(function(a,b) {return(b[query['aesthetic']['size']]-a[query['aesthetic']['size']])} );

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
                updatePointer(d[query['aesthetic']['color']])
            })
            .on('mouseout',function(d) {
                this.setAttribute('opacity',initialOpacity);
                colorLegendPointer.transition().duration(2500).attr('opacity',0)
            })
            .transition()
            .duration(2500)
            .attr('r',function(d) {
                return sizescale(d[query['aesthetic']['size']])/2 //Divided by two b/c the scale wants to return diameter, not radius.
            })
            .attr('fill',function(d) {
                return colorscale(d[query['aesthetic']['color']])
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
        queryAligner.updateQuery()
        webpath = destinationize(query);
        d3.json(webpath,function(json) {
            paperdata = parseBookwormData(json,query);

            values = paperdata.map(function(d) {return(d[query['aesthetic']['color']])});

            colorscale = colorScaler.values(values).scaleType(d3.scale[$("#scaleType").val()])()

            sizes = paperdata.map(function(d) {return(d[query['aesthetic']['size']])});

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

        queryAligner.updateQuery()

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
                        //home many elements to display depends on the width: no more than ten pixels
			//vertically, and 30 pixels horizontally
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
                    scale.pixels = (limits[axis][1]-limits[axis][0])/vals.length;
                }



                if (datatype=="Numeric") {
		    //this code currently misbehaves with non-consecutive ranges
                    console.log(axis + " is numeric")
                    vals = vals.map(function(d) {return parseFloat(d)})
                    if (axis=='x') {
                        vals.sort(function(a,b){return(a-b)})
                        testing = vals
                    }
                    if (axis=='y') {
                        vals.sort(function(a,b){return(b-a)})
                    }
		    pixels = (limits[axis][1]-limits[axis][0])/vals.length;
                    scale = d3.scale.linear().domain(d3.extent(vals)).range([limits[axis][0],limits[axis][1]-pixels])
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
                        testing = vals
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


                return({"scale":scale,"axis":thisAxis,"datatype":datatype})
            }

            xstuff = scaleAndAxis('x')
            xAxis = xstuff.axis.orient("top")
            x = xstuff.scale

            ystuff = scaleAndAxis('y')
            yAxis = ystuff.axis.orient("right")
            y = ystuff.scale

	    offsets = {'Date':.5,'Categorical':0,'Numeric':.5}
            //yaxis
            d3.selectAll('#y-axis').remove()
            svg.append("g")
                .attr('id','y-axis')
                .call(yAxis)
                .attr("class","axis") // note new class name
                .attr("transform","translate(" + (x.pixels+limits['x'][1])  +"," + (y.pixels*offsets[ystuff.datatype]) + ")")

            //x-axis
            d3.selectAll('#x-axis').remove()
	    

	    
            svg.append("g")
                .attr('id','x-axis')
                .call(xAxis)
                .attr("class","axis") // note new class name
                .attr("transform","translate("+x.pixels*offsets[xstuff.datatype]+ "," + (limits['y'][0])  +")")

            //Key the data against the actual interaction it is, so transitions will work.
            paperdata = paperdata.map(function(d) {
                d.key = d[myQuery['groups'][0]] + d[myQuery['groups'][1]]
                return(d)
            })

            colorValues = paperdata.map(function(d) {return(d[query['aesthetic']['color']])})
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
                    updatePointer(d[query['aesthetic']['color']])
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
                        color = colorscale(d[query['aesthetic']['color']]);
                        if (d[query['aesthetic']['color']]==0) {color='#393939'}
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
