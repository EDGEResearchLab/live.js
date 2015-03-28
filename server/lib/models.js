/* jshint node: true */

var mongoose = require('mongoose'),
    util = require('util'),
    q = require('q');

/**
 * A launch is a grouping of related flights, such
 * as a BeaconNET launch relating data sets together.
 */
var LaunchSchema = mongoose.Schema({
    // Seconds since epoch, GMT
    start: {
        type: Number,
        required: true
    },
    // Seconds since epoch, GMT
    end: {
        type: Number,
        required: false
    },
    description: {
        type: String,
        required: false
    }
});

/*
 * A flight is the entirety of release to landing
 * of a single flight string.
 */
var FlightSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    meta: {
        balloon: {
            manufacturer: {
                type: String,
                default: 'hwoyee'
            },
            // Grams
            weight: {
                type: Number,
                default: 1500
            }
        },
        liftGas: {
            gas: {
                type: String,
                default: 'hydrogen'
            },
            // Liters
            amount: Number
        },
        parachute: {
            // Meters
            size: {
                type: Number,
                default: 2.1336 // 7ft
            },
            shape: {
                type: String,
                default: 'rocket man'
            }
        },
        payloads: [],
    },
    // Seconds since epoch, GMT
    begin: {
        type: Number,
        required: true
    },
    // Seconds since epoch, GMT
    end: {
        type: Number,
        required: false
    }
});

FlightSchema.statics.latest = function() {
    var deferred = q.defer();

    this.find({})
        .sort({begin: -1})
        .limit(1)
        .exec(function(err, docs) {
            if (err) {
                deferred.reject(err);
                return;
            }

            deferred.resolve(docs[0]);
        });

    return deferred.promise;
};

/**
 * A tracking point is a single reported location (snapshot)
 * of a flight.
 */
var TrackingPointSchema = mongoose.Schema({
    flight: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flight',
        required: false
    },
    edgeId: {
        type: String,
        required: true
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    altitude: {
        type: Number,
        required: true
    },
    speed: {
        type: Number,
        required: true
    },
    direction: {
        type: Number,
        required: false,
        default: null
    },
    time: {
        type: Number,
        required: true
    },
    receiptTime: {
        type: Number,
        default: function() {
            // Seconds since Epoch, GMT
            return parseInt(new Date().getTime() / 1000);
        }
    },
    rawData: {
        type: String,
        required: true,
        unique: true
    }
});

/**
 * A VOR is an ancient analog navigation system
 * the FAA uses for aviation navigation.
 */
var VorSchema = mongoose.Schema({
    elevation: {
        type: Number,
        required: false,
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    frequency: {
        type: Number,
        required: false
    },
    call: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: false
    }
});

module.exports = {
    connect: function(opts) {
        var deferred = q.defer();

        var connString = 'mongodb://';
        if (opts.user && opts.password) {
            connString = util.format('%s%s:%s@', connString, opts.user, opts.password);
        }
        connString += opts.host + '/' + opts.db;

        mongoose.connect(connString);
        var db = mongoose.connection;
        db.on('error', deferred.reject);
        db.once('open', deferred.resolve);

        return deferred.promise;
    },

    Flight: mongoose.model('Flight', FlightSchema),
    TrackingPoint: mongoose.model('TrackingPoint', TrackingPointSchema),
    Vor: mongoose.model('Vor', VorSchema)
};
