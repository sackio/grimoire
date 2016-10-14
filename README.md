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
Note that this script uses NPM to manage dependencies. Bower or no dependency manager would be fine as well.


### API Reference ###

**createPage** 
