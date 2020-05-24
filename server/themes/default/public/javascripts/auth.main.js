angular.module('app', ['ngRoute', 'ngResource', 'ngSanitize', 'angular-uuid', 'ui.bootstrap', 'ui.validate', 'textAngular'])
    // Service
    .factory('Api', ['$resource',
        function ($resource) {
            return {
                Login: $resource('/auth/login/', null, {
                    'post': { method: 'POST', isArray: false }
                }),
                Register: $resource('/auth/register/', null, {
                    'post': { method: 'POST', isArray: false }
                }),
                Reset: $resource('/auth/reset/', null, {
                    'post': { method: 'POST', isArray: false }
                }),
                UserDetail: $resource('/api/user/:id', { id: '@id' }, {
                    'post': { method: 'POST', isArray: false }
                }),
                UsernameCheck: $resource('/auth/userCheck/username/:id', { id: '@id' }, {
                    'post': { method: 'POST', isArray: false }
                }),
                UseremailCheck: $resource('/auth/userCheck/email/:id', { id: '@id' }, {
                    'post': { method: 'POST', isArray: false }
                }),
                Profile: $resource('/auth/profile/me', null, {
                    'post': { method: 'POST', isArray: false }
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

    .controller('RegisterController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', '$window', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout, $window) {
        $scope.userLoading = false;
        $scope.existingUsername = false;
        $scope.existingEmail = false;
        $scope.loading = false;
        $scope.alertMessage = {};

        $scope.checkUsername = function () {
            $scope.userLoading = true;
            if ($scope.user.username) {
                Api.UsernameCheck.get({ id: $scope.user.username }, function (results) {
                    console.log(results)
                    if (results.username) {
                        $scope.userLoading = false;
                        $scope.existingUsername = true;
                        return true;
                    } else {
                        $scope.userLoading = false;
                        $scope.existingUsername = false;
                        return false;
                    }
                });
            } else {
                $scope.userLoading = false;
                $scope.existingUsername = false;
                return false;
            }
        };

        $scope.checkEmail = function () {
            $scope.userLoading = true;
            if ($scope.user.email) {
                Api.UseremailCheck.get({ id: $scope.user.email }, function (results) {
                    console.log(results)
                    if (results.email) {
                        $scope.userLoading = false;
                        $scope.existingEmail = true;
                        return true;
                    } else {
                        $scope.userLoading = false;
                        $scope.existingEmail = false;
                        return false;
                    }
                });
            } else {
                $scope.userLoading = false;
                $scope.existingEmail = false;
                return false;
            }
        };

        $scope.registerSubmit = function () {
            console.log('fire')
            if ($scope.existingUsername) {
                $scope.alertMessage.text = 'Error creating user: User with this username already exists.';
                $scope.alertMessage.type = 'alert-danger';
                $scope.alertMessage.show = true;
                $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            } else if ($scope.existingEmail) {
                $scope.alertMessage.text = 'Error creating user: User with this email already exists.';
                $scope.alertMessage.type = 'alert-danger';
                $scope.alertMessage.show = true;
                $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            } else {
                $scope.userLoading = true;
                Api.Register.save(null, $scope.user).$promise.then(function (response) {
                    console.log(response);
                    if (response.status == 'ok') {
                        $scope.alertMessage.text = 'User created!';
                        $scope.alertMessage.type = 'alert-success';
                        $scope.alertMessage.show = true;
                        $timeout(function () { $scope.alertMessage.show = false; }, 3000);
                        $scope.userLoading = false;
                        $window.location.href = response.redirect
                    } else {
                        $scope.alertMessage.text = 'Error creating user: ' + response;
                        $scope.alertMessage.type = 'alert-danger';
                        $scope.alertMessage.show = true;
                        $timeout(function () { $scope.alertMessage.show = false; }, 3000);
                        $scope.userLoading = false;
                    }
                }, function (response) {
                    console.log(response);
                    $scope.alertMessage.text = 'Error creating user: ' + response.data.error;
                    $scope.alertMessage.type = 'alert-danger';
                    $scope.alertMessage.show = true;
                    $timeout(function () { $scope.alertMessage.show = false; }, 3000);
                    $scope.userLoading = false;
                });
            }
        };
    }])

    .controller('ResetController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', '$window', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout, $window) {
        $scope.resetMessage = {};
        $scope.resetSubmit = function () {
            $scope.loading = false
            var vars = { 'user': $scope.user, 'password': $scope.password };

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
        $scope.alertMessage = {};
        $scope.loading = true;
        $scope.userSubmit = function () {
            $scope.loading = true;
            Api.Profile.save(null, $scope.user).$promise.then(function (response) {
                console.log(response);
                if (response.status == 'ok') {
                    $scope.alertMessage.text = 'User saved!';
                    $scope.alertMessage.type = 'alert-success';
                    $scope.alertMessage.show = true;
                    $timeout(function () { $scope.alertMessage.show = false; }, 3000);
                    $scope.loading = false;
                } else {
                    $scope.alertMessage.text = 'Error saving user: ' + response;
                    $scope.alertMessage.type = 'alert-danger';
                    $scope.alertMessage.show = true;
                    $timeout(function () { $scope.alertMessage.show = false; }, 3000);
                    $scope.loading = false;
                }
            }, function (response) {
                console.log(response);
                $scope.alertMessage.text = 'Error saving user: ' + response.data.error;
                $scope.alertMessage.type = 'alert-danger';
                $scope.alertMessage.show = true;
                $timeout(function () { $scope.alertMessage.show = false; }, 3000);
                $scope.loading = false;
            });
        };
        Api.Profile.get( function (results) {
            $scope.user = results;
            $scope.userLoading = false;
            $scope.existingUsername = false;
            $scope.existingEmail = false;
            $scope.loading = false;

            if (results.username) {
                $scope.user.originalUsername = results.username;
                $scope.user.originalEmail = results.email;
                $scope.user.lastlogondate = new Date(results.lastlogondate).toLocaleString('en-AU')
                console.log(results)
            }
        });
    }])

    .config(['$routeProvider', '$locationProvider', '$httpProvider', function ($routeProvider, $locationProvider, $httpProvider) {
        $routeProvider
            .when('/login', {
                templateUrl: '/templates/auth/login.html',
                controller: 'LoginController'
            })
            .when('/profile', {
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