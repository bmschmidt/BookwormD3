BookwormClasses.map = function(mapChoice) {

    var mapChoice = mapChoice || "USA"
    var bookworm = this;
    var colorscale = bookworm.scales.color;
    var mainPlotArea = bookworm.selections.mainPlotArea;


    var initialOpacity = .7

    //allow multiple circles on the same point?
    var colorScaler = bookworm.returnScale()
    var sizeScaler  = bookworm.returnScale()

    //Predefine certain aesthetics.
    bookworm.query['aesthetic']['x'] = "lng"
    bookworm.query['aesthetic']['y'] = "lat"

    if (typeof(bookworm.query['aesthetic']['size'])=="undefined") {
        bookworm.query["aesthetic"]["size"] = "WordCount"
    }

    if (typeof(bookworm.query['aesthetic']['color'])=="undefined") {
        bookworm.query["aesthetic"]["size"] = "WordsPerMillion"
    }

    bookworm.scales.size = d3.scale.sqrt()
	.domain(
	    d3.extent(
		bookworm.data.map(function(d) {
		    return d[bookworm.query.aesthetic.size]
        
		})
	    )
    ).range([2,50])
    
    var sizescale = bookworm.scales.size;


    colorscale = colorScaler.values(
        d3.extent(bookworm.data.map(function(d) {
            return d[bookworm.query.aesthetic.size]
        }))
    )();

    bookworm.drawSizeLegend(sizescale);
    mapTransition()

    var baseMap = this.drawMap(mapChoice)

    projection = baseMap()
    bookworm.updateQuery()

    values = bookworm.data.map(function(d) {return(d[bookworm.query['aesthetic']['color']])});

    bookworm.query.scaleType = bookworm.query.scaleType || "log"

    bookworm.scales.color = colorScaler.values(values).scaleType(d3.scale[bookworm.query.scaleType])()

    sizes = bookworm.data.map(function(d) {return(d[bookworm.query['aesthetic']['size']])});


    sizescale.domain(d3.extent(sizes))
        .range([0,100])

    sizescale.nice()



    if (bookworm.legends.color===undefined) {
        bookworm.legends.color = Colorbar()
    }
    bookworm.legends.color = bookworm.legends.color.scale(bookworm.scales.color).update()

    if (bookworm.legends.size===undefined) {
        bookworm.legends.size = undefined;
    }

    bookworm.scales.size.domain(d3.extent(bookworm.data.map(function(d) {
        return d[bookworm.query.aesthetic.color]})))

    function mapTransition() {
        mainPlotArea.selectAll('circle')
            .transition()
            .duration(4500)
            .delay(500)
            .attr('r',2)
            .attr('fill','white');
    }

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
        .makeClickable(bookworm.query,bookworm.legends.color)
    
    mypoints.classed("hidden",false)

    mypoints
        .transition()
        .duration(2500)
        .attr('r',function(d) {
            return bookworm.scales.size(d[bookworm.query['aesthetic']['size']])/2
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

    my()

}

BookwormClasses.drawMap =  function (mapname) {
    bookworm = this;

    bookworm.scales.projection = d3.geo.equirectangular();

    mapname = mapname;

    var projection;
    var w = 1000,
        h=600;
    my = function() {

        sourceJson = "data/bigearth.json"

        var maplevel = bookworm.selections.background;
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
