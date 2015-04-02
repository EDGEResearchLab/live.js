'use strict';

/* global angular */

angular.module('edgeGPS', [])
    .filter('decimalDegToDegMinSec', function() {
        return function(decimalDegs, precision) {
            var deg = decimalDegs | 0;
            var frac = Math.abs(decimalDegs - deg);
            var min = (frac * 60) | 0;
            var sec = frac * 3600 - min * 60;

            return deg + '° ' + min + '\' ' + sec.toFixed(precision || 2) + '"';
        };
    })
    .filter('metersToFeet', function() {
        return function(meters) {
            return meters * 3.28084;
        };
    });