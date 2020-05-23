angular.module('app', ['ngRoute', 'ngResource', 'ngSanitize', 'angular-uuid', 'ui.bootstrap', 'ui.validate', 'textAngular'])
    // Service
    .factory('Api', ['$resource',
        function ($resource) {
            return {
                Login: $resource('/auth/login/', null, {
                    'post': { method:'POST', isArray: false }
                }),
                Reset: $resource('/auth/reset/', null, {
                    'post': { method:'POST', isArray: false }
                })
            };
        }])

    .controller('LoginController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', '$window', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout, $window) {
        $scope.loading = false;
        $scope.loginMessage = {};

        $scope.loginSubmit = function () {
            $scope.loading = true;
            Api.Login.post(null, $scope.user).$promise.then(function (response) {
                console.log(response);
                $scope.loading = false;
                if (response.status == 'ok') {
                    $window.location.href = response.redirect
                } else {
                    $scope.loginMessage.text = 'Login Error: ' + response.data.error;
                    $scope.loginMessage.type = 'alert-danger';
                    $scope.loginMessage.show = true;
                    $timeout(function () { $scope.alertMessage.show = false; }, 3000);
                }
            }, function (response) {
                console.log(response);
                $scope.loginMessage.text = 'Login Error: ' + response.data.error;
                $scope.loginMessage.type = 'alert-danger';
                $scope.loginMessage.show = true;
                $timeout(function () { $scope.alertMessage.show = false; }, 3000);
                $scope.loading = false;
            });
        };

    }])
    
    .controller('RegisterController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout) {
       
    }])

    .controller('ResetController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', '$window', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout, $window) {
        $scope.resetMessage = {};
        $scope.resetSubmit = function () {
            $scope.loading = false
            var vars = {'user': $scope.user , 'password': $scope.password};

            Api.Reset.post(null, vars).$promise.then(function (response) {
                console.log(response);
                $scope.loading = false;
                if (response.status == 'ok') {
                    $window.location.href = response.redirect
                } else {
                    $scope.resetMessage.text = 'Failed to reset password: ' + response.data.error;
                    $scope.resetMessage.type = 'alert-danger';
                    $scope.resetMessage.show = true;
                    $timeout(function () { $scope.resetMessage.show = false; }, 3000);
                }
            }, function (response) {
                console.log(response);
                $scope.resetMessage.text = 'Failed to reset password: ' + response.data.error;
                $scope.resetMessage.type = 'alert-danger';
                $scope.resetMessage.show = true;
                $timeout(function () { $scope.resetMessage.show = false; }, 3000);
                $scope.loading = false;
            });
        };
    }])

    .controller('ProfileController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout) {
      
    }])

    .config(['$routeProvider', '$locationProvider', '$httpProvider', function ($routeProvider, $locationProvider, $httpProvider) {
        $routeProvider
            .when('/login', {
                templateUrl: '/templates/auth/login.html',
                controller: 'LoginController'
            })
            .when('profile', {
                templateUrl: '/templates/auth/profile.html',
                controller: 'ProfileController'
            })
            .when('/register', {
                templateUrl: '/templates/auth/register.html',
                controller: 'RegisterController'
            })
            .when('/reset', {
                templateUrl: '/templates/auth/reset.html',
                controller: 'ResetController'
            });
        $httpProvider.defaults.headers.delete = { "Content-Type": "application/json;charset=utf-8" };
        $httpProvider.interceptors.push(function ($q, $location) {
            return {
                response: function (response) {
                    return response;
                },
                responseError: function (response) {
                    if (response.status === 401)
                        $location.absUrl('/login');
                    return $q.reject(response);
                }
            };
        });
        $locationProvider.html5Mode({ enabled: true, requireBase: false, rewriteLinks: true });
    }]);