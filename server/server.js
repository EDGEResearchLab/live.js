#!/usr/bin/env node

/* jshint node: true */

// 3rd Party/Node Core
var async = require('async'),
    bodyParser = require('body-parser'),
    spawn = require('child_process').spawn, // TODO: Prediction
    express = require('express'),
    favicon = require('serve-favicon'),
    helmet = require('helmet'),
    http = require('http'),
    path = require('path'),
    socketio = require('socket.io'),
    util = require('util');

// Internal
var api = require('./api'),
    log = require('./lib/logger'),
    models = require('./lib/models'),
    vor = require('./lib/vor');

var app = express(),
    config = require('./config'),
    server = http.Server(app),
    io = socketio(server),
    // Server config
    port = process.env.NODE_PORT || 3000,
    ip = process.env.NODE_IP || '127.0.0.1',
    isProd = process.env.NODE_ENV === 'production',
    // IO Namespaces for real time updates
    trackingIo = io.of('/tracking'),
    vorIo = io.of('/vor'),
    predictIo = io.of('/predict');

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, '../client')));
app.use(favicon(path.join(__dirname, '../client/images/favicon.ico')));

/**
 * Ensure that we can connect to the DB first thing,
 * otherwise there is no point to any of this.
 */
models.connect(config.DB)
    .then(function() {
        log.info('Database connection successful.');
    })
    .catch(function(err) {
        log.error('Unable to connect to the database:', err);
        process.exit(1);
    });

/**
 * Single page webapp.
 */
app.get('/', function(req, res) {
    res.sendFile('index.html');
});

app.use('/api', api);

/**
 * 404 Handler, any routes not found by now.
 */
app.use('*', function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/**
 * Error handler for requests.
 *
 * In dev environments the stack trace is returned,
 * otherwise the user just gets the basic message and status.
 */
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
        message: err.message,
        error: isProd ? {} : err
    });
});

/**
 * On client connect to the Tracking namespace, all points for all active flights (TODO)
 * are found and published to the client.
 */
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

/**
 * On client connection to the VOR namespace, we only need to find the latest point
 * for each flight (TODO), locate the nearest two vors, and alert the client of them.
 */
vorIo.on('connect', function(socket) {
    // TODO: Update to use the latest "Launch" and find
    // all flights for the launch (in case of a cluster)
    models.Flight.latest()
        .then(function(flight) {
            models.TrackingPoint.find({time: {$gte: flight.begin}})
                .sort({time: -1})
                .limit(1)
                .exec(function(err, points) {
                    log.debug(util.format('VOR::Latest flight "%s"', flight.name));

                    if (err) {
                        log.error(util.format('VOR::Error retrieving point for flight %s', flight.name), err);
                        return;
                    }

                    if (points.length > 0) {
                        log.debug(util.format('VOR::Latest point found for fight %s: %s', flight.name, points[0]));
                        vorEmissionHandler(socket, points[0]);
                    } else {
                        log.info(util.format('VOR::No points found for flight %s', flight.name));
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

/**
 * Handle finding the closes VORs for the given point and broadcast/emit the result
 * on the given namespace.
 *
 * @param emitter: Socket/Namespace to emit the result on
 * @param point: Point to calculate the closest VORs for
 */
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
                 log.warn('Incomplete VOR set, not able to publish the desired length (2), publishing what was found.');
             }

             log.debug(util.format('Nearest two VORs to %s,%s: %s', point.latitude, point.longitude, JSON.stringify(nearestTwo)));

             emitter.emit('trackingPoint', {
                 point: point,
                 vors: nearestTwo
             });
         })
         .catch(function(err) {
             log.error('Error locating the closest vors:', err);
         });
}

/**
 * The core functionality of the live site is here, anyone else interested
 * in new points can either be added to the async.parallel call internally
 * or subscribe to the event on their own.
 */
app.on('EDGE::VALID_TRACKING_POINT', function(newPoint) {
    log.debug('Received TrackingPoint:', newPoint);
    async.parallel([
        // The main functionality is simply real-time tracking, points simply
        // need to be broadcast as they have been received.
        function liveHandler() {
            trackingIo.emit('trackingPoint', newPoint);
        },
        // VORs provide value to the FAA when guiding aviation. They only
        // care about the latest point and its relation to the nearest VORs.
        function vorHandler() {
            vorEmissionHandler(vorIo, newPoint);
        },
        // We are working on a predictive landing functionality to dynamically
        // update flight predictions based on balloon metrics and national weather date.
        function predictHandler() {
            // TODO: Call the prediction, on exit - get the result from stdout
            // and publish via socket.
            var child = spawn('python', ['/Users/matt/Developer/edge/prediction/FlightPrediction.py', '--mongo', newPoint.edgeId]);
            var predictedLanding;
            child.stdout.on('data', function(data) {
                try {
                    predictedLanding = JSON.parse(data);
                    predictedLanding.edgeId = newPoint.edgeId;
                    predictedLanding.point = newPoint;
                    log.info('New Predicted Landing point:', predictedLanding);
                    predictIo.emit('predictedLandingPoint', predictedLanding);
                } catch (e) {
                    log.error('Error receiving prediction:', e);
                }
            });
            child.stderr.on('data', function(data) {
                log.error('Error received from prediction.py:', data.toString());
            });
            child.on('close', function(code) {
                log.info('Prediction run, exited with status:', code);
            });
        }
    ]);
});

server.listen(port, ip, function() {
    log.info(util.format('EDGE.js listening on %s:%s.', ip, port));
});

