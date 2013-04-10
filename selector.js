//This resets the query by making a dropdown menu.

options = ['lat','lng','lc0','lc1','state','country','year','authorbirth']

selector = svg.append('g').attr('id','selector')

selector.scale = d3.scale.ordinal().domain(options).rangeBands([50,300])

axisNumber = 0
frames = selector.selectAll('rect')

frames
    .data(options)
    .enter()
    .append('rect')
    .attr('width',500)
    .attr('height',selector.scale.rangeBand())
    .attr('x',50)
    .attr('opacity',100)
    .on('click',function(d) {
	console.log(d)
	query['groups'][axisNumber] = d;
	console.log(query.groups)
	APIbox.update();
	selector.selectAll('text').remove();
	selector.selectAll('rect').remove();
	heatMap();
    })
    .transition()
    .duration(2500)
    .attr('y',function(d) {return(selector.scale(d))})
    .attr('fill',function(f) {
	if (f==query['groups'][axisNumber]) {return('blue')}
	else {return('white')}
    })

text = selector.selectAll('text')

text
    .data(options)
    .enter()
    .append('text')
    .attr('x',250)
    .transition()
    .duration(2500)
    .attr('y',function(d)       {return(selector.scale.rangeBand()/2+selector.scale(d))})
    .attr('fill','black')
    .attr('size',10)
    .text(function(f) {
	return(f)
    })
