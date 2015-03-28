/* jshint node: true */

Object.defineProperty(exports, 'NAUTICAL_MILES', {
    value: 3443.89849,
    enumerable: true
});

/**
 * Calculate the distance between two latitude/longitude coordinates
 * in the radius units (defaults to nautical miles), using the 
 * haversine formula.
 */
var distanceBetween = function(lat1, lon1, lat2, lon2, radius) {
    radius = radius || exports.NAUTICAL_MILES;

    var radians = [lat1, lon1, lat2, lon2].map(Math.radians),
        rlon2 = radians.pop(),
        rlat2 = radians.pop(),
        rlon1 = radians.pop(),
        rlat1 = radians.pop();

    var dLon = rlon2 - rlon1,
        dLat = rlat2 - rlat1;

    var a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.pow(Math.sin(dLon / 2), 2);
    return 2 * radius * Math.asin(Math.sqrt(a));
};

var bearing = function(startLat, startLon, endLat, endLon) {
    startLat = Math.radians(startLat);
    startLon = Math.radians(startLon);
    endLat = Math.radians(endLat);
    endLon = Math.radians(endLon);

    var dLon = endLon - startLon;
    var dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0));
    if (Math.abs(dLon) > Math.PI) {
        if (dLon > 0.0) {
            dLon = -(2.0 * Math.PI - dLon);
        } else {
            dLon = (2.0 * Math.PI + dLon);
        }
    }

    return (Math.degrees(Math.atan2(dLon, dPhi)) + 360.0) % 360;
};

Math.radians = function(degs) {
    return degs * Math.PI / 180;
};

Math.degrees = function(rads) {
    return rads * (180 / Math.PI);
};

module.exports = {
    distanceBetween: distanceBetween,
    bearing: bearing
};
