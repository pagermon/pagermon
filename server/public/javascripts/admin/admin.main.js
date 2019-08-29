angular.module('app', ['ngRoute', 'ngResource', 'ngSanitize', 'angular-uuid', 'ui.bootstrap', 'color.picker', 'ui.validate'])
    // Service
    .factory('Api', ['$resource',
     function($resource) {
      return {
        Aliases: $resource('/api/capcodes/', null, {
          'delete': { method:'DELETE', hasBody: true }
        }),
        AliasDetail: $resource('/api/capcodes/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
        ResetPass: $resource('/admin/resetPass', null, {
          'post': { method:'POST', isArray: false }
        }),
        Settings: $resource('/admin/settingsData', null, {
          'post': { method:'POST', isArray: false }
        }),
        AliasDupeCheck: $resource('/api/capcodeCheck/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
        AliasRefresh: $resource('/api/capcodeRefresh', null, {
          'post': { method:'POST', isArray: false }
        })
      };
    }])
    
    // Controller
    .controller('AliasController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout) {
      $scope.loading = true;
      $scope.alertMessage = {};
      Api.Aliases.query(null, function(results) {
        $scope.aliases = results;
        $scope.page = 'aliases';
        $scope.loading = false;
      });
      Api.Settings.get(null, function(results) {
        if (results) {
          if (results.settings.database && results.settings.database.aliasRefreshRequired == 1) {
            $scope.aliasRefreshRequired = 1;
            $scope.alertMessage.text = 'Alias refresh required!';
            $scope.alertMessage.type = 'alert-warning';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }
      });
      
      $scope.aliasRefresh = function () {
        $scope.loading = true;
        $scope.alertMessage = {};
        Api.AliasRefresh.post(null, null).$promise.then(function (response) {
          console.log(response);
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Alias refresh complete!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.aliasRefreshRequired = 0;
          } else {
            $scope.alertMessage.text = 'Error refreshing aliases: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error refreshing aliases: '+response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $scope.loading = false;          
        });
      };
      
      $scope.messageDetail = function(address) {
          $location.url('/aliases/'+address);
      };

      $scope.aliasSelected = function() {
        if ($scope.aliases) {
          var trues = $filter("filter")($scope.aliases, {
              selected: true
          });
          return trues.length;
        }
      };
      
      $scope.aliasDelete = function () {
        var numSelected = $scope.aliasSelected();
        var modalHtml =  '<div class="modal-header"><h5 class="modal-title" id="modal-title">Delete aliases</h5></div>';
        var message   =  '<p>Are you sure you want to delete these aliases?</p><p>Aliases cannot be restored after saving.</p><p><strong>'+numSelected+' aliases selected for deletion.</strong></p>';
            modalHtml += '<div class="modal-body">' + message + '</div>';
            modalHtml += '<div class="modal-footer"><button class="btn btn-danger" ng-click="confirmDelete()">OK</button><button class="btn btn-primary" ng-click="cancelDelete()">Cancel</button></div>';
        
        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ConfirmController
        });
    
        modalInstance.result.then(function() {
          $scope.aliasDeleteConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };
      
      $scope.aliasDeleteConfirmed = function () {
        var deleteList = [];
        $scope.loading = true;
        $scope.selectedAll = false;
        angular.forEach($scope.aliases, function(selected){
            if(selected.selected){
                deleteList.push(selected.id);
            }
        });
        var data = {'deleteList': deleteList};
        console.log(data);
        Api.AliasDetail.post({id: 'deleteMultiple' }, data).$promise.then(function (response) {
          console.log(response);
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Alias deleted!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.aliasRefreshRequired = 1;
            $location.url('/aliases/');
          } else {
            $scope.alertMessage.text = 'Error deleting alias: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error deleting alias: '+response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $scope.loading = false;          
        });
      };
      
      var ConfirmController = function($scope, $uibModalInstance) {
        $scope.confirmDelete = function() {
          $uibModalInstance.close();
        };
      
        $scope.cancelDelete = function() {
          $uibModalInstance.dismiss('cancel');
        };
      };
    }])
    
    .controller('AliasDetailCtrl', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout) {
      $scope.page = 'aliasDetail';
      $scope.alertMessage = {};
      $scope.colorOptions = {
          required: true,
          inputClass: 'form-control',
          id: 'alias.color',
          name: 'alias.color',
          format: 'hexString',
          saturation: true,
          alpha: false
      };
      $scope.newButton = function(address) {
          $location.url('/aliases/'+address);
      };
      
      $scope.aliasRefresh = function () {
        $scope.loading = true;
        $scope.alertMessage = {};
        Api.AliasRefresh.post(null, null).$promise.then(function (response) {
          //console.log(response);
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Alias refresh complete!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.aliasRefreshRequired = 0;
          } else {
            $scope.alertMessage.text = 'Error refreshing aliases: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error refreshing aliases: '+response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $scope.loading = false;          
        });
      };
      
      $scope.aliasLoad = function() {
        $scope.loading = true;
        Api.AliasDetail.get({id: $routeParams.id }, function(results) {
          $scope.alias = results;
          $scope.aliasLoading = false;
          $scope.existingAddress = false;
          $scope.loading = false;

          if (results.pluginconf) {
            $scope.plugins.forEach(plugin => {
              if (!$scope.alias.pluginconf[plugin.name]) {
                $scope.alias.pluginconf[plugin.name] = {};
              }
            });
          } else {
            // populate pluginconf
            $scope.alias.pluginconf = {};
            $scope.plugins.forEach(plugin => {
              $scope.alias.pluginconf[plugin.name] = {};
            });
          }

          if (results.address) {
            $scope.alias.originalAddress = results.address;
            $scope.isNew = false;
            //console.log(results);
          } else {
            $scope.alias.address = $routeParams.address || '';
            $scope.alias.originalAddress = $routeParams.address || '';
            $scope.isNew = true;
            //console.log(results);
          }
        });
      };
      // controls the form validation on the address field
      $scope.checkAddress = function() {
        $scope.aliasLoading = true;
        if ($scope.alias.address) {
          Api.AliasDupeCheck.get({id: $scope.alias.address }, function(results) {
            if (results.address) {
              $scope.aliasLoading = false;
              if (results.address == $scope.alias.originalAddress) {
                $scope.existingAddress = false;
                return false;
              } else {
                $scope.existingID = results.id;
                $scope.existingAddress = true;
                return true;
              }
            } else {
              $scope.aliasLoading = false;
              $scope.existingAddress = false;
              return false;
            }
          });
        } else {
          $scope.aliasLoading = false;
          $scope.existingAddress = false;
          return false;
        }
      };
      
      $scope.aliasSubmit = function() {
        if ($scope.existingAddress) {
          $scope.alertMessage.text = 'Error saving alias: Alias with this address already exists.';
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
        } else {
          $scope.loading = true;
          var id;
          if ($scope.alias.id) {
            id = $routeParams.id;
          } else {
            id = "new";
          }
          Api.AliasDetail.save({ id: id }, $scope.alias).$promise.then(function (response) {
            console.log(response);
            if (response.status == 'ok') {
              $scope.alertMessage.text = 'Alias saved!';
              $scope.alertMessage.type = 'alert-success';
              $scope.alertMessage.show = true;
              $timeout(function () { $scope.alertMessage.show = false; }, 3000);
              $scope.loading = false;
              if ($scope.isNew) {
                $scope.aliasRefreshRequired = 1;
                $location.url('/aliases/' + response.id);
              }
            } else {
              $scope.alertMessage.text = 'Error saving alias: ' + response;
              $scope.alertMessage.type = 'alert-danger';
              $scope.alertMessage.show = true;
              $timeout(function () { $scope.alertMessage.show = false; }, 3000);
              $scope.loading = false;
            }
          }, function (response) {
            console.log(response);
            $scope.alertMessage.text = 'Error saving alias: ' + response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
          });
        }
      };
      
      $scope.aliasDelete = function () {
        var modalHtml =  '<div class="modal-header"><h5 class="modal-title" id="modal-title">Delete Alias</h5></div>';
            modalHtml += '<div class="modal-body"><p>Are you sure you want to delete this alias?</p><p>Aliases cannot be restored after deletion.</p></div>';
            modalHtml += '<div class="modal-footer"><button class="btn btn-danger" ng-click="confirmDelete()">OK</button><button class="btn btn-primary" ng-click="cancelDelete()">Cancel</button></div>';
        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ConfirmController
        });
        modalInstance.result.then(function() {
          $scope.aliasDeleteConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };
      
      $scope.aliasDeleteConfirmed = function () {
        console.log('Deleting alias '+$scope.alias.address);
        $scope.loading = true;
        Api.AliasDetail.delete({id: $routeParams.id }, $scope.alias).$promise.then(function (response) {
          console.log(response);
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Alias deleted!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
            $location.url('/aliases/');
          } else {
            $scope.alertMessage.text = 'Error deleting alias: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error deleting alias: '+response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $scope.loading = false;          
        });
      };
      
      var ConfirmController = function($scope, $uibModalInstance) {
        $scope.confirmDelete = function() {
          $uibModalInstance.close();
        };
        $scope.cancelDelete = function() {
          $uibModalInstance.dismiss('cancel');
        };
      };
      // get data on load
      Api.Settings.get(null, function(results) {
        if (results) {
          if (results.database && results.database.aliasRefreshRequired == 1) {
            $scope.aliasRefreshRequired = 1;
          }
          $scope.settings = results.settings;
          $scope.plugins = results.plugins;
        }
        $scope.aliasLoad();
      });
    }])
    
    // handles password resets, needs cleanup
    .controller('ResetController', ['$scope', '$routeParams', 'Api', '$timeout', function ($scope, $routeParams, Api, $timeout) {
      $scope.form = {};
      $scope.alertMessage = {};
      $scope.page = 'reset';
      $scope.submitPass = function() {
        $scope.loading = true;
        var pass = {'password': $scope.password};
        Api.ResetPass.post(null, pass).$promise.then(function (response) {
          console.log(response);
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Password changed!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          } else {
            $scope.alertMessage.text = 'Error changing password: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error changing password: '+response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $scope.loading = false;          
        });
        };
    }])
    
    // needs cleanup
    .controller('SettingsController', ['$scope', '$routeParams', 'Api', 'uuid', '$uibModal', '$filter', '$timeout', '$sanitize', function ($scope, $routeParams, Api, uuid, $uibModal, $filter, $timeout, $sanitize) {
      $scope.alertMessage = {};
      Api.Settings.get(null, function(results) {
        if (!results.settings.messages.replaceText)
          results.settings.messages.replaceText = [{}];
        if (!results.settings.auth.keys)
          results.settings.auth.keys = [{}];
        $scope.settings = results.settings;
        $scope.plugins = results.plugins;
      });

      $scope.settingsSubmit = function() {
        $scope.loading = true;
        Api.Settings.save(null, $scope.settings).$promise.then(function (response) {
          console.log(response);
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Settings saved!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          } else {
            $scope.alertMessage.text = 'Error saving settings: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error saving settings: '+response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $scope.loading = false;          
        });
      };
      
      $scope.page = 'settings';
      
      // this function generates the long API keys
      // gets two 36 char UUIDs, removes the dashes, base36 encodes them, then joins together half of each string
      // for increased key length, uncomment the h2/k2 lines, and swap the kf lines
      $scope.generateKey = function(index) {
        var hash = uuid.v4().replace(/-/g,"");
        var hash2 = uuid.v4().replace(/-/g,"");
        var h1 = hash.slice(0, 15);
      //  var h2 = hash.slice(16, -1);
        var h3 = hash2.slice(0, 15);
        var k1 = parseInt(h1, 16).toString(36);
      //  var k2 = parseInt(h2, 16).toString(36);
        var k3 = parseInt(h3, 16).toString(36);
      //  var kf = k1+k2+k3;
        var kf = k1+k3;
        var key = kf.toUpperCase();
        if (index == 'sessionSecret') {
          $scope.settings.global.sessionSecret = key;
        } else {
          $scope.settings.auth.keys[index].key = key;
        }
      };
      
      $scope.showPassword = false;

      $scope.toggleShowPassword = function() {
        $scope.showPassword = !$scope.showPassword;
      }

      $scope.addKey = function () {
        $scope.settings.auth.keys.push({
          'name': "",
          'key': ""
        });
      };
      
      $scope.addMatch = function () {
        $scope.settings.messages.replaceText.push({
          'match': "",
          'replace': ""
        });
      };
      
      $scope.keySelected = function() {
        if ($scope.settings && $scope.settings.auth) {
          var trues = $filter("filter")($scope.settings.auth.keys, {
              selected: true
          });
          return trues.length;
        }
      };
      
      $scope.matchSelected = function() {
        if ($scope.settings && $scope.settings.messages) {
          var trues = $filter("filter")($scope.settings.messages.replaceText, {
              selected: true
          });
          return trues.length;
        }
      };
      
      $scope.removeKey = function () {
        var modalHtml =  '<div class="modal-header"><h5 class="modal-title" id="modal-title">Remove API Keys</h5></div>';
            modalHtml += '<div class="modal-body"><p>Are you sure you want to delete these keys?</p><p>Keys cannot be restored after saving.</p></div>';
            modalHtml += '<div class="modal-footer"><button class="btn btn-danger" ng-click="confirmDelete()">OK</button><button class="btn btn-primary" ng-click="cancelDelete()">Cancel</button></div>';
        
        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ConfirmController
        });
    
        modalInstance.result.then(function() {
          $scope.removeKeyConfirmed();
        }, function () {
        });
      };
      
      $scope.removeKeyConfirmed = function () {
        var newDataList=[];
        $scope.selectedAll = false;
        angular.forEach($scope.settings.auth.keys, function(selected){
            if(!selected.selected){
                newDataList.push(selected);
            }
            else {
              console.log('Deleting key '+selected.name);
            }
        });
        $scope.settings.auth.keys = newDataList;
      };
      
      $scope.removeMatch = function () {
        var newDataList=[];
        $scope.selectedAll = false;
        angular.forEach($scope.settings.messages.replaceText, function(selected){
            if(!selected.selected){
                newDataList.push(selected);
            }
            else {
              console.log('Deleting key '+selected.name);
            }
        });
        $scope.settings.messages.replaceText = newDataList;
      };
      
      var ConfirmController = function($scope, $uibModalInstance) {
        $scope.confirmDelete = function() {
          $uibModalInstance.close();
        };
        $scope.cancelDelete = function() {
          $uibModalInstance.dismiss('cancel');
        };
      };
    }])
    
    .controller('AdminController', ['$scope', '$routeParams', 'Api', function ($scope, $routeParams, Api) {
      $scope.page = 'admin';
    }])
    
    // Routes
    .config(['$routeProvider', '$locationProvider', '$httpProvider', function ($routeProvider, $locationProvider, $httpProvider) {
      $routeProvider
        .when('/', {
          templateUrl: '/templates/admin/admin.html',
          controller: 'AdminController'
        })
        .when('/aliases', {
          templateUrl: '/templates/admin/aliases.html',
          controller: 'AliasController'
        })
        .when('/settings', {
          templateUrl: '/templates/admin/settings.html',
          controller: 'SettingsController'
        })
        .when('/reset', {
          templateUrl: '/templates/admin/reset.html',
          controller: 'ResetController'
        })
        .when('/aliases/:id', {
          templateUrl: '/templates/admin/aliasDetails.html',
          controller: 'AliasDetailCtrl'
       });
      $httpProvider.defaults.headers.delete = { "Content-Type": "application/json;charset=utf-8" };
      $httpProvider.interceptors.push(function($q, $location) {
        return {
          response: function(response) {
            return response;
          },
          responseError: function(response) {
            if (response.status === 401)
              $location.absUrl('/login');
            return $q.reject(response);
          }
        };
      });
      $locationProvider.html5Mode({ enabled: true, requireBase: false, rewriteLinks: true});
    }]);