'use strict';

angular.module('EdgeLive', ['uiGmapgoogle-maps'])
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
                scope.ascentRate = 'NaN';
                scope.latestPoint = {};

                scope.$watchCollection('model.points', function(newVal, oldVal) {
                    scope.latestPoint = newVal[newVal.length - 1];
                    
                    var calculatedAscent = calculateAscentRateIfPossible(oldVal, newVal);
                    if (!_.isUndefined(calculatedAscent)) {
                        scope.ascentRate = ((calculatedAscent >= 0) ? '+' : '') + calculatedAscent.toString();
                    }
                });
            }
        };
    })
    .controller('LiveController', function($scope, LiveSocketFactory, $log) {
        // Map Configuration Options
        $scope.map = {
            center: {
                latitude: 38.874380,
                longitude: -104.409064
            },
            zoom: 13,
            options: {
                mapTypeId: google.maps.MapTypeId.TERRAIN
            }
        };

        // Models for tracking points, minimum info required:
        // edgeId: string|int, points: [{TrackingPoint}], style: {color: HEX}
        $scope.trackingPointModels = [
            {
                edgeId: 123,
                points: [
                    {latitude: 38.874380, longitude: -104.409064},
                    {latitude: 38.874380, longitude: -104.43}
                ],
                style: {
                    color: '#FF0000'
                }
            },
            {
                edgeId: 'abc',
                points: [
                    {latitude: 38.874380, longitude: -104.409064},
                    {latitude: 38.89, longitude: -104.409064},
                ],
                style: {
                    color: '#00FF00'
                }
            }
        ];

        var edgeIdModelIdxMapping = {
            123: 0,
            'abc': 1
        };

        function handleNewPoint(point) {
            var idx = edgeIdModelIdxMapping[point.edgeId];
            if (_.isUndefined(idx)) {
                idx = $scope.trackingPointModels.length;
                edgeIdModelIdxMapping[point.edgeId] = idx;
                $scope.trackingPointModels[idx] = {
                    edgeId: point.edgeId,
                    points: [],
                    style: {
                        color: '#0000FF' // TODO
                    }
                };
            }

            $scope.trackingPointModels.points.push(point);
        }

        LiveSocketFactory.on('initialPoints', function(points) {
            points.forEach(handleNewPoint);
        });
        LiveSocketFactory.on('trackingPoint', handleNewPoint);

        // TODO: Show socket connection status
        //LiveSocketFactory.on('connect', function() {});
        //LiveSocketFactory.on('disconnect', function() {});
    });
