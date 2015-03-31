/* jshint node: true */

var express = require('express'),
    util = require('util');

var edge = require('./lib/edge'),
    models = require('./lib/models'),
    log = require('./lib/logger');

var whitelist = require('./config').whitelist;

var router = express.Router();

/**
 * To avoid the rockblock getting a backup in the delivery queue,
 * it is important that we always return a 2xx, regardless
 * of whether or not we handled the data correctly.
 *
 * A back up will result in out of order deliveries and repeated
 * tries, likely leading to increased credit use and out of pocket
 * costs.
 */
router.post('/report/satcom', function(req, res) {
    try {
        var rawContent = req.body.data;

        if (whitelist.indexOf(req.body.imei) === -1) {
            var err = new Error(util.format('IMEI %s not whitelisted.', req.body.imei));
            log.error(err);
            res.status(200).json(err);
            return;
        }

        var telemetry = edge.decodeSatcomPayload(rawContent);
        telemetry.edgeId = req.body.imei;
        telemetry.rawData = rawContent;
        telemetry.source = 'satcom';

        var trackingPoint = new models.TrackingPoint(telemetry);
        trackingPoint.save(function(err, point) {
            if (err) {
                log.error('Error saving new tracking point:', err);
                res.status(200).json(err);
                return;
            }

            var asObj = point.toObject();
            log.info('Valid tracking point received and saved:', asObj);
            req.app.emit('EDGE::VALID_TRACKING_POINT', asObj);
            res.status(200).json(asObj);
        });
    } catch (err) {
        log.error('Error handling raw content of satcom report:', err);
        res.status(200).json(err);
    }
});

router.post('/report/test', function(req, res) {
    req.app.emit('EDGE::VALID_TRACKING_POINT', req.body);
    res.status(200).json(req.body);
});

module.exports = router;
