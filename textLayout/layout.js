d3.layout.paragraph = function() {

    var words = [],
    paragraph = {},
    wait,
    rowLength = 300,
    style = "font-size:12px",
    svg,lineWidth,
    padding={'x':3,"y":24},
    label;

    //svg just stored way off the chart for testing.
    svg = d3.select("body").append("svg").attr("style","position:absolute;left:-1000px;top:-1150px;")

    var textSize = function(x) {
        var testBed = testBed || svg.append("text").attr('x',-1000).attr('y',-1000).attr("style",style)
        var rect = testBed.text(x)[0][0].getBBox()
        return [rect.width,rect.height]
    }

    label = function(d) {
        return (d.label)
    }

    paragraph.label = function(x) {
        if (!arguments.length) return label;
        label=x
        return paragraph
    }

    paragraph.style = function(x) {
        if (!arguments.length) return style;
        style=x
        return paragraph
    }

    var filter = function(d) {return true}

    paragraph.filter = function(x) {
        //a filter on what's given a plotting location, but not what is returned as data.
        if (!arguments.length) return filter
	filter=x;
        return paragraph
    }

    paragraph.points = function(x) {

        var next = {"x":0,"y":0};

        return x.map(function(word) {
            var d = {};
	    if ((typeof word) != "string") {
		d3.keys(word).map(function(key) {
                    d[key] = word[key]
		})
	    }
            d.label = label(word)
            if (filter(d)) {
                d.x = next.x
                d.y = next.y
                next.x = next.x + textSize(d.label)[0] + padding.x
                if ((next.x) > rowLength) {
                    //wrap lines
                    d.x = 0
                    next.y = next.y + padding.y;
                    d.y = next.y
                    next.x = 0 + textSize(d.label)[0] + padding.x
                }
            }
            return d;
        })
    }


    paragraph.padding = function(x) {
        if (!arguments.length) return padding;
        padding = x;
        return paragraph
    }
    paragraph.rowLength = function(x) {
	//in pixels;
        if (!arguments.length) return rowLength;
        rowLength = x;
        return paragraph
    }

    paragraph.width = function(x) {
	//in pixels;
        if (!arguments.length) return rowLength;
        rowLength = x;
        return paragraph
    }

    paragraph.words = function(x) {
        if (!arguments.length) return words;
        limits = x;
        return paragraph
    }
    return paragraph
}
