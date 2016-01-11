#!/usr/bin/phantomjs

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

Phantom.injectJs('../grimoire.js');
M = Grimoire.call(M);

M.main();
