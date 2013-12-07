function colorBar() {

    var scale,origin,barHeight,barWidth,title;

    var that = {};
    drag = d3.behavior.drag()
        .on("drag", function(d,i) {
            d.x += d3.event.dx
            d.y += d3.event.dy
            d3.select(this).attr("transform", function(d,i){
                return "translate(" + d.x + ',' + d.y  + ")"
            })
        });

    

    var update = function(scale,origin,barHeight,barWidth,title) {

	
        //This either creates, or updates, a fill legend, and drops it on the screen.
        //A fill legend includes a pointer that can be updated in response to mouseovers, because that's way cool.
	
        var query = {"scaleType":"log"}
	
        // define some defaults

        if (origin===undefined) {
            //attempt to use a current color legend.
            try{
		current = d3.selectAll(".color.legend").datum();
                origin = [current.x,current.y] }
            catch(err) {origin = [125,65]}
        }
	
        if (barHeight===undefined) { barHeight = d3.min([window.innerHeight - 3*origin[1],window.innerHeight*.75]) }

        if (barWidth===undefined) { barWidth = 20 }

	if (title===undefined) {title = ""}

        //Create a fill legend entry, if it doesn't exist

        fillLegend = d3
	    .select("svg")
	    .selectAll(".color.legend")
	    .data([{
            "x":origin[0],"y":origin[1]}]);


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

        legendRange = d3.range(0,barHeight,by=barHeight/(fillLegendScale.domain().length-1))
        legendRange.push(barHeight)

        fillLegendScale.range(legendRange)

        fillRects = fillLegend.selectAll("#fillLegendRects").data([1])
        fillRects.enter().append("g").attr("id","fillLegendRects")
        console.log(fillRects)
        colorScaleRects = fillRects.selectAll('rect').data(d3.range(0,barHeight))

        colorScaleRects.enter()
            .append("rect")
            .classed("rect",true)

        colorScaleRects
            .attr({
                width: barWidth,
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
            .attr("transform","translate (" + (barWidth) + ",0)")

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
            .attr("transform","translate(0," + (barHeight + 25) + ")")
            .on("mouseover",function(d) {
                //make it bold or something to promot clicking.
            })
            .on("click",function(d) {
                current = d3.select(this);
                if(current.text()=="log scale") {
                    changeColorScale(d3.scale.linear)
                    current.text("linear scale").style("fill","white")
                }
                if(current.text()=="linear scale") {
		    scaleType = "log"
                    changeColorScale(d3.scale.log)
                    current.text("log scale").style("fill","white")
                }

            })


        colorAxis
            .transition()
            .duration(1000)
            .call(colorAxisFunction)

        //make a title

        titles = fillLegend.selectAll(".axis.title").data([{"label":title}])

        titles.enter().append("text")

        titles
            .attr("id","#colorSelector")
            .attr('transform','translate (0,-10)')
            .classed("axis",true)
            .classed("title",true)
        //.text(function(d) {return nameSubstitutions[d.label]})
            .on('click',function(d){
                chooseVariable(fillLegend,"colorSelector",quantitativeVariables,'aesthetic','color')})

        titles.exit().remove()

    }


    prettyName =  function(number) {

        var comparisontype = comparisontype || function() {return ""}

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



    updatePointer=function(inputNumbers) {

        //Update the color pointer to match the input numbers.
        //This is a more general problem than I'm casting it here: it could, say also update a circle

        var pointerSize,pointerColor; //undefined and unused: should be passed to function.

        var barWidth = 20; //Should be dynamic or responsive.
        var pointerWidth = Math.round(barWidth*3/4);

        pointers = d3
            .selectAll('.legend.color')
            .selectAll('.pointer')
            .data([inputNumbers])

        //Also creates a pointer if it doesn't exist yet.
        pointers
            .enter()
            .append('path')
            .attr('transform',"translate(0," + (fillLegendScale(inputNumbers) - pointerWidth)+ ')')
            .classed("pointer",true)
            .classed("axis",true)
            .attr('d', function(d) {
                var y = 0, x = barWidth-pointerWidth;
                return 'M ' + x +' '+ y + ' l ' + pointerWidth + ' ' + pointerWidth + ' l -' + pointerWidth + ' ' + pointerWidth + ' z';
            })
            .attr("fill","grey")
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

    that.updateScale = update
    that.updatePointer = updatePointer
    return that;
}

