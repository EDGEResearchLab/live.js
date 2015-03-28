var restruct = require('restruct'),
    moment = require('moment');

var dateUtcToSecondsSinceEpoch = function(date, utc) {
    date = ((date.toString().length < 6) ? '0' : '') + date.toString();
    utc = ((utc.toString().length < 8) ? '0' : '') + utc.toString();
    return moment(date + '' + utc, 'DDMMYYHHmmssSS') / 1000;
};

module.exports = {
    decodeSatcomPayload: function(data) {
        var decodedData = new Buffer(data, 'hex');
        var telemetryHex = decodedData.slice(0, 28);

        var struct = restruct
            .int32bs('latitude')
            .int32bs('longitude')
            .int32bs('altitude')
            .int16bs('speed')
            .int16bs('direction')
            .int32bs('date')
            .int32bs('utc')
            .int32bs('age');

        var unpacked = struct.unpack(telemetryHex);
        unpacked.latitude /= 1e6; // decimal degrees
        unpacked.longitude /= 1e6; // decimal degrees
        unpacked.altitude /= 100; // meters
        unpacked.speed /= 100; // meters/second
        unpacked.direction /= 100;
        unpacked.time = dateUtcToSecondsSinceEpoch(unpacked.date, unpacked.utc);

        return unpacked;
    }
};
