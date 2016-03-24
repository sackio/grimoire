'use strict';

var Belt = require('jsbelt')
  , Optionall = require('optionall')
  , Path = require('path')
  , O = new Optionall({'__dirname': Path.resolve(module.filename + '/../..')})
  , Async = require('async')
  , _ = require('underscore')
  , Winston = require('winston')
  , CP = require('child_process')
  , Request = require('request')
;

var gb = {
  'port': 12345
}
  , log = new Winston.Logger()
;

log.add(Winston.transports.Console, {'level': 'debug', 'colorize': true, 'timestamp': false});

exports['server'] = {
  'startServer': function(test){
    var test_name = 'startServer';
    log.debug(test_name);
    log.profile(test_name);

    gb['server'] = CP.spawn('phantomjs', [
      'wrapper.js'
    , '--verbose=true'
    , '--startServer'
    , '--port=' + gb.port
    ], {
      'cwd': Path.join(O.__dirname, '/resources')
    });

    gb.server.stdout.once('data', function(d){
      test.ok(d.toString().match(new RegExp('Server running on ' + gb.port)), 'server started');
      log.profile(test_name);
      return test.done();
    });

gb.server.stdout.on('data', function(d){
  console.log(d.toString());
});
gb.server.stderr.on('data', function(d){
  console.log(d.toString());
});
  }
, 'createPage': function(test){
    var test_name = 'createPage';
    log.debug(test_name);
    log.profile(test_name);

    return Request({
      'url': 'http://localhost:' + gb.port + '/method'
    , 'qs': {
        'method': 'createPage'
      }
    , 'json': true
    }, function(err, res, body){
      test.ok(!err);
      test.ok(body.data.page_uuid, 'page_uuid created');
      test.ok(body.data.viewportSize.height === 16000, 'viewport set');

      gb['page'] = body.data.page_uuid;

      log.profile(test_name);
      return test.done();
    });
  }
, 'loadURL - wait for load': function(test){
    var test_name = 'loadURL - wait for load';
    log.debug(test_name);
    log.profile(test_name);

    return Request({
      'url': 'http://localhost:' + gb.port + '/method'
    , 'qs': {
        'method': 'loadURL'
      , 'page': gb.page
      , 'url': 'https://wikipedia.org'
      }
    , 'json': true
    }, function(err, res, body){
      test.ok(!err);
      test.ok(body.data.page_uuid === gb.page);
      test.ok(body.data.frameTitle === 'Wikipedia');
      test.ok(body.data.content.match(/\-webkit\-box\-sizing/));

      log.profile(test_name);
      return test.done();
    });
  }
, 'getSelector - css': function(test){
    var test_name = 'getSelector - css';
    log.debug(test_name);
    log.profile(test_name);

    return Request({
      'url': 'http://localhost:' + gb.port + '/method'
    , 'qs': {
        'method': 'getSelector'
      , 'page': gb.page
      , 'selector': '#searchInput'
      }
    , 'json': true
    }, function(err, res, body){
      test.ok(!err);
      test.ok(body.data.page_uuid === gb.page);
      test.ok(body.data.attr.outerHTML.match(/<input id="searchInput"/));
      test.ok(body.data.rect.width && body.data.rect.left);

      log.profile(test_name);
      return test.done();
    });
  }
, 'getSelector - content': function(test){
    var test_name = 'getSelector - content';
    log.debug(test_name);
    log.profile(test_name);

    return Request({
      'url': 'http://localhost:' + gb.port + '/method'
    , 'qs': {
        'method': 'getSelector'
      , 'page': gb.page
      , 'selector': 'a'
      , 'content': 'Polski'
      }
    , 'json': true
    }, function(err, res, body){
      test.ok(!err);
      test.ok(body.data.page_uuid === gb.page);
      test.ok(body.data.attr.outerHTML.match(/<a href="\/\/pl\.wikipedia\.org\/"/));
      test.ok(body.data.attr.innerText.match(/Polski/));
      test.ok(body.data.rect.width && body.data.rect.left);

      log.profile(test_name);
      return test.done();
    });
  }
, 'getSelector - multiple': function(test){
    var test_name = 'getSelector - multiple';
    log.debug(test_name);
    log.profile(test_name);

    return Request({
      'url': 'http://localhost:' + gb.port + '/method'
    , 'qs': {
        'method': 'getSelector'
      , 'page': gb.page
      , 'selector': 'a'
      , 'content': 'Polski'
      , 'multiple': true
      }
    , 'json': true
    }, function(err, res, body){
      test.ok(!err);

      test.ok(body.data.page_uuid === gb.page);
      delete body.data.page_uuid;
      test.ok(_.size(body.data) === 2);

      _.each(body.data, function(e){
        test.ok(e.attr.innerText.match(/Polski/));
        test.ok(e.rect.width && e.rect.left);
      });

      log.profile(test_name);
      return test.done();
    });
  }
, 'getSelector - count': function(test){
    var test_name = 'getSelector - count';
    log.debug(test_name);
    log.profile(test_name);

    return Request({
      'url': 'http://localhost:' + gb.port + '/method'
    , 'qs': {
        'method': 'getSelector'
      , 'page': gb.page
      , 'selector': 'a'
      , 'content': 'Polski'
      , 'count': 2
      }
    , 'json': true
    }, function(err, res, body){
      test.ok(!err);

      test.ok(body.data.page_uuid === gb.page);
      delete body.data.page_uuid;
      test.ok(_.size(body.data) === 2);

      _.each(body.data, function(e){
        test.ok(e.attr.innerText.match(/Polski/));
        test.ok(e.rect.width && e.rect.left);
      });

      log.profile(test_name);
      return test.done();
    });
  }
, 'getSelector - over count': function(test){
    var test_name = 'getSelector - over count';
    log.debug(test_name);
    log.profile(test_name);

    return Request({
      'url': 'http://localhost:' + gb.port + '/method'
    , 'qs': {
        'method': 'getSelector'
      , 'page': gb.page
      , 'selector': 'a'
      , 'count': 2
      }
    , 'json': true
    }, function(err, res, body){
      test.ok(!err);

      test.ok(body.data.page_uuid === gb.page);
      delete body.data.page_uuid;
      test.ok(_.size(body.data) > 2);

      log.profile(test_name);
      return test.done();
    });
  }
, 'getSelector - under count': function(test){
    var test_name = 'getSelector - under count';
    log.debug(test_name);
    log.profile(test_name);

    return Request({
      'url': 'http://localhost:' + gb.port + '/method'
    , 'qs': {
        'method': 'getSelector'
      , 'page': gb.page
      , 'selector': 'a'
      , 'content': 'Polski'
      , 'count': 3
      }
    , 'json': true
    }, function(err, res, body){
      test.ok(!err);

      test.ok(body.data.page_uuid === gb.page);
      delete body.data.page_uuid;
console.log(body.data);
      log.profile(test_name);
      return test.done();
    });
  }
};
