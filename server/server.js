#!/usr/bin/env node

/* jshint node: true */

var async = require('async'),
    bodyParser = require('body-parser'),
    //exec = require('child_process').exec, // TODO: Prediction
    express = require('express'),
    favicon = require('serve-favicon'),
    helmet = require('helmet'),
    http = require('http'),
    path = require('path'),
    socketio = require('socket.io'),
    util = require('util');

var api = require('./api'),
    log = require('./lib/logger'),
    models = require('./lib/models'),
    vor = require('./lib/vor');

var app = express(),
    config = require('./config'),
    server = http.Server(app),
    io = socketio(server),
    port = process.env.NODE_PORT || 3000,
    ip = process.env.NODE_IP || '127.0.0.1',
    isProd = process.env.NODE_ENV === 'production';

// Ensure that we can connect to the DB first thing,
// otherwise there is no point to any of this.
models.connect(config.DB)
    .then(function() {
        log.info('Database connection successful.');
    })
    .catch(function(err) {
        log.error('Unable to connect to the database:', err);
        process.exit(1);
    });

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, '../client')));
app.use(favicon(path.join(__dirname, '../client/images/favicon.ico')));

app.get('/', function(req, res) {
    res.sendFile('index.html');
});

app.use('/api', api);

// 404 Handler, any routes not found by now.
app.use('*', function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Error handler for requests.
// In dev environments the stack trace is returned,
// otherwise the user just gets the basic message and status.
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
        message: err.message,
        error: isProd ? {} : err
    });
});

// Namespaces for the web sockets
var trackingIo = io.of('/tracking'),
    vorIo = io.of('/vor'),
    predictIo = io.of('/predict');

trackingIo.on('connect', function(socket) {
    // TODO: Update to use the latest "Launch" and find
    // all flights for the launch (in case of a cluster)
    models.Flight.latest()
        .then(function(flight) {
            models.TrackingPoint.find({time: {$gte: flight.begin}})
                .sort({time: 1})
                .exec(function(err, docs) {
                    if (err) {
                        log.error('Tracking::Error retrieving points for latest flight', err);
                        return;
                    }

                    socket.emit('initialPoints', docs);
                });
        })
        .catch(function(err) {
            log.error('Tracking::Error locating latest flight for ' + socket.id + ':', err);
        });
});

vorIo.on('connect', function(socket) {
    // TODO: Update to use the latest "Launch" and find
    // all flights for the launch (in case of a cluster)
    models.Flight.latest()
        .then(function(flight) {
            models.TrackingPoint.find({time: {$gte: flight.begin}})
                .sort({time: -1})
                .limit(1)
                .exec(function(err, points) {
                    if (err) {
                        log.error('VOR::Error retrieving point for latest flight:', err);
                        return;
                    }

                    if (points.length > 0) {
                        vorEmissionHandler(socket, points[0]);
                    } else {
                        log.info('VOR::No points for this flight to give to', socket.id);
                    }
                });
        })
        .catch(function(err) {
            log.error('VOR::Error retrieving point for latest flight:', err);
            return;
        });
});

// TODO
//predictIo.on('connect', function(socket) {});

function vorEmissionHandler(emitter, point) {
     vor.findClosestVors(point.latitude, point.longitude)
         .then(function(rankedVors) {
             if (rankedVors.length === 0) {
                 log.error('No vors found, database issue?');
                 return;
             }

             // We only care about the nearest two for the FAA
             var nearestTwo = rankedVors.slice(0, 2);
             if (nearestTwo.length != 2) {
                 log.warn('Incomplete VOR set, not able to publish the desired length (2)');
             }

             log.debug(util.format('Nearest two VORs to "%s": %s', JSON.stringify(newPoint), JSON.stringify(nearestTwo)));

             emitter.emit('trackingPoint', {
                 point: newPoint,
                 vors: nearestTwo
             });
         })
         .catch(function(err) {
             log.error('Error locating the closest vors:', err);
         });
}

// EDGE Processing for new points
app.on('EDGE::VALID_TRACKING_POINT', function(newPoint) {
    log.debug('Received TrackingPoint:', newPoint);
    async.parallel([
        function liveHandler() {
            trackingIo.emit('trackingPoint', newPoint);
        },
        function vorHandler() {
            vorEmissionHandler(vorIo, newPoint);
        },
        //function predictHandler() {
            // TODO: Call the prediction, on exit - get the result from stdout
            // and publish via socket.
        //}
    ]);
});

server.listen(port, ip, function() {
    log.info(util.format('EDGE.js listening on %s:%s.', ip, port));
});

