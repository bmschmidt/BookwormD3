var query = {};

var defaultQuery = {
    "method":"return_json",
    "words_collation":"Case_Sensitive",
    "database":"ChronAm",
    "search_limits":{
        "date_year":{"$lte":1922,"$gte":1850},
        "word":["Apache"]
    },
    "aesthetic":{'x':'lng','y':'lat',"size":"WordCount","color":"WordsPerMillion"},
    "plotType":"map"
};

if (window.location.host=="melville.seas.harvard.edu" | window.location.host=="benschmidt.org") {
    defaultQuery = {
        "method":"return_json",
        "words_collation":"Case_Sensitive",
        "groups":["year","classification"],
        "database":"presidio",
        "counttype":["WordCount","TotalWords","WordsPerMillion"],
        "search_limits":{
            "year":{"$lte":1922,"$gte":1850},
            "word":["chart"]
        },
        "plotType":"heatMap"
    }

    defaultQuery = {
		"method": "return_tsv",
		"words_collation": "Case_Sensitive",
		"groups": ["year"],
		"database": "presidio",
		"counttype": ["TextPercent"],
		"search_limits": {
		"word":["natural selection"],"year":{"$gte":1830}
		}
		}
}

var nameSubstitutions = {
    "WordsPerMillion":"Uses per Million Words",
    "WordCount":"# of matches",
    "TextPercent":"% of texts",
    "TotalWords":"Total # of words",
    "TextCount":"# of Texts",
    "TotalTexts":"Total # of Texts"
}

var quantitativeVariables = [
    {"variable":"WordsPerMillion","label":"Uses per Million Words"},
    {"variable": "WordCount","label":"# of matches"},
    {"variable":"TextPercent","label":"% of texts"},
    {"variable":"TotalWords","label":"Total # of words"},
    {"variable":"TextCount","label":"# of Texts"},
    {"variable":"TotalTexts","label":"Total # of Texts"},
    {"variable":"WordsRatio","label":"Ratio of group A to B"},
    {"variable":"SumWords","label":"Total in both sets"},
    {"variable":"Dunning","label":"Dunning Log Likelihood"},
    {"variable":"DunningTexts","label":"Dunning Log Likelihood (Text count)"}
]

for (item in quantitativeVariables) {
    nameSubstitutions[item.variable] = item.label
}

if(window.location.hash) {
    var hash = window.location.hash.substring(1);
    decoded = decodeURIComponent(hash)
    query =  JSON.parse(decoded)
} else {
    query = defaultQuery
}



var APIbox = d3.select('#APIbox')
    .property('value', JSON.stringify(query))
    .attr('style', 'width: 95%;')
    .on('keyup',function(){})

d3.select("#ExportData")
//Make advanced Options into a toggler.
    .on("click",function() {
        function post_to_url(path, params, method) {
            //Function From http://stackoverflow.com/questions/133925/javascript-post-request-like-a-form-submit
            method = method || "post"; // Set method to post by default, if not specified.

            // The rest of this code assumes you are not using a library.
            // It can be made less wordy if you use one.
            var form = document.createElement("form");
            form.setAttribute("method", method);
            form.setAttribute("action", path);

            for(var key in params) {
                if(params.hasOwnProperty(key)) {
                    var hiddenField = document.createElement("input");
                    hiddenField.setAttribute("type", "hidden");
                    hiddenField.setAttribute("name", key);
                    hiddenField.setAttribute("value", params[key]);

                    form.appendChild(hiddenField);
                }
            }
            console.log(params)
            document.body.appendChild(form);
            form.submit();
        }

        localquery = JSON.parse(JSON.stringify(query))
        localquery['method'] = "return_tsv"
        post_to_url("/cgi-bin/dbbindings.py",   {"queryTerms":JSON.stringify(localquery)})
    })


plotTransformers = {};
dataTypes = {};

var legendData = [];


d3.select("body").on("keypress",function(e){
    if(d3.event.keyCode == 13){
        plotting = myPlot();
        plotting()
    }
});

d3.selectAll("[bindTo]")
    .on('change',function() {
        console.log("change registered")
        queryAligner.updateQuery(d3.select(this))
    })
    .on('keyup',function() {
        console.log("keyup registered")
        queryAligner.updateQuery(d3.select(this))
    })

//This is the only new piece of code:


d3.select("#APIBox").on("change", function() {d3.select("#results").transition().duration(1000).style("opacity",.1)})
d3.select("#runButton").on("click",function() {myPlot()()})
myPlot = function() {	
    if (query.aesthetic !== undefined) {delete query['aesthetic']}
    queryAligner.updateQuery()
    function my() {

	var response = '';
	$.ajax({ type: "GET",   
		 url: destinationize(query),   
		 async: false,
		 success : function(text)
		 {
             response = text;
		 }
	       });
	if (query.method=="return_json") {
	    response = js_beautify(response)
	}
	d3.select("#results").text(response);
	d3.select("#results").transition().duration(100).style("opacity",1)
    }
    return my
}	

setTimeout(queryAligner.updateQuery,500)
myPlot()
