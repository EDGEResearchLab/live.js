/* global angular, io, google, _ */

'use strict';

angular.module('EdgeLive', ['uiGmapgoogle-maps', 'chart.js', 'edgeUtil'])
    .config(function($stateProvider) {
        $stateProvider
            .state('live', {
                prettyName: 'Live',
                url: '/live',
                templateUrl: '/app/templates/live.html',
                pageTitle: 'Live',
                controller: 'LiveController',
                default: true
            });
    })
    .factory('LiveState', function() {
        return {
            trackingPointModels: [],
            edgeIdModelIdxMapping: {}
        };
    })
    .factory('LiveSocketFactory', function(socketFactory, BaseUrl) {
        var sock = io.connect(BaseUrl + '/tracking');
        return socketFactory({
            ioSocket: sock
        });
    })
    .directive('flightSnapshot', function() {
        function calculateAscentRateIfPossible(oldVal, newVal) {
            if (oldVal.length === 0) {
                return;
            }

            var prevPoint = oldVal[oldVal.length - 1];
            var newPoint = newVal[newVal.length - 1];

            var hasTimeAndAlt = function(obj) {
                var allHave = _.all(['time', 'altitude'], function(req) {
                    return (req in obj);
                });

                return allHave && obj.time !== 0;
            };

            if (!_.all([prevPoint, newPoint], hasTimeAndAlt)) {
                //console.debug('Points do not have required info to calculate ascent rate');
                return;
            }

            var timeDelta = newPoint.time - prevPoint.time;
            var altDelta = newPoint.altitude - prevPoint.altitude;

            return altDelta / timeDelta;
        }

        return {
            restrict: 'E',
            scope: {
                model: '='
            },
            templateUrl: '/app/templates/flight_snapshot.html',
            link: function(scope, element, attrs) {
                scope.ascentRate = undefined;
                scope.latestPoint = {};

                scope.$watchCollection('model.points', function(newVal, oldVal) {
                    scope.latestPoint = newVal[newVal.length - 1];
                    var calculatedAscent = calculateAscentRateIfPossible(oldVal, newVal);
                    scope.ascentRate = _.isUndefined(calculatedAscent) ? 0 : calculatedAscent;
                });
            }
        };
    })
    .controller('LiveController', function($scope, LiveSocketFactory, $log, $timeout, uiGmapGoogleMapApi, ColorSvc, LiveState) {
        var centerMapOnNewPoint = false;
        //$scope.altVsTime = {
        //    data: [[]],
        //    labels: []
        //};
        // Models for tracking points, minimum info required:
        // edgeId: string|int, points: [{TrackingPoint}], style: {color: HEX}
        $scope.trackingPointModels = LiveState.trackingPointModels;

        uiGmapGoogleMapApi.then(function(map) {
            // Map Configuration Options
            $scope.map = {
                center: {
                    latitude: 38.874380,
                    longitude: -104.409064
                },
                zoom: 13,
                options: {
                    mapTypeId: map.MapTypeId.TERRAIN
                }
            };
        });

        function setCenter(latitude, longitude) {
            $scope.map.center = {
                latitude: latitude,
                longitude: longitude
            };
        }

        function handleNewPoint(point) {
            var idx = LiveState.edgeIdModelIdxMapping[point.edgeId];
            if (_.isUndefined(idx)) {
                idx = LiveState.trackingPointModels.length;
                LiveState.edgeIdModelIdxMapping[point.edgeId] = idx;
                LiveState.trackingPointModels[idx] = {
                    edgeId: point.edgeId,
                    points: [],
                    style: {
                        color: ColorSvc.generateRandomHex()
                    }
                };
            }

            LiveState.trackingPointModels[idx].points.push(point);
        }

        LiveSocketFactory.on('initialPoints', function(points) {
            points.forEach(handleNewPoint);
        });
        LiveSocketFactory.on('trackingPoint', function(point) {
            handleNewPoint(point);

            if (centerMapOnNewPoint) {
                // Roughly calculate a center value, this assumes
                // the balloons are near each other (ish) and does not
                // account for map zoom.
                var latCtr = 0;
                var lngCtr = 0;
                LiveState.trackingPointModels.forEach(function(model) {
                    var latestPoint = model.points[model.points.length - 1];
                    latCtr += latestPoint.latitude;
                    lngCtr += latestPoint.longitude;
                });
                var len = LiveState.trackingPointModels.length;
                try {
                    setCenter(latCtr / len, lngCtr / len);
                } catch (e) {
                    /* Ignored, in case the map is null when the user is off the state. */
                }
            }
        });

        // TODO: Show socket connection status
        //LiveSocketFactory.on('connect', function() {});
        //LiveSocketFactory.on('disconnect', function() {});
    });
