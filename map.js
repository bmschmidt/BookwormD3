BookwormClasses.map = function() {
    var bookworm = this;
        //Use lat and lng as if they meant x and y
        bookworm.query['aesthetic']['x'] = "lng"
        bookworm.query['aesthetic']['y'] = "lat"

        if (typeof(bookworm.query['aesthetic']['size'])=="undefined") {
            bookworm.query["aesthetic"]["size"] = "WordCount"
        }

        if (typeof(bookworm.query['aesthetic']['color'])=="undefined") {
            bookworm.query["aesthetic"]["size"] = "WordsPerMillion"
        }

        var baseMap = drawMap(document.getElementById('mapChoice').value)
        var initialOpacity = .7

        //allow multiple circles on the same point?
        var colorScaler = bookworm.returnScale()
        var sizeScaler  = bookworm.returnScale()

        function mapTransition() {
            mainPlotArea.selectAll('circle')
                .transition()
                .duration(4500)
		.delay(500)
                .attr('r',2)
                .attr('fill','white');
        }

        function updateChart() {
            mainPlotArea.selectAll('title').remove()

            bookworm.data.sort(function(a,b) {
                return(b[bookworm.query['aesthetic']['size']]-a[bookworm.query['aesthetic']['size']])
	    } );

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
                    return sizescale(d[bookworm.query['aesthetic']['size']])/2
                    //Divided by two b/c the scale wants to return diameter, not radius.
                })
                .style('fill',function(d) {
                    return colorscale(d[bookworm.query['aesthetic']['color']])
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

            d3.json(destinationize(bookworm.query),function(json) {
                bookworm.data = parseBookwormData(json,bookworm.query);

                values = bookworm.data.map(function(d) {return(d[bookworm.query['aesthetic']['color']])});

                colorscale = colorScaler.values(values).scaleType(d3.scale[bookworm.query['scaleType']])()

                sizes = bookworm.data.map(function(d) {return(d[bookworm.query['aesthetic']['size']])});

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
    }

}
