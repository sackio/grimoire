# grimoire

Grimoire is a library that extends [Phantom.js](http://phantomjs.org) for development of bots to automate website usage. Major additions to Phantom include:

* **Rock-Solid DOM Interaction** - A lot of automating website usage is waiting for the DOM to reflect a state, sending mouse/keyboard events to DOM elements. Grimoire adds a robust `getSelector` method that is used to retrieve structured data from the DOM, test for DOM states (or the negation of states), and reliably identify element viewport locations for mouse / keyboard actions.

* **Event Emitter** - Grimoire adds Node.js-style event emitter functionality. Phantom allows for the assignment of single handlers to events on a webpage (i.e. `onPageResourceRequested`, `onLoadError`). Grimore extends this by allowing the assignment of multiple handlers to these events.

* **Web Server API** - Phantom ships with a barebones web server module. Grimoire extends this into an RPC API, allowing easy interprocess driven browser sessions, turning Phantom scripts into server daemons, with the ability to webdrive multiple automation sessions in the same process.

* **Visual Debugging** - Grimoire adds ability to inspect an active browser session at any time, both with a full data dump of state and a visual rendering of the viewport.

* **DOM Action Helpers** - utility methods for clicking on elements, and setting values on a page.

### Setup ###

Grimoire is an external JS file that needs to be loaded into a Phantomjs context with the `injectJS` method. It depends on loading several native Phantom modules and third-party JS libraries. Here is an example setup. For now, it's probably easiest just to include this at the top of your Phantom scripts using Grimoire, and suggestions for better design are welcome:

```javascript
var Webpage = require('webpage')
  , System = require('system')
  , Phantom = phantom
  , CP = require('child_process')
  , FS = require('fs')
  , Server = require('webserver')
;

Phantom.injectJs('../node_modules/underscore/underscore-min.js');
Phantom.injectJs('../node_modules/async/dist/async.min.js');
Phantom.injectJs('../node_modules/jsbelt/lib/belt.js');
Phantom.injectJs('../node_modules/moment/min/moment.min.js');

var M = {}
  , Async = async
  , Moment = moment;

Phantom.injectJs('../node_modules/grimoire/grimoire.js');
M = Grimoire.call(M);
```
Note that this script uses NPM to manage dependencies. Bower or no dependency manager would be fine as well. After this setup code, add any script-specific code. 

`M` basically represents a singleton instance of the module. It has inherited all the extensions Grimoire provides.

### API Reference ###

**createPage**(options) - create a new Phantom page (essentially a new session). The page will include a `uuid` property which can be passed to the web server to retrieve this specific page/session at any point.
  Options:
  * user_agent - pass a specific user agent. Otherwise, the page picks a user agent from a list accessible at `UserAgents`
  * viewport: Optionally pass a viewport size object. i.e. `{'width': 2048, 'height': 16000}`.
  * ttl: Set a time to live in ms for the page. If set, page will close automatically after this amount of time has passed.

Returns new page that was created
 
**loadURL**(options, callback(error, page)) - load a URL for a page, optionally waiting until all resources have loaded before invoking a callback
  Options:
  * page - pass in the Phantom page to use
  * url - URL to load
  * immediate - if true, invoke callback as soon as URL begins to load, rather than waiting for all resources to load
  * timeout - time in ms to wait before passing an error to the callback, indicating the page never loaded
  
**getSelector**(options, callback(error, result)) - find element or elements in the DOM, meeting different criteria and pass them to callback, or timeout if no such elements are found and pass error to callback.
  Options:
  * selector - CSS selector to look for
  * content - look for elements including `innerText` that matches `content`, where content is a string, or stringified regex
  * page - Phantom page to test
  * visible - if true, only look for elements visible in the viewport (Note: some DOM elements do not have coordinates using the `getBoundingClientRect` method, and will not work with this option.)
  * multiple - if true, return all elements fitting these criteria. Otherwise, return first one found in DOM.
  * count - if set, invoke callback after `count` number of elements are found to match criteria
  * filter - A function or stringified function that is used to filter elements based on whether function returns truthfully or falsy. Function is passed a DOM element as the only parameter. Note that this function is run the in the Javascript context of the browser page, no the Phantom context. It cannot include variables not otherwise available in the browser context.
  * transformer - A function or stringified function that transforms the element passed to it. The element passed is actually a composed object including the following properties:
    * el - the DOM element
    * rect - `x`, `y`, `width`, and `height` of bounding rectange
    * text - `innerText` of element
    * outerHTML - `outerHtml` of element
    
    As with `filter`, this function is executed in the browser's Javascript context
  * negate - invoke callback only after no elements pass the tests specified
  * repeat_interval - pause between polling DOM for this number of ms (default: 100)
  * timeout - timeout and pass error to callback after this amount of time in ms (default: 10000)
  
**inspectPage**(options, callback) - debugging method used to visually inspect a page and log all page information, optionally pausing script execution
  Options
  
  * page - page to inspect
  * rect - specific rectange to render on inspection (default: entire viewport)
  * image_path - path to save JPEG rendering of page to (default: temp path)
  * json_path - path to save JSON dump of page content / data (default: temp path)
  * pause - if true, pause invoking callback before image viewer is closed
  * return_image - if true, return `image_path` at from function

**elementClick**(options, callback) - click on an element on the page. This method should be passed an `element` object from the `getSelector` method.
  Options
  
  * element - objects passed to the callback of a `getSelector` method, must have a `rect` property that conveys the bounding rectangle
    * x - x centroid-coordinate within the viewport
    * y - y centroid-coordinate within the viewport
    * width - width of bounding rectangle
    * height - height of bounding rectangle
    * top - top of bounding rectangle
  * elements - 
  * page
      'elements': []
    , 'x_offset': 0
    , 'y_offset': 0
    , 'move_delay': 0
    , 'delay': 0

**elementClickCheckbox**(options, callback) - click on a checkbox element on the page. Checkboxes are a little tricky as they do not have dimensions in the `getBoundingClientRect` method. This method should be passed an `element` object from the `getSelector` method, which is usually the immediate parent of the checkbox DOM element itself.

**elementEnterText**(options, callback) - enter text into an element

**elementSelectOption**(options, callback) - choose option in select list

**startServer**(options, callback) - start a webserver for this script, which provides an RPC API for invoking script methods via HTTP request

**main**(options) - this method is called at the end of the script file to parse commandline arguments passed to the script and call methods at load
