'use strict';

/* global angular, io, google, _ */

angular.module('EdgeVor', ['edgeGPS', 'edgeUtil'])
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
    /**
     * Return a persistent socket connection to the VOR namespace.
     */
    .factory('VorSocketFactory', function(socketFactory, BaseUrl) {
        var sock = io.connect(BaseUrl + '/vor');
        return socketFactory({
            ioSocket: sock
        });
    })
    /**
     * Factory to hold onto the VOR state for page navigation
     * to and from to retain up-to-date information.  This allows
     * for a user, after they have visited this page, to continue
     * getting up-to-date info in the background.
     */
    .factory('VorState', function() {
        return {
            vorModels: [],
            edgeIdModelIdxMapping: {}
        };
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
    .controller('VorController', function($scope, VorSocketFactory, $log, uiGmapGoogleMapApi, ColorSvc, VorState) {
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
        $scope.vorModels = VorState.vorModels;
        VorState.edgeIdModelIdxMapping = {};

        VorSocketFactory.on('trackingPoint', function(update) {
            //$log.info('VOR::Tracking Point:', update);
            var idx = VorState.edgeIdModelIdxMapping[update.point.edgeId];
            if (_.isUndefined(idx)) {
                idx = VorState.vorModels.length;
                VorState.edgeIdModelIdxMapping[update.point.edgeId] = idx;
                VorState.vorModels[idx] = {
                    edgeId: update.point.edgeId,
                    style: {
                        color: ColorSvc.generateRandomHex()
                    },
                    points: []
                };
            }

            VorState.vorModels[idx].points[0] = update.vors[0];
            VorState.vorModels[idx].points[1] = update.point;
            VorState.vorModels[idx].points[2] = update.vors[1];
            VorState.vorModels[idx].latitude = update.point.latitude;
            VorState.vorModels[idx].longitude = update.point.longitude;
            VorState.vorModels[idx].altitude = update.point.altitude;
            VorState.vorModels[idx].vors = update.vors;
        });

        //VorSocketFactory.on('connect', function() {});
        //VorSocketFactory.on('disconnect', function() {});
    });
