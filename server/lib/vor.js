/* jshint node: true */

var gps = require('./gps'),
    models = require('./models'),
    q = require('q'),
    _ = require('lodash-node');

module.exports = {
    /**
     * Find the closest vors to a given coordinate.
     *
     * @param latitude {Number}
     * @param longitude {Number}
     * @return {promise}
     *      * On error (query issue), rejected with the error reason
     *      * On success, array of objects with
     *        latitude {Number}, longitude {Number}, call {String}
     *        and distance in nautical miles {Number}
     */
    findClosestVors: function(latitude, longitude) {
        var deferred = q.defer();

        // EDGE Flights are pretty much only ever in
        // CO and *may* span to KS if a winter flight.
        var query = {
            state: {
                $in: ['CO', 'KS']
            }
        };

        // Limit the result set, we only care
        // about a few minor pieces
        var projection = {
            _id: 0,
            latitude: 1,
            longitude: 1,
            call: 1
        };

        models.Vor.find(query, projection, function(err, docs) {
            if (err) {
                return deferred.reject(err);
            }

            var rankedVors = [];

            docs.forEach(function(doc) {
                var point = doc.toObject();
                point.distance = gps.distanceBetween(latitude, longitude, doc.latitude, doc.longitude);
                point.bearing = gps.bearing(doc.latitude, doc.longitude, latitude, longitude);
                var insertIdx = _.sortedIndex(rankedVors, point, 'distance');
                rankedVors.splice(insertIdx, 0, point);
            });

            deferred.resolve(rankedVors);
        });

        return deferred.promise;
    }
};
