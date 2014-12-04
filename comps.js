var timeworm = {};

var json = {"database":"bigdata","plotType":"worddiv","method":"return_json","search_limits":{
    "author__id":[0]
    //,   "primary_country":["USA"]
},
            "compare_limits":{"author__id":{"$ne":0}
                              //,                              "primary_country":{"$ne":"USA"}
                             },
            "aesthetic":{"size":"Dunning","label":"unigram"},"counttype":["WordCount","TotalWords"],"groups":["unigram"]}

var dbookworm = Bookworm(json)

dbookworm(d3.select("#comparisons"))

var a = Bookworm(JSON.parse(JSON.stringify(dbookworm.query)))

a.query.search_limits['author__id']=undefined
a.query.compare_limits['author__id']=undefined
a.query['counttype'] = "SumWords"
a.query.aesthetic={"size":"SumWords","key":"author__id","label":"author"}
a.alignAesthetic()

a.updateData(callback = function() {

    var Author__Ids = a.data.sort(function(a,b) {return a.SumWords-b.SumWords})

    var author__idSelector = d3.select("#selectors").append("div").attr("class","dropdown col-md-12 starter-template")

    var button = author__idSelector.append("button").attr("class","btn btn-default dropdown-toggle").attr("type","button").attr("id","dd1").attr("data-toggle","dropdown").text("Look at a Different Author")

    button.append("span").attr("class","caret")

    var menu = author__idSelector.append("ul").attr("class","dropdown-menu col-md-12 starter-template").attr("role","menu").attr("aria-labelledby","dd1")

    var selectors = menu.selectAll("li.presentation").data(Author__Ids)

    selectors.enter().append("li").attr("role","presentation").append("span").attr("tabindex","-1").attr("role","menuitem").text(function(d) {return d.author})

    selectors.on("click",function(d) {
        dbookworm.query.search_limits.author__id[0] = d.author__id
        dbookworm.query.compare_limits.author__id["$ne"] = d.author__id
        button.text(d.author)
	console.log("removing")
	d3.select("#comparisons").selectAll(".textgroup").remove()
	dbookworm(d3.select("#comparisons"))
	dbookworm.updateplot()
    })


})

function setCallback() {
    console.log('clearing')
    d3.selectAll(".textgroup").on("hover",function() {}).on("focus","")
    d3.select("#comparisons").selectAll(".textgroup").on("mouseover",function(){}).selectAll("span")
	.on("click",function(d) {
	    console.log(d);
	    newurl= "http://benschmidt.org/beta/#%7B%22database%22%3A%22bigdata%22%2C%22plotType%22%3A%22barchart%22%2C%22method%22%3A%22return_json%22%2C%22search_limits%22%3A%7B%22word%22%3A%5B%22" + d.unigram + "%22%5D%7D%2C%22aesthetic%22%3A%7B%22y%22%3A%22author%22%2C%22x%22%3A%22WordsPerMillion%22%7D%2C%22counttype%22%3A%5B%22WordsPerMillion%22%5D%2C%22groups%22%3A%5B%22author%22%5D%7D"
	    console.log(newurl)
	    window.open(newurl,"_blank")
	})
}

setInterval(setCallback,300)
