var queryBox = $('<div />');
$('<input />').attr("id", "word_box").val('Oregon trail').appendTo(queryBox);
// clear below
//$('<input />').attr("id", "word_box2").val('Mississippi').appendTo(queryBox);
$('<input />').attr("id", "year1_box").val('1856').appendTo(queryBox);
$('<input />').attr("id", "year2_box").val('1922').appendTo(queryBox);
$('<button />').text('Submit').click(function(){runQuery();}).appendTo(queryBox);
$('<span />').attr("id", "max_x").appendTo(queryBox);
queryBox.appendTo($('body'));


$('body').keypress(function(e){
    if(e.which == 13){
        runQuery();
    }
});

var data; // loaded asynchronously
var svg = d3.select("#chart")
    .append("svg");

var path = d3.geo.path();

var states = svg.append("g")
    .attr("id", "states");

var stateCodes;
colors = d3.scale.sqrt()
    .range(["rgb(249,248,224)", "rgb(134,86,7)"]);
//    .range(["red", "white","blue"]);

d3.json("../data/us-states.json", function(json) {
    states.selectAll("path")
        .data(json.features)
        .enter().append("path")
        .attr("d", path)
        .attr('fill',"rgb(249,248,224)");
});

function runQuery(){
    var webpath = "http://arxiv.culturomics.org/" + 
        "cgi-bin/dbbindings.py/?queryTerms=" +
        "{%22method%22:%22return_json%22," +
        "%22groups%22:[%22state%22]," +
        "%22database%22:%22ChronAm%22," +
        "%22counttype%22:%22Occurrences_per_Million_Words%22," +
        "%22search_limits%22:{%22date_year%22:{%22$lt%22:" +
        $("#year2_box").val() +
        ",%22$gt%22:" +
        $("#year1_box").val() +
        "},%22word%22:[%22" +
        $("#word_box").val() +
        "%22]}" +
//	"," +
//        "%22compare_limits%22:{%22date_year%22:{%22$lt%22:" +
//        $("#year2_box").val() +
//        ",%22$gt%22:" +
//        $("#year1_box").val() +
//        "},%22word%22:[%22" +
//        $("#word2_box").val() +
//        "%22]}" +
        "}"
    
    d3.json(webpath,function(json) {
        data = json;
        maxx = 0;
        $.each(data, function(i, v){
            if (i != "FA" && i != "DC" && i!= 'IE' && v > maxx) {maxx = v;}
        });
        colors.domain([0,maxx]);
        $("#max_x").text(' maximum value: ' + maxx);
        d3.selectAll('path')
            .transition().duration(1500)
            .attr(
                'fill',function(d)  {
                    if (data[d.id]) {
                        return colors(data[d.id])
                    } else {return 'white'}
                }
            )
    })
}

runQuery()