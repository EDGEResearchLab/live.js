/* jshint strict: true */
/* global angular */

'use strict';

angular.module('edge', [
        'ui.router',
        'btford.socket-io',
        'EdgeLive',
        'EdgeVor',
        //'EdgePredict'
    ])
    /**
     *  Modules register any states they can provide in their `config`.
     *
     *  TODO: Consider ordering based on priority instead of load order?
     */
    .config(function($stateProvider, $urlRouterProvider) {
        /**
         * Dynamically determine the default state if one is not found.
         * This assumes that some state claims it is the "default", the
         * first found state with "default" as truthy is used.
         */
        $urlRouterProvider.otherwise(function($injector, $location) {
            var $state = $injector.get('$state');
            var defaultFound = false;
            $state.get().forEach(function(state) {
                if (state.default && !defaultFound) {
                    defaultFound = true;
                    $state.go(state.name);
                }
            });
        });
    })
    /**
     * Discovers and provides the base URL for the site,
     * allowing for connection to the web socket namespaces
     * simple regardless of environment.
     */
    .factory('BaseUrl', function($location) {
        var url = '';
        url += $location.$$protocol + '://' + $location.$$host;
        if ($location.$$port) {
            url += ':' + $location.$$port;
        }
        return url;
    })
    .controller('AppController', function($scope, $state, $log) {
        $scope.states = _.filter($state.get(), function(state) {
            return state.name !== '';
        });
    });
