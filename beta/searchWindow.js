searchWindow = function(local) {

    //This takes a query string and opens up a new window with search results. Pretty bare-bones for now.
    local.method="search_results"
    url = destinationize(local)
    var newWindow = window.open('');
    var newWindowRoot = d3.select(newWindow.document.body);
    d3.json(url,function(data){
        var table = newWindowRoot.append('table');
        var rows = table.selectAll('tr')
            .data(data);
        rows.enter().append('tr');
        rows.html(function(d) { return d; });
    })
}