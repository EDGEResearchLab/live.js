'use strict';

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
    .controller('PredictController', function($scope, PredictSocketFactory, $log) {
        PredictSocketFactory.on('initialPoints', function(points) {
            $log.info('Initial Points:', points);
        });

        PredictSocketFactory.on('trackingPoint', function(point) {
            $log.info('Tracking Point:', point);
        });

        PredictSocketFactory.on('connect', function() {
            $log.info('Connected');
        });

        PredictSocketFactory.on('disconnect', function() {
            $log.info('Disconnected');
        });
    });
