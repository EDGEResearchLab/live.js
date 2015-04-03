'use strict';

/* global angular, io */

angular.module('EdgePredict', [])
    .config(function($stateProvider) {
        $stateProvider
            .state('predict', {
                prettyName: 'Predict',
                url: '/predict',
                templateUrl: '/app/templates/predict.html',
                pageTitle: 'Predict',
                controller: 'PredictController'
            });
    })
    .factory('PredictSocketFactory', function(socketFactory, BaseUrl) {
        var sock = io.connect(BaseUrl + '/predict');
        return socketFactory({
            ioSocket: sock
        });
    })
    .factory('PredictState', function() {
        return {};
    })
    .controller('PredictController', function($scope, PredictSocketFactory, $log, uiGmapGoogleMapApi) {
        $scope.predictedPoint = {};

        uiGmapGoogleMapApi.then(function(map) {
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

        PredictSocketFactory.on('predictedLandingPoint', function(point) {
            $log.log('predictedLandingPoint:', point);
            $scope.predictedPoint = point;
            setCenter(point.latitude, point.longitude);
        });
    });
