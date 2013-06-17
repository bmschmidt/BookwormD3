D3 Bookworm
===========

This is my attempt to build a fully d3-based Bookworm browser. Rather than re-implement the line charts that Martin Camacho made for the primary Bookworm repo, I've tried to get a constantly updated model working with alternate visualizations of the data: here, for instance, a map and a grid plot.

The code is designed to be completely grounded in the Bookworm API written elsewhere--that means that the full state of the web 
page can be passed as the query variable, making linking and exporting easier.

It's also designed to be as easily interactive as possible: a single call to a d3 selection, for instance, 
will make any *new* visualization easily searchable using the constraints for that element.

But it's also my learning-javascript and learning-d3 project, so the code may be confused or unadaptable,
and there may be a fair amount of wheel-reinvention.
