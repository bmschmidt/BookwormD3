D3 Bookworm
===========

This is my attempt to build a fully D3-based Bookworm browser. Rather than re-implement the line charts that Martin Camacho made, and Billy Janitsch, Neva Cherniavsky, and Matt Nicklay have improved, for the primary Bookworm repo, I've tried to get a constantly updated model working with alternate visualizations of the data: here, for instance, a map and a grid plot.

But the idea is not just to represent these *particular* vocabularies: instead, it's to provide a general framework for bucket-of-words visualizations that will make it easy to write completely novel forms using D3 as the basic manipulation framework.


There are two essential ideas here.

1. The `query` object.
-------------------

The Bookworm API is based around a JSON-formatted query syntax. As JSON, they provide an easy interchange format; but in the browser, a `query` object keeps everything in line by acting as the overall supervisor for aligning all the interface elements in a browser. User interface elements are bound to a query object, as are the data visualizations; any changes to the interface should update the data visualizations as well.

2. The `Bookworm` class
-----------------------

BookwormClasses is a grab-bag of functions to avoid polluting the namespace: but the real interaction should eventually all come from the object created by the `Bookworm` factory function.



### 2a. Data visualization Bookworm objects

This is the obvious one. 

### 3a. Query visualization Bookworm objects.

The spec is not fully worked out. 

But the idea is that these are **selector** elements. Rather than visualize the *results* of the query, they visualize the *query itself*. Interactions with them modify the query. And they may, in many cases, only visualize small parts of the query. At its simplest, a text box that defines the word being searched for is a query visualization; the word in the text box corresponds to the first word in the list of search terms.

Behind the scenes, this uses a locally defined syntax where objects have "bindTo" elements that specify what elements of the query object they should be hardwired to. For example; that text box will be bound to `query.search_limits.word[0]`. (Or we could use an ngrams-style, comma-delimited syntax where it was bound to `query.search_limits.word` and the array was populated by splitting the string on commas).

One fruitful way to handle this would be to have larger query visualization objects be built up out of a number of smaller ones.

`viz.create(domElement)`

Creates the desired object by appending it to the D3 selection passed in.

`viz.initialize(query)`
Initializes with a given query object.

`viz.pull()`
Changes the appearance of the query to map to the current state of the query object. (Used after updates to the query from outside the visualizaton).

`viz.push()`
Changes the current state of the query object to map to the appearance of the query. (Used after updates to the query from inside the visualization).


3. Style and Substance
----------------------

I have tried, and in places failed, to completely disentangle the display elements from the styling elements. A bar chart should have most of its colors, etc, defined by a **stylesheet**, not by the D3 code. At some point, we'll make that happen for real.

But it's already close enough that it should be possible, say, to use the line chart module to draw a tiny little sparkline without causing too much of a headache.

The code is designed to be completely grounded in the Bookworm API written elsewhere--that means that the full state of the web page can be passed as the query variable, making linking and exporting easier.


It's also designed to be as easily interactive as possible: it builds in methods to make click-to-search possible for any element created by the browser engine. I've put in prototype line and bar charts to show how that might work in other visual geometries.



It also includes a non-visual query browser (APISandbox.html) that helps to explain how the API works. 

