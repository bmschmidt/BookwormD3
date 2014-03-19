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

These are **selector** elements. They can interact quite deeply with the underlying bookworm data (to show which options you might want to choose); but 

3. Style and Substance
----------------------

I have tried, and largely failed, to completely disentangle the display elements from the styling elements. A bar chart should have most of its colors, etc, defined by a **stylesheet**, not by the D3 code. At some point, we'll make that happen for real. But it's one of the goals I try to keep in mind.

The code is designed to be completely grounded in the Bookworm API written elsewhere--that means that the full state of the web page can be passed as the query variable, making linking and exporting easier.


It's also designed to be as easily interactive as possible: it builds in methods to make click-to-search possible for any element created by the browser engine. I've put in prototype line and bar charts to show how that might work in other visual geometries.



It also includes a non-visual query browser (APISandbox.html) that helps to explain how the API works. 

