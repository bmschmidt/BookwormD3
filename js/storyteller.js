

tellAStory = function(storyname,stateholder,storyholder,storyboardDiv,updateFunction) {

    stateholder = stateholder || plotState
    storyholder = storyholder || stories
    storyboardDiv = storyboardDiv || d3.selectAll("#storyboard")
    if (storyboardDiv[0].length == 0) {
        console.log("adding div")
        storyboardDiv = d3.select("body").append("div").attr("id","storyboard")
    }

    updateFunction = updateFunction || function () {restartAt(storyholder.currentTime);optimizeZoom()}
    updateFunction = function() {bookworm.updatePlot()}

    if (storyname===undefined) {//Here's an example story.
        storyname = "modesOfVision"
    }
    var currentPanel=-1;

    //push it to and from JSON to get a copy.

    panels = JSON.parse(JSON.stringify(storyholder[storyname]))

    panels = storyholder[storyname]

    panels.map(function(d) {
        currentPanel = currentPanel+1;
        d.index = currentPanel;
    });

    d3.select("body")
        .on("keydown", function() {
            code = d3.event.keyCode
            if(code==39) {switchToPane(paneCounter + 1)}
            if(code==37) {switchToPane(paneCounter - 1)}

        })

    switchToPane = function(i) {
        paneCounter=i;
        panel = panels.filter(function(d) {
            return (d.index==i)
        })[0]

        d3.keys(panel['plotOptions']).map(function(option) {
            console.log(option)
            if(option=="projection") {console.log(panel["plotOptions"][option])}
            if(option=="color") {console.log(panel["plotOptions"][option])}
            stateholder[option]  = panel["plotOptions"][option]
        })

        setTimeout(updateFunction,700)

        next = storyboardDiv.selectAll("div").data(["last","narrative","next"])

        newElements = next
            .enter()
            .append("div")
            .attr('class',function(d) {return d=="narrative" ? "story" : 'directionButton'})
            .attr("id",function(d) {return d})
            .style("width",function(d) {return d=="narrative"?"82%":"8%"})
            .style("display","inline-block")
        //.style("float",function(d) {return d=="last" ? "left" : "right"})
            .style("font-size",function(d) {return d=="narrative"? "64pt" : "122pt"})
            .style("line-height",function(d) {})
            .style("vertical-align","middle")
            .text(function(d) {if (d=="narrative"){return}; return d=="last" ? "←":"→"})


        board = storyboardDiv.selectAll(".story");

        board
            .transition()
            .duration(800)
            .style("opacity",0)
            .transition()
            .duration(1000)
            .text(panel["Narrative"])
            .style("opacity",1)

        if (panels[i+1]===undefined) {

            next
                .on("click",function() {location.href = '/maury';})

            d3.select("#next").text("↩").style("font-size",24).style("font-color","red")
        } else {
            d3.select("#next").attr("text","→").on("click",function() {
                switchToPane(i+1);
            })
                .selectAll("text")
                .transition()
                .delay(2000)
                .duration(2000)
                .style("opacity",function() {if (i<panels.length) {return 1}})
        }

        d3.select("#back").on("click",function() {
            switchToPane(i-1);
        })
            .transition()
            .delay(2000)
            .duration(2000)
            .selectAll("text")
            .style("opacity",function(){if(i>0){return 1}})

    }
    switchToPane(0);
}

if (window.location.hash=="") {
setTimeout(function() {tellAStory("Yale",bookworm.query,undefined,undefined,function() {bookworm.updatePlot(bookworm.plotType)})},1400)
}
var stories = {}
stories["Yale"] =
    [
        {
            "plotOptions":{
		"plotType":"barchart",
		"database":"SOTU",
		"search_limits":{"word":["the"]},
		"aesthetic":{
		    "x": "WordsPerMillion",
		    "y": "year_year"
		},
            },
            "Narrative":
            "authors in the federalist papers"
        },
        {
            "plotOptions":{
		"plotType":"linechart",
		"database":"SOTU",
		"search_limits":{"word":["the"]},
		"aesthetic":{
		    "y": "WordsPerMillion",
		    "x": "year_year"
		},
            },
            "Narrative":
            "authors in the federalist papers"
        },

    ]
