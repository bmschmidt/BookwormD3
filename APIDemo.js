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
        "aesthetic":{"x":"yearchunk","y":"classification","color":"WordsPerMillion"},
        "plotType":"heatMap"
    }
}

if (window.location.host=="localhost:8080") {
    console.log("yo, localhost!")
    defaultQuery = {
        "method":"return_json",
        "words_collation":"Case_Sensitive",
        "groups":["publication_date_year","publication_date_month_year"],
        "database":"halftimes",
        "counttype":["WordCount","TotalWords","WordsPerMillion"],
        "search_limits":{
            "word":["war"]
        },
        "plotType":"heatMap"
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
    {"variable":"SumWords","label":"Total in both sets"}
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

queryAligner.updateQuery()

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


d3.select("body").on("keypress",function(e){
    if(d3.event.keyCode == 13){
        plotting = myPlot();
        plotting()
    }
});


//This is the only new piece of code:
var paperdata
myPlot = function() {
    query.aesthetic = undefined
    function my() {
	d3.select("#results").transition().duration(1000).style("opacity",.1)
	d3.json(destinationize(query),function(json) {
	    
            paperdata = parseBookwormData(json,query);
	    d3.select("#results").transition().duration(1000).style("opacity",.1)
	    d3.select("#results").transition().duration(100).style("opacity",1)
	})
    }
    return my
}	

queryAligner.updateQuery()
