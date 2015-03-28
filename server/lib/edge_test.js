var assert = require('assert'),
    edge = require('./edge');

describe('edge library', function() {
    describe('satcom data handling', function() {
        it('is able to decode telemetry data', function() {
            var dataStr = '025a7a43f9c17c390002c3ca0000573b0004bb6301679520000000014544';
            var expected = {
                latitude: 39.483971,
                longitude: -104.760263,
                altitude: 1811.94,
                speed: 0,
                direction: 223.31,
                date: 310115,
                utc: 23565600,
                time: 1422766616,
                age: 1
            };
            var decoded = edge.decodeSatcomPayload(dataStr);

            assert.equal(decoded.latitude, expected.latitude);
            assert.equal(decoded.longitude, expected.longitude);
            assert.equal(decoded.altitude, expected.altitude);
            assert.equal(decoded.speed, expected.speed);
            assert.equal(decoded.direction, expected.direction);
            assert.equal(decoded.date, expected.date);
            assert.equal(decoded.utc, expected.utc);

            var expectedTime = new Date(expected.time * 1000);
            assert.equal(decoded.time.getTime(), expectedTime.getTime());
            assert.equal(decoded.age, expected.age);
        });
    });
});
