d3.layout.heatmap = function() {
    var that, //output
        limits,//in the form {"x":[1,20],"y":[5,60]}
        color,
	x,
	y,
	colorbar,
        parentPlotArea = d3.select("svg");
    

    
    xscale = d3.scale

    that.createColorbar = function() {
	parentPlotArea.selectAll(".cell")
	    .on("mouseover"),function(d) {colorbar.update(xvalue(d))}
    }
    
    that.aesthetic = function(x) { 
 	if (!arguments.length) return aesthetic; 
	    aesthetic= x
 	return that
    } 
    
    that.parentPlotArea = function(x) {
        if (!arguments.length) return parentPlotArea;
        parentPlotArea= x
        return that
    }

    that.scale = function(x) {
        //for the color.
        if (!arguments.length) return scale;
        scale= x
        return that
    }




}
