D3 Bookworm
===========

This is my attempt to build a D3-based framework for visualizing data from Bookworm backends. It disentangles the user interfaces from the representation of the graphics: this makes it much more powerful than the standard line chart browser in terms of what it can represent, but gives no easy GUI hooks for ordinary users to fully manipulate that power. The philosophy is that those manipulations will be done as part of specific installations using the functions here: for instance, [my embedded state-of-the-union reader](http://benschmidt.org/poli/2015-SOTU) or [chart of gender and teaching evaluations](http://benschmidt.org/profGender). Each of those charts only uses one of the several functionalities made possible by the base library, and adds significant styling of their own.

The repo comes pre-equipped with several different types of visualizations on Bookworm browsers.

1. Bar charts
2. Point charts
3. Maps (static or animated)
4. Heat maps
5. Treemaps.
6. Line charts (only partially implemented for now, since they are done well in the other Bookworm)
7. Scatterplots (including a prototype of a multidimensional scatterplot).
8. Sparklines (for embedding small inline line charts without axes).

The basic functionality also means that it can be extended by any new plot types built in D3.

The idea is to provide general framework for bucket-of-words visualizations that will make it easy to write completely novel forms using D3 as the basic manipulation framework.


Usage
-----

Usage is not completely documented, and is mostly by example. There are two essential ideas here.

### 1. The `query` object.


The Bookworm API is based around a JSON-formatted query syntax. As JSON, they provide an easy interchange format; but in the browser, a `query` object keeps everything in line by acting as the overall supervisor for aligning all the interface elements in a browser. User interface elements are bound to a query object, as are the data visualizations; any changes to the interface should update the data visualizations as well.

Having a permanent query object makes all elements of a chart easily exportable and savable. (For instance, through window hash). Users are encouraged to extend the basic Bookworm API query structure with any new elements needed in particular for visualizations.


### 2. The `Bookworm` class

The `Bookworm` function is a factory to generate a `bookworm` object. That object is a function that, when called on an svg selection, updates its state to reflect the status of the Bookworm query.

``` javascript
var query = {"search_limits":{"city":["Washington"]},...}

newWorm = Bookworm(query)

newWorm(d3.select("#svg"))

```

The Bookworm object adopts the D3 philosophy of "stamping" the svg with its state and moving on. In theory, you could use a single `bookworm` object on dozens of svgs in the same window. Since there are interactive elements to many of the generated svgs, it's not recommended.

2. Included elements
--------------------

Elements are included so that users can
1. build their own web pages with functions from here
2. embed bookworm charts in an existing webpage
3. Quickly generate basic charts from a predefined query.

### Javascript

The heart of the system is at `js/bookworm.js`. This code has a number of dependencies: most importantly D3, but also colorbrewer.js for most plots, and certain other functions for other

### CSS

Charts will usually be ugly (on axes, for instance) if you don't include elements of the bookworm stylesheet at `css/bookworm.css`. These can be altered as needed for different 

### Included pages

A few example pages are included: some more elaborate ones (using bootstrap and jquery, which this repo emphatically does **not** depend on) will be shared as separate repositories.

#### plot.html

The most basic possible page is at `plot.html`: it simply creates a full-screen svg that instantiates a plot from a json query passed through windows location hash. There is interactivity but not controls to change search options; this is conceived of as useful primarily for sending as a link or embedding as an iframe.

#### index.html

The basic page at the root directory includes not just a full-page svg, but also a window in which the query state can be edited, and dropdown menus for the aesthetics and search limits where the charts specify what they are.

#### API Sandbox

The distro also includes a non-visual query browser (APISandbox.html) that helps to explain how the API works at APIsandbox/. This one relies on bootstrap. It's ugly (and at the moment, doesn't work).

3. Style and Substance
----------------------

I have tried, and in places failed, to completely disentangle the display elements from the styling elements. A bar chart should have most of its colors, etc, defined by a **stylesheet**, not by the D3 code. At some point, we'll make that happen for real.

The code is designed to be completely grounded in the Bookworm API written elsewhere--that means that the full state of the web page can be passed as the query variable, making linking and exporting easier.


It's also designed to be as easily interactive as possible: it builds in methods to make click-to-search possible for any element created by the browser engine. I've put in prototype line and bar charts to show how that might work in other visual geometries.


