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
    .controller('VorController', function($scope, VorSocketFactory, $log) {
        // Map options
        $scope.map = {
            center: {
                latitude: 38.874380,
                longitude: -104.409064
            },
            zoom: 10,
            options: {
                mapTypeId: google.maps.MapTypeId.TERRAIN 
            }
        };

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
        $scope.vorModels = [
            {
                edgeId: '123',
                points: [
                    {
                        latitude: 38.774380,
                        longitude: -104.709064
                    },
                    {
                        latitude: 38.874380,
                        longitude: -104.409064
                    },
                    {
                        latitude: 38.974380,
                        longitude: -103.009064
                    }
                ],
                style: {
                    color: '#FF0000'
                }
            }
        ];

        VorSocketFactory.on('trackingPoint', function(point) {
            $log.info('Tracking Point:', point);
        });

        //VorSocketFactory.on('connect', function() {});
        //VorSocketFactory.on('disconnect', function() {});
    });
