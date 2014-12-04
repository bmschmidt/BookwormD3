d3-svg-legend
=============

A simple legend created from d3 scales. You can see [an example here](http://bl.ocks.org/emeeks/8855733967174fe4b1b4). Legends have the following options:

legend.**inputScale**(d3.scale)
Associates the legend with a d3 scale. Currently only tested with threshold and ordinal scales.

legend.**cellWidth**(*number*)
The width in pixels of each legend cell.

legend.**cellHeight**(*number*)
The height in pixels of each legend cell.

legend.**cellPadding**(*number*)
The padding in pixels of each legend cell.

legend.**units**(*string*)
The name of the units represented by the legend.

legend.**orientation**(*["horizontal","vertical"]*)
Determines whether the legend is presented horizontally or vertically. See example for the difference. Defaults to horizontal.

legend.**labelFormat**(*d3.format*)
Sets the formatter for the units. Set to "none" if you want no formatter applied, otherwise pass a d3.format with the settings you want.



