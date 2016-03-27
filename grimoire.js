/*
  Framework and tools for Phantomjs

  Webpage = require('webpage')
  System = require('system')
  Phantom = phantom
  CP = require('child_process')
  FS = require('fs')
  Server = require('webserver')

  requires:
  _
  Belt
  Moment
  Async
*/

var Grimoire = function(O){
  var M = this;
  O = O || {

  };

  //error handler
  Phantom.onError = function(msg, trace){
    console.log(msg);
    console.log(Belt.stringify(trace));

    if (M.server) M.server.close();

    return Phantom.exit(1);
  };

  /*
    common user agents
  */
  M['UserAgents'] = [
    'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
  , 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36'
  , 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1'
  , 'Mozilla/5.0 (Windows NT 6.3; rv:36.0) Gecko/20100101 Firefox/36.0'
  , 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A'
  , 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2'
  , 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko'
  , 'Mozilla/5.0 (compatible, MSIE 11, Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko'
  ];

  /*
    registry of pages
  */
  M['Pages'] = {};

////////////////////////////////////////////////////////////////////////////////
////HELPERS                                                                 ////
////////////////////////////////////////////////////////////////////////////////

  M['getJSONFromURL'] = function(url){
    var query;
    url = !Belt.isNull(url) ? url : location.href;
    var pos = url.indexOf("?");
    if(pos === -1){
      pos = 0;
    } else {
      pos++;
    }
    query = url.substr(pos);
  
    var result = {};
    query.split("&").forEach(function(part) {
      if(!part) return;
      var item = part.split("=");
      var key = item[0];
      var from = key.indexOf("[");
      if(from==-1) result[key] = decodeURIComponent(item[1]);
      else {
        var to = key.indexOf("]");
        var index = key.substring(from+1,to);
        key = key.substring(0,from);
        if(!result[key]) result[key] = [];
        if(!index) result[key].push(item[1]);
        else result[key][index] = item[1];
      }
    });
    return result;
  };

////////////////////////////////////////////////////////////////////////////////
////METHODS                                                                 ////
////////////////////////////////////////////////////////////////////////////////

  M['createPage'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      'page': Webpage.create()
    , 'user_agent': _.sample(self.UserAgents)
    , 'viewport': {'width': 2048, 'height': 16000}
    });
  
    if (a.o.verbose) console.log('Creating page...');

    a.o.page.settings.userAgent = a.o.user_agent;
    a.o.page.viewportSize = a.o.viewport;

    //adding to registry
    var uuid = Belt.uuid();
    a.o.page['uuid'] = uuid;
    self.Pages[uuid] = a.o.page;

    /*
      event emitters
    */
    var events = [
    , 'onAlert'
    , 'onCallback'
    , 'onClosing'
    , 'onConfirm'
    , 'onConsoleMessage'
    , 'onError'
    , 'onFilePicker'
    , 'onInitialized'
    , 'onLoadFinished'
    , 'onLoadStarted'
    , 'onNavigationRequested'
    , 'onPageCreated'
    , 'onPrompt'
    , 'onResourceError'
    , 'onResourceReceived'
    , 'onResourceRequested'
    , 'onResourceTimeout'
    , 'onUrlChanged'
    ];

    a.o.page['listeners'] = _.object(events, _.map(events, function(){ return {}; }));

    _.each(events, function(e){
      a.o.page[e] = function(){
        var args = _.values(arguments);

        return _.each(a.o.page.listeners[e], function(v, k){
          return v.apply(a.o.page, args.concat([k]));
        });
      };
    });

    /*
      if verbose, log all page events
    */
    if (a.o.verbose){
      _.each(events, function(e){
        a.o.page.listeners[e]['verbose'] = function(){
          console.log(e);
          console.log(Belt.stringify(arguments));
        };
      });
    }

    if (a.o.verbose) console.log('...done. Created page [' + a.o.page.uuid +']');
    a.cb(undefined, a.o.page);

    return a.o.page;
  };
  
  M['loadURL'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      //page
      //url
      //immediate
      'timeout': 20000
    , 'wait': 2000
    });

    var ocb = _.once(function(err, page){
      if (!Belt.isNull(a.o.timeout) && timeout) clearTimeout(timeout);
  
      if (err){
        if (a.o.verbose) console.log(err);
      } else {
        if (a.o.verbose) console.log('...done loading url ');
      }

      return a.cb(err, page);
    });

    var timeout;
    if (!Belt.isNull(a.o.timeout)){
      timeout = setTimeout(function(){
        return ocb(new Error('timeout loading url [' + a.o.url + ']'));
      }, a.o.timeout);
    }

    /*
      wait until page is finished loading
    */
    if (!a.o.immediate){
      var uuid = Belt.uuid();

      a.o.page.listeners.onLoadFinished[uuid] = _.throttle(function(status){
        delete a.o.page.listeners.onLoadFinished[uuid];
        return ocb(undefined, a.o.page);
      }, a.o.wait, {'leading': false});
    }

    if (a.o.verbose) console.log('Loading URL [' + a.o.url + ']...');
    if (a.o.url) a.o.page.open(a.o.url);

    //return immediately
    if (a.o.immediate) return ocb(undefined, a.o.page);

    return a.o.page;
  };
  
  M['getSelector'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      //selector
      //content
      //page
      //visible
      //multiple
      //count
      //filter
      //transformer
      'repeat_interval': 100
    , 'timeout': 10000
    , 'uuid': Belt.uuid()
    });

    var gb = {};
    return Async.waterfall([
      function(cb){
        var ocb = _.once(function(err, selector){
          if (gb.interval) clearInterval(gb.interval);
          if (gb.timeout) clearTimeout(gb.timeout);

          Belt.delete(a.o.page, 'listeners.onCallback.' + a.o.uuid);

          if (err){
            if (a.o.verbose) console.log(err);
          } else {
            if (a.o.verbose) console.log(Belt.stringify(selector));
          }

          return cb(err, selector);
        });

        gb['timeout'] = setTimeout(function(){
          return ocb(new Error('timeout'));
        }, a.o.timeout);

        a.o.page.listeners.onCallback[a.o.uuid] = function(err, sel, uuid){
          if (uuid !== a.o.uuid) return;

          return ocb(undefined, sel);
        };

        if (a.o.verbose) console.log('Locating selector "' + a.o.selector + '"'
                                    + (a.o.content ? (' with content "' + a.o.content + '"') : '') + '...');

        if (a.o.count) a.o.count = Belt.cast(a.o.count, 'number');
        if (a.o.filter) a.o.filter = Belt.cast(a.o.filter, 'string');
        if (a.o.transformer) a.o.transformer = Belt.cast(a.o.transformer, 'string');

        var evaluator = function(){
          if (a.o.verbose) console.log('[selector check]');

          return a.o.page.evaluateAsync(function(o){
            var els = document.documentElement.querySelectorAll(o.selector);

            if (!els || !els[0]) return;
            if (o.count && els.length < o.count) return;

            var sels = [], cur;

            if (o.content) o.content = new RegExp(o.content, o.content_options);
            if (o.filter) eval('o.filter = ' + o.filter);
            if (o.transformer) eval('o.transformer = ' + o.transformer);

            //filtering
            for (var i = 0; i < els.length; i++){
              if (o.content && !els[i].innerText.match(o.content)) continue; //content mismatch
              if (o.filter && !o.filter(els[i], els, o)) continue; //filter mismatch

              cur = els[i].getBoundingClientRect();
              if (o.visible && !cur.top && !cur.left && !cur.width && !cur.height) continue; //not visible

              cur['x'] = (cur.left || 0) + ((cur.width || 0) / 2);
              cur['y'] = (cur.top || 0) + ((cur.height || 0) / 2);

              sels.push({
                'el': els[i]
              , 'rect': cur
              , 'attr': {
                  'innerText': els[i].innerText
                , 'innerHTML': els[i].innerHTML
                , 'outerHTML': els[i].outerHTML
                }
              });

              if (!o.count && !o.multiple) break; //single element is fine
            }

            if (o.count && sels.length < o.count) return;

            if (o.transformer) sels.forEach(function(e, i){
              return sels[i] = o.transformer(e, sels, o, i);
            });

            sels.forEach(function(e, i){
              delete e.el;
            });

            if (!o.count && !o.multiple) sels = sels.shift();

            return window.callPhantom(null, sels);

          }, 0, _.omit(a.o, ['page']));
        };

        gb['interval'] = setInterval(function(){
          return evaluator();
        }, a.o.interval);

        return evaluator();
      }
    ], a.cb);
  };

  M['inspectPage'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      //page
      //rect
      //pause
      'path': '/tmp/' + Belt.uuid() + '.jpg' //tempfile
    });
    var gb = {};
    return Async.waterfall([
      function(cb){
        if (!a.o.page) return cb(new Error('page is required'));
  
        if (a.o.rect) a.o.page.clipRect = a.o.rect; //clipping rectangle
  
        if (a.o.path) a.o.page.render(a.o.path, {format: 'jpeg', quality: '100'});
  
        _.extend(gb, _.pick(a.o.page, [
          'cookies'
        , 'focusedFrameName'
        , 'offlineStoragePath'
        , 'content'
        , 'url'
        , 'windowName'
        , 'title'
        ]), {
          'frames': _.object(a.o.page.framesName, _.map(a.o.page.framesName, function(f){
            a.o.page.switchToFrame(f);
  
            return _.pick(a.o.page, [
              'cookies'
            , 'focusedFrameName'
            , 'offlineStoragePath'
            , 'content'
            , 'url'
            , 'windowName'
            , 'title'
            ]);
          }))
        });
  
        a.o.page.switchToFrame(gb.focusedFrameName);
  
        return cb();
      }
    , function(cb){
        if (!a.o.pause) return cb();

        //open eog and wait until file is closed to return
        return CP.spawn('eog', [a.o.path]).on('exit', function(){
          FS.remove(a.o.path);
          return cb();
        });
      }
    ], function(err){
      return a.cb(err, gb);
    });
  };
  
