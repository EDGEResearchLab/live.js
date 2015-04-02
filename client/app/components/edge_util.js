"use strict";

/* global angular */

angular.module('edgeUtil', [])
    .factory('ColorSvc', function() {
        return {
            generateRandomHex: function() {
                var chars = 'ABCDEF0123456789';
                var color = '#';
                for (var i = 0; i < 6; i++) {
                    color += chars[Math.floor(Math.random() * (chars.length))];
                }
                return color;
            }
        };
    });