/* global angular, io, google */

'use strict';

angular.module('EdgeVor', [])
    .config(function($stateProvider) {
        $stateProvider
            .state('vor', {
                prettyName: 'VOR',
                url: '/vor',
                templateUrl: '/app/templates/vor.html',
                pageTitle: 'VOR',
                controller: 'VorController'
            });
    })
    .factory('VorSocketFactory', function(socketFactory, BaseUrl) {
        var sock = io.connect(BaseUrl + '/vor');
        return socketFactory({
            ioSocket: sock
        });
    })
    .directive('vorSummary', function() {
        return {
            restrict: 'E',
            scope: {
                model: '='
            },
            templateUrl: '/app/templates/vor_summary.html',
            link: function(scope, element, attrs) {
                
            }
        };
    })
    .controller('VorController', function($scope, VorSocketFactory, $log, uiGmapGoogleMapApi) {
        uiGmapGoogleMapApi.then(function(map) {
            $scope.map = {
                center: {
                    latitude: 38.874380,
                    longitude: -104.409064
                },
                zoom: 10,
                options: {
                    mapTypeId: map.MapTypeId.TERRAIN 
                }
            };
        });

        /**
         * Models are the VOR points for display, they need at a minimum:
         *  {
         *      edgeId: String|Number,
         *      points: [vor1, tracking point, vor2], // each point with at least {latitude: Number, longitude: Number}
         *      vors: [{call: String, bearing: Number, distance: Number}], // this should be at least 2 points
         *      latitude: Number, // Decimal Degrees
         *      longitude: Number, // Decimal Degrees
         *      altitude: Number, // Meters
         *      style: {
         *          color: HEX
         *      }
         *  }
         */
        $scope.vorModels = [];
        var edgeIdModelIdxMapping = {};

        VorSocketFactory.on('trackingPoint', function(update) {
            $log.info('Tracking Point:', update);
            var idx = edgeIdModelIdxMapping[update.point.edgeId];
            if (_.isUndefined(idx)) {
                idx = $scope.vorModels.length;
                edgeIdModelIdxMapping[update.point.edgeId] = idx;
            }

            $scope.vorModels[idx] = {
                edgeId: update.point.edgeId,
                style: {
                    color: '#FF0000'
                },
                points: [update.vors[0], update.point, update.vors[1]],
                vors: update.vors,
                latitude: update.point.latitude,
                longitude: update.point.longitude,
                altitude: update.point.altitude
            };
        });

        //VorSocketFactory.on('connect', function() {});
        //VorSocketFactory.on('disconnect', function() {});
    });