////////////////////////////////////////////////////////////////////////////////
////SERVER                                                                  ////
////////////////////////////////////////////////////////////////////////////////

  M['startServer'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      //port
    });
  
    self['server'] = Server.create();
    self['service'] = self.server.listen(a.o.port, function(req, res){
      var query = self.getJSONFromURL(req.url);

      if (a.o.verbose){
        console.log('server request: [' + req.url + ']');
        console.log(Belt.stringify(query));
      }

      if (query.page){
        query.page = Belt.get(self.Pages, query.page);
        if (!query.page){
          res.statusCode = 200;
          res.setHeader('Content-type', 'application/json');
          res.write(JSON.stringify({
            'error': 'page not found in registry'
          }));
          return res.closeGracefully();
        }
      }

      if (query.timeout) query.timeout = Belt.cast(query.timeout, 'number');
      /*
        run method
      */
      if (req.url.match(/\/method/)){
        try {
          if (!self[query.method]){
            res.statusCode = 200;
            res.setHeader('Content-type', 'application/json');
            res.write(JSON.stringify({
              'error': 'method not found'
            }));
            return res.closeGracefully();
          }

          return self[query.method](_.extend({}, O, self.Args, query, {'request': req, 'response': res}), function(err, data){
            if (res && !query.defer){
              res.statusCode = 200;
              res.setHeader('Content-type', 'application/json');
              res.write(JSON.stringify({
                'error': Belt.get(err, 'message')
              , 'data': _.extend({
                  'page_uuid': Belt.get(query, 'page.uuid') || Belt.get(data, 'uuid')
                }, data || {})
              }));
              res.closeGracefully();
            }
          });
        } catch(e){
          try {
            if (res){
              res.statusCode = 200;
              res.setHeader('Content-type', 'application/json');
              res.write(JSON.stringify({
                'error': e.message
              }));
              res.closeGracefully();
            }
          } catch(e) {}
        }
      }
    });
  
    console.log('Server running on ' + a.o.port);
  
    return a.cb();
  };

////////////////////////////////////////////////////////////////////////////////
////MAIN                                                                    ////
////////////////////////////////////////////////////////////////////////////////

  /*
    parse commandline arguments and run methods
  */
  M['main'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
    
    });

    self['Args'] = self.Args || {};

    _.each(System.args.slice(1), function(a){
      var _a = a.split('=');
      var k = _a.shift().replace(/^--/, '');
      return self.Args[k] = _a.join('=');
    });

    _.extend(a.o, self.Args);

    return Async.eachSeries(_.keys(a.o), function(m, cb){
      if (!self[m]) return cb();
      return self[m](a.o, cb);
    }, function(err){
      if (!err && self.server) return;

      if (a.o.verbose && err) console.log(err.message);
      if (a.o.verbose && arguments.length > 1) console.log(Belt.stringify(arguments));
    
      if (self.server) self.server.close();
    
      return Phantom.exit(err ? 1 : 0);
    });
  };

  return M;
};
