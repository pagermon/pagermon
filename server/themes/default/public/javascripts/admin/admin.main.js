angular.module('app', ['ngRoute', 'ngResource', 'ngSanitize', 'angular-uuid', 'ui.bootstrap', 'color.picker', 'ui.validate', 'textAngular', 'ngFileSaver', 'angular-sortable-view'])
    // Service
    .factory('Api', ['$resource',
     function($resource) {
      return {
        Aliases: $resource('/api/capcodes/', null, {
          'delete': { method:'DELETE', hasBody: true }
        }),
        AliasDetail: $resource('/api/capcodes/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false },
          'delete': { method: 'DELETE', isArray: false}
        }),
        Settings: $resource('/admin/settingsData', null, {
          'post': { method:'POST', isArray: false }
        }),
        AliasDupeCheck: $resource('/api/capcodeCheck/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
        AliasRefresh: $resource('/api/capcodeRefresh', null, {
          'post': { method:'POST', isArray: false }
        }),
        AliasExport: $resource('/api/capcodeExport', null, {
          'post': { method:'POST', isArray: false }
        }),
        AliasImport: $resource('/api/capcodeImport', null, {
          'post': { method:'POST', isArray: false }
        }),
        Users: $resource('/api/user', null, {
        }),
        UserDetail: $resource('/api/user/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
        UsernameCheck: $resource('/api/userCheck/username/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
        UseremailCheck: $resource('/api/userCheck/email/:id', {id: '@id'}, {
          'post': { method:'POST', isArray: false }
        }),
      };
    }])

    // Controller
    .controller('AliasController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', 'FileSaver', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout, FileSaver) {
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
          $scope.alertMessage.text = 'Error refreshing aliases: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
          $scope.loading = false;
        });
      };

      $scope.aliasExport = function () {
        $scope.loading = true;
        $scope.alertMessage = {};
        Api.AliasExport.post(null, null).$promise.then(function (response) {
          console.log(response);
          $scope.loading = false;
          if (response.data) {
            var blob = new Blob([response.data], {type: "text/csv;charset=utf-8"});
            FileSaver.saveAs(blob, "export.csv");
            $scope.alertMessage.text = 'Alias export complete!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () {
              $scope.alertMessage.show = false;
            }, 3000);
          } else {
            $scope.alertMessage.text = 'Error exporting aliases: ' + response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () {
              $scope.alertMessage.show = false;
            }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error exporting aliases: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
          $scope.loading = false;
        });
      };

      $scope.aliasImport = function () {
        var modalHtml = '<div class="modal-header"><h5 class="modal-title" id="modal-title">Impot Aliases</h5></div>';
        var messages = `<p>Available Columns: address, alias, agency, color, icon, ignore, pluginconf</p>
                        <p>Required columns are "address" and "alias", all others are optional.</p>`;
        modalHtml += '<div class="modal-body"><p><input type="file" id="importcsv"/></p><p>CSV file to be imported</p>' + messages + '</div>';
        modalHtml += '<div class="modal-footer"><button class="btn btn-success" ng-click="confirmImport()">Import</button><button class="btn btn-danger" ng-click="cancelImport()">Cancel</button></div>';
        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ImportController,

        });
        modalInstance.result.then(function () {
          $scope.aliasImportConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };

      $scope.aliasImportConfirmed = function () {
        $scope.loading = true;
        var filename = document.getElementById("importcsv");
        if (filename.value.length < 1) {
          // noidea i stole this code.
        } else {
          var file = filename.files[0];
          console.log(file)
          var fileSize = 0;
          if (filename.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
              var rows = e.target.result.split("\n");
              Api.AliasImport.post(rows).$promise.then(function (response) {
                console.log(response)
                $scope.loading = false;
                $scope.results = response.results
                var resultModalHtml = '<div class="modal-header"><h5 class="modal-title" id="modal-title">Import Results</h5></div>';
                resultModalHtml += `<div class="modal-body">  
                    <table class="table table-striped">
                       <thead>
                       <tr>
                          <th>Address</th>
                          <th>Alias</th>
                          <th>Result</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr ng-repeat="result in results">
                          <td>{{ result.address }}</td>
                          <td>{{ result.alias }}</td>
                          <td>{{ result.result }}</td>
                        </tr>
                        </tbody>
                      </table>
                      </div>`
                resultModalHtml += '<div class="modal-footer"><button class="btn btn-success" ng-click="okImport()">OK</button></div>';
                var modalInstance = $uibModal.open({
                  template: resultModalHtml,
                  controller: ImportController,
                  scope: $scope
                });

              }, function (response) {
                $scope.loading = false;
                console.log(response)
                var resultModalHtml = '<div class="modal-header"><h5 class="modal-title" id="modal-title">Import Failed</h5></div>';
                resultModalHtml += `<div class="modal-body">  
                    <p>Failed to Parse CSV file, please check the file and try again!</p>
                    `
                resultModalHtml += '<div class="modal-footer"><button class="btn btn-success" ng-click="okfailedImport()">OK</button></div>';
                var modalInstance = $uibModal.open({
                  template: resultModalHtml,
                  controller: ImportController,
                  scope: $scope
                });
              })
            }
            reader.readAsText(filename.files[0]);
          }
          return false; //no idea what this does, was also in the code i stole and it doesn't work without it.
        }
      };

      $scope.aliasDetail = function (alias_id) {
        $location.url('/aliases/' + alias_id);
      };

      $scope.aliasMessages = function (alias_id) {
        $location.url('../../?alias=' + alias_id);
      }

      $scope.aliasSelected = function () {
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
          $scope.alertMessage.text = 'Error deleting alias: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
          $scope.loading = false;
        });
      };

      var ConfirmController = function ($scope, $uibModalInstance) {
        $scope.confirmDelete = function () {
          $uibModalInstance.close();
        };

        $scope.cancelDelete = function () {
          $uibModalInstance.dismiss('cancel');
        };
      };

      var ImportController = function ($scope, $uibModalInstance) {
        $scope.confirmImport = function () {
          $uibModalInstance.close();
        };
        $scope.cancelImport = function () {
          $uibModalInstance.dismiss('cancel');
        };
        $scope.okImport = function () {
          $uibModalInstance.close();
          $scope.aliasRefreshRequired = 1
          $scope.alertMessage.text = 'Alias refresh required!';
          $scope.alertMessage.type = 'alert-warning';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $location.url('/aliases/');
        }
        $scope.okfailedImport = function () {
          $uibModalInstance.close();
        }
      };
    }])

    .controller('UserController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', 'FileSaver', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout, FileSaver) {
      $scope.loading = true;
      $scope.alertMessage = {};
      Api.Users.query(null, function(results) {
        $scope.users = results;
        $scope.page = 'users';
        $scope.loading = false;
      });
      
      $scope.userDetail = function(id) {
          $location.url('/users/'+id);
      };
 
     $scope.userSelected = function() {
        if ($scope.users) {
          var trues = $filter("filter")($scope.users, {
              selected: true
          });
          return trues.length;
        }
      };
      
      $scope.userDelete = function () {
        var numSelected = $scope.userSelected();
        var modalHtml =  '<div class="modal-header"><h5 class="modal-title" id="modal-title">Delete Users</h5></div>';
        var message   =  '<p>Are you sure you want to delete these users?</p><p>Users cannot be restored after saving.</p><p><strong>'+numSelected+' users selected for deletion.</strong></p>';
            modalHtml += '<div class="modal-body">' + message + '</div>';
            modalHtml += '<div class="modal-footer"><button class="btn btn-danger" ng-click="confirmDelete()">OK</button><button class="btn btn-primary" ng-click="cancelDelete()">Cancel</button></div>';
 
        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ConfirmController
        });
    
        modalInstance.result.then(function() {
          $scope.userDeleteConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };
      
      $scope.userDeleteConfirmed = function () {
        var deleteList = [];
        $scope.loading = true;
        $scope.selectedAll = false;
        angular.forEach($scope.users, function (selected) {
          if (selected.selected) {
            if (selected.id != 1) {
              deleteList.push(selected.id);
            }
          }
        });
        var data = {'deleteList': deleteList};
        console.log(data);
        Api.UserDetail.post({id: 'deleteMultiple' }, data).$promise.then(function (response) {
          console.log(response);
          $scope.loading = false;
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'Users deleted!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.aliasRefreshRequired = 1;
            $location.url('/users/');
          } else {
            $scope.alertMessage.text = 'Error deleting users: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error deleting users: '+response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $scope.loading = false;          
        });
      };
      
      var ConfirmController = function ($scope, $uibModalInstance) {
        $scope.confirmDelete = function () {
          $uibModalInstance.close();
        };

        $scope.cancelDelete = function () {
          $uibModalInstance.dismiss('cancel');
        };
      };
    }])

    .controller('UserDetailController', ['$scope', '$routeParams', 'Api', '$uibModal', '$filter', '$location', '$timeout', function ($scope, $routeParams, Api, $uibModal, $filter, $location, $timeout) {
      $scope.page = 'userDetail';
      $scope.alertMessage = {};

      // controls the form validation on the username field
      $scope.checkUsername = function() {
        $scope.userLoading = true;
        if ($scope.user.username) {
          Api.UsernameCheck.get({id: $scope.user.username }, function(results) {
            if (results.username) {
              $scope.userLoading = false;
              if (results.username == $scope.user.originalUsername) {
                $scope.existingUser = false;
                return false;
              } else {
                $scope.existingID = results.id;
                $scope.existingUsername = true;
                return true;
              }
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

      $scope.checkEmail = function() {
        $scope.userLoading = true;
        if ($scope.user.email) {
          Api.UseremailCheck.get({id: $scope.user.email }, function(results) {
            if (results.email) {
              $scope.userLoading = false;
              if (results.email == $scope.user.originalEmail) {
                $scope.existingEmail= false;
                return false;
              } else {
                $scope.existingID = results.id;
                $scope.existingEmail = true;
                return true;
              }
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

      $scope.userSubmit = function() {
        if ($scope.existingUsername) {
          $scope.alertMessage.text = 'Error saving user: User with this address already exists.';
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
        } else if ($scope.existingEmail) {
          $scope.alertMessage.text = 'Error saving user: User with this email already exists.';
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
        } else {
          $scope.loading = true;
          var id;
          if ($scope.user.id) {
            id = $routeParams.id;
          } else {
            id = "new";
          }
          Api.UserDetail.save({ id: id }, $scope.user).$promise.then(function (response) {
            console.log(response);
            if (response.status == 'ok') {
              $scope.alertMessage.text = 'User saved!';
              $scope.alertMessage.type = 'alert-success';
              $scope.alertMessage.show = true;
              $timeout(function () { $scope.alertMessage.show = false; }, 3000);
              $scope.loading = false;
              if ($scope.isNew) {
                $location.url('/users/' + response.id);
              }
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
        }
      };
      
      $scope.userDelete = function () {
        var modalHtml =  '<div class="modal-header"><h5 class="modal-title" id="modal-title">Delete User</h5></div>';
            modalHtml += '<div class="modal-body"><p>Are you sure you want to delete this user?</p><p>Users cannot be restored after deletion.</p></div>';
            modalHtml += '<div class="modal-footer"><button class="btn btn-danger" ng-click="confirmDelete()">OK</button><button class="btn btn-primary" ng-click="cancelDelete()">Cancel</button></div>';
        var modalInstance = $uibModal.open({
          template: modalHtml,
          controller: ConfirmController
        });
        modalInstance.result.then(function() {
          $scope.userDeleteConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };
      
      $scope.userDeleteConfirmed = function () {
        console.log('Deleting user '+$scope.user.username);
        $scope.loading = true;
        Api.UserDetail.delete({id: $routeParams.id }, $scope.user).$promise.then(function (response) {
          console.log(response);
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'User deleted!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
            $location.url('/users/');
          } else {
            $scope.alertMessage.text = 'Error deleting user: '+response.data.error;
            $scope.alertMessage.type = 'alert-danger';
            $scope.alertMessage.show = true;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
          }
        }, function(response) {
          console.log(response);
          $scope.alertMessage.text = 'Error deleting user: '+response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () { $scope.alertMessage.show = false; }, 3000);
          $scope.loading = false;          
        });
      };

      $scope.userReset = function () {
        var resetModalHtml = '<div class="modal-header"><h5 class="modal-title" id="modal-title">Password Reset</h5></div>';
        resetModalHtml += `<div class="modal-body">  
                <div class="row" style="padding-top: 10px">
                <div class="col-xs-12">
                  <div class="col-xs-12 col-md-offset-2 col-md-8">
                    <form name="form">
                      <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" class="form-control" id="user.password" name="user.newpassword" ng-model="user.newpassword" autofocus=true
                          required>
                      </div>
                      <div class="form-group">
                        <label for="confirm_password">Confirm Password:</label>
                        <input type="password" class="form-control" id="confirm_password" name="confirm_password"
                          ng-model="confirm_password" required ui-validate=" '$value==user.newpassword' " ui-validate-watch=" 'user.newpassword' ">
                        <span class="text-danger" ng-show='form.confirm_password.$error.validator'>Passwords do not match!</span>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              </div>`
        resetModalHtml += '<button ng-disabled="form.confirm_password.$error.validator" ng-click="confirmReset()" class="btn btn-default">Ok</button><button class="btn btn-primary" ng-click="cancelReset()">Cancel</button></div>';


        var modalInstance = $uibModal.open({
          template: resetModalHtml,
          controller: ConfirmController,
          scope: $scope,
        });
    
        modalInstance.result.then(function(result) {
          $scope.userResetConfirmed();
        }, function () {
          //$log.info('Modal dismissed at: ' + new Date());
        });
      };

      $scope.userResetConfirmed = function () {
        var id = $routeParams.id
        Api.UserDetail.save({ id: id }, $scope.user).$promise.then(function (response) {
          console.log(response);
          if (response.status == 'ok') {
            $scope.alertMessage.text = 'User saved!';
            $scope.alertMessage.type = 'alert-success';
            $scope.alertMessage.show = true;
            $scope.user.newpassword = null;
            $timeout(function () { $scope.alertMessage.show = false; }, 3000);
            $scope.loading = false;
            if ($scope.isNew) {
              $location.url('/users/' + response.id);
            }
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
      }
      
      var ConfirmController = function($scope, $uibModalInstance) {
        $scope.confirmDelete = function() {
          $uibModalInstance.close();
        };
        $scope.cancelDelete = function() {
          $uibModalInstance.dismiss('cancel');
        };
        $scope.confirmReset = function () {
          $uibModalInstance.close();
        };
        $scope.cancelReset = function() {
          $uibModalInstance.dismiss('cancel');
        };
      };
      
      // get data on load
      $scope.loading = true;
      Api.UserDetail.get({ id: $routeParams.id }, function (results) {
        $scope.user = results;
        $scope.userLoading = false;
        $scope.existingUsername = false;
        $scope.existingEmail = false;
        $scope.loading = false;

        if (results.username) {
          $scope.user.originalUsername = results.username;
          $scope.user.originalEmail = results.email;
          $scope.isNew = false;
          $scope.user.lastlogondate = new Date(results.lastlogondate).toLocaleString()
          console.log(results)
        } else {
          $scope.user.username = $routeParams.username || '';
          $scope.user.originalUsername = $routeParams.username || '';
          $scope.isNew = true;
          console.log(results);
        }
      });
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
          $scope.alertMessage.text = 'Error refreshing aliases: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
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
          $scope.alertMessage.text = 'Error deleting alias: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
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
          $scope.themes = results.themes;
        }
        $scope.aliasLoad();
      });
	  //FontAwesome v5 Icons for Helper
	  $scope.faIcons = ["ad","address-book","address-card","adjust","air-freshener","align-center","align-justify","align-left","align-right","allergies","ambulance","american-sign-language-interpreting","anchor","angle-double-down","angle-double-left","angle-double-right","angle-double-up","angle-down","angle-left","angle-right","angle-up","angry","ankh","apple-alt","archive","archway","arrow-alt-circle-down","arrow-alt-circle-left","arrow-alt-circle-right","arrow-alt-circle-up","arrow-circle-down","arrow-circle-left","arrow-circle-right","arrow-circle-up","arrow-down","arrow-left","arrow-right","arrow-up","arrows-alt","arrows-alt-h","arrows-alt-v","assistive-listening-systems","asterisk","at","atlas","atom","audio-description","award","baby","baby-carriage","backspace","backward","bacon","bacteria","bacterium","bahai","balance-scale","balance-scale-left","balance-scale-right","ban","band-aid","barcode","bars","baseball-ball","basketball-ball","bath","battery-empty","battery-full","battery-half","battery-quarter","battery-three-quarters","bed","beer","bell","bell-slash","bezier-curve","bible","bicycle","biking","binoculars","biohazard","birthday-cake","blender","blender-phone","blind","blog","bold","bolt","bomb","bone","bong","book","book-dead","book-medical","book-open","book-reader","bookmark","border-all","border-none","border-style","bowling-ball","box","box-open","box-tissue","boxes","braille","brain","bread-slice","briefcase","briefcase-medical","broadcast-tower","broom","brush","bug","building","bullhorn","bullseye","burn","bus","bus-alt","business-time","calculator","calendar","calendar-alt","calendar-check","calendar-day","calendar-minus","calendar-plus","calendar-times","calendar-week","camera","camera-retro","campground","candy-cane","cannabis","capsules","car","car-alt","car-battery","car-crash","car-side","caravan","caret-down","caret-left","caret-right","caret-square-down","caret-square-left","caret-square-right","caret-square-up","caret-up","carrot","cart-arrow-down","cart-plus","cash-register","cat","certificate","chair","chalkboard","chalkboard-teacher","charging-station","chart-area","chart-bar","chart-line","chart-pie","check","check-circle","check-double","check-square","cheese","chess","chess-bishop","chess-board","chess-king","chess-knight","chess-pawn","chess-queen","chess-rook","chevron-circle-down","chevron-circle-left","chevron-circle-right","chevron-circle-up","chevron-down","chevron-left","chevron-right","chevron-up","child","church","circle","circle-notch","city","clinic-medical","clipboard","clipboard-check","clipboard-list","clock","clone","closed-captioning","cloud","cloud-download-alt","cloud-meatball","cloud-moon","cloud-moon-rain","cloud-rain","cloud-showers-heavy","cloud-sun","cloud-sun-rain","cloud-upload-alt","cocktail","code","code-branch","coffee","cog","cogs","coins","columns","comment","comment-alt","comment-dollar","comment-dots","comment-medical","comment-slash","comments","comments-dollar","compact-disc","compass","compress","compress-alt","compress-arrows-alt","concierge-bell","cookie","cookie-bite","copy","copyright","couch","credit-card","crop","crop-alt","cross","crosshairs","crow","crown","crutch","cube","cubes","cut","database","deaf","democrat","desktop","dharmachakra","diagnoses","dice","dice-d20","dice-d6","dice-five","dice-four","dice-one","dice-six","dice-three","dice-two","digital-tachograph","directions","disease","divide","dizzy","dna","dog","dollar-sign","dolly","dolly-flatbed","donate","door-closed","door-open","dot-circle","dove","download","drafting-compass","dragon","draw-polygon","drum","drum-steelpan","drumstick-bite","dumbbell","dumpster","dumpster-fire","dungeon","edit","egg","eject","ellipsis-h","ellipsis-v","envelope","envelope-open","envelope-open-text","envelope-square","equals","eraser","ethernet","euro-sign","exchange-alt","exclamation","exclamation-circle","exclamation-triangle","expand","expand-alt","expand-arrows-alt","external-link-alt","external-link-square-alt","eye","eye-dropper","eye-slash","fan","fast-backward","fast-forward","faucet","fax","feather","feather-alt","female","fighter-jet","file","file-alt","file-archive","file-audio","file-code","file-contract","file-csv","file-download","file-excel","file-export","file-image","file-import","file-invoice","file-invoice-dollar","file-medical","file-medical-alt","file-pdf","file-powerpoint","file-prescription","file-signature","file-upload","file-video","file-word","fill","fill-drip","film","filter","fingerprint","fire","fire-alt","fire-extinguisher","first-aid","fish","fist-raised","flag","flag-checkered","flag-usa","flask","flushed","folder","folder-minus","folder-open","folder-plus","font","football-ball","forward","frog","frown","frown-open","funnel-dollar","futbol","gamepad","gas-pump","gavel","gem","genderless","ghost","gift","gifts","glass-cheers","glass-martini","glass-martini-alt","glass-whiskey","glasses","globe","globe-africa","globe-americas","globe-asia","globe-europe","golf-ball","gopuram","graduation-cap","greater-than","greater-than-equal","grimace","grin","grin-alt","grin-beam","grin-beam-sweat","grin-hearts","grin-squint","grin-squint-tears","grin-stars","grin-tears","grin-tongue","grin-tongue-squint","grin-tongue-wink","grin-wink","grip-horizontal","grip-lines","grip-lines-vertical","grip-vertical","guitar","h-square","hamburger","hammer","hamsa","hand-holding","hand-holding-heart","hand-holding-medical","hand-holding-usd","hand-holding-water","hand-lizard","hand-middle-finger","hand-paper","hand-peace","hand-point-down","hand-point-left","hand-point-right","hand-point-up","hand-pointer","hand-rock","hand-scissors","hand-sparkles","hand-spock","hands","hands-helping","hands-wash","handshake","handshake-alt-slash","handshake-slash","hanukiah","hard-hat","hashtag","hat-cowboy","hat-cowboy-side","hat-wizard","hdd","head-side-cough","head-side-cough-slash","head-side-mask","head-side-virus","heading","headphones","headphones-alt","headset","heart","heart-broken","heartbeat","helicopter","highlighter","hiking","hippo","history","hockey-puck","holly-berry","home","horse","horse-head","hospital","hospital-alt","hospital-symbol","hospital-user","hot-tub","hotdog","hotel","hourglass","hourglass-end","hourglass-half","hourglass-start","house-damage","house-user","hryvnia","i-cursor","ice-cream","icicles","icons","id-badge","id-card","id-card-alt","igloo","image","images","inbox","indent","industry","infinity","info","info-circle","italic","jedi","joint","journal-whills","kaaba","key","keyboard","khanda","kiss","kiss-beam","kiss-wink-heart","kiwi-bird","landmark","language","laptop","laptop-code","laptop-house","laptop-medical","laugh","laugh-beam","laugh-squint","laugh-wink","layer-group","leaf","lemon","less-than","less-than-equal","level-down-alt","level-up-alt","life-ring","lightbulb","link","lira-sign","list","list-alt","list-ol","list-ul","location-arrow","lock","lock-open","long-arrow-alt-down","long-arrow-alt-left","long-arrow-alt-right","long-arrow-alt-up","low-vision","luggage-cart","lungs","lungs-virus","magic","magnet","mail-bulk","male","map","map-marked","map-marked-alt","map-marker","map-marker-alt","map-pin","map-signs","marker","mars","mars-double","mars-stroke","mars-stroke-h","mars-stroke-v","mask","medal","medkit","meh","meh-blank","meh-rolling-eyes","memory","menorah","mercury","meteor","microchip","microphone","microphone-alt","microphone-alt-slash","microphone-slash","microscope","minus","minus-circle","minus-square","mitten","mobile","mobile-alt","money-bill","money-bill-alt","money-bill-wave","money-bill-wave-alt","money-check","money-check-alt","monument","moon","mortar-pestle","mosque","motorcycle","mountain","mouse","mouse-pointer","mug-hot","music","network-wired","neuter","newspaper","not-equal","notes-medical","object-group","object-ungroup","oil-can","om","otter","outdent","pager","paint-brush","paint-roller","palette","pallet","paper-plane","paperclip","parachute-box","paragraph","parking","passport","pastafarianism","paste","pause","pause-circle","paw","peace","pen","pen-alt","pen-fancy","pen-nib","pen-square","pencil-alt","pencil-ruler","people-arrows","people-carry","pepper-hot","percent","percentage","person-booth","phone","phone-alt","phone-slash","phone-square","phone-square-alt","phone-volume","photo-video","piggy-bank","pills","pizza-slice","place-of-worship","plane","plane-arrival","plane-departure","plane-slash","play","play-circle","plug","plus","plus-circle","plus-square","podcast","poll","poll-h","poo","poo-storm","poop","portrait","pound-sign","power-off","pray","praying-hands","prescription","prescription-bottle","prescription-bottle-alt","print","procedures","project-diagram","pump-medical","pump-soap","puzzle-piece","qrcode","question","question-circle","quidditch","quote-left","quote-right","quran","radiation","radiation-alt","rainbow","random","receipt","record-vinyl","recycle","redo","redo-alt","registered","remove-format","reply","reply-all","republican","restroom","retweet","ribbon","ring","road","robot","rocket","route","rss","rss-square","ruble-sign","ruler","ruler-combined","ruler-horizontal","ruler-vertical","running","rupee-sign","sad-cry","sad-tear","satellite","satellite-dish","save","school","screwdriver","scroll","sd-card","search","search-dollar","search-location","search-minus","search-plus","seedling","server","shapes","share","share-alt","share-alt-square","share-square","shekel-sign","shield-alt","shield-virus","ship","shipping-fast","shoe-prints","shopping-bag","shopping-basket","shopping-cart","shower","shuttle-van","sign","sign-in-alt","sign-language","sign-out-alt","signal","signature","sim-card","sink","sitemap","skating","skiing","skiing-nordic","skull","skull-crossbones","slash","sleigh","sliders-h","smile","smile-beam","smile-wink","smog","smoking","smoking-ban","sms","snowboarding","snowflake","snowman","snowplow","soap","socks","solar-panel","sort","sort-alpha-down","sort-alpha-down-alt","sort-alpha-up","sort-alpha-up-alt","sort-amount-down","sort-amount-down-alt","sort-amount-up","sort-amount-up-alt","sort-down","sort-numeric-down","sort-numeric-down-alt","sort-numeric-up","sort-numeric-up-alt","sort-up","spa","space-shuttle","spell-check","spider","spinner","splotch","spray-can","square","square-full","square-root-alt","stamp","star","star-and-crescent","star-half","star-half-alt","star-of-david","star-of-life","step-backward","step-forward","stethoscope","sticky-note","stop","stop-circle","stopwatch","stopwatch-20","store","store-alt","store-alt-slash","store-slash","stream","street-view","strikethrough","stroopwafel","subscript","subway","suitcase","suitcase-rolling","sun","superscript","surprise","swatchbook","swimmer","swimming-pool","synagogue","sync","sync-alt","syringe","table","table-tennis","tablet","tablet-alt","tablets","tachometer-alt","tag","tags","tape","tasks","taxi","teeth","teeth-open","temperature-high","temperature-low","tenge","terminal","text-height","text-width","th","th-large","th-list","theater-masks","thermometer","thermometer-empty","thermometer-full","thermometer-half","thermometer-quarter","thermometer-three-quarters","thumbs-down","thumbs-up","thumbtack","ticket-alt","times","times-circle","tint","tint-slash","tired","toggle-off","toggle-on","toilet","toilet-paper","toilet-paper-slash","toolbox","tools","tooth","torah","torii-gate","tractor","trademark","traffic-light","trailer","train","tram","transgender","transgender-alt","trash","trash-alt","trash-restore","trash-restore-alt","tree","trophy","truck","truck-loading","truck-monster","truck-moving","truck-pickup","tshirt","tty","tv","umbrella","umbrella-beach","underline","undo","undo-alt","universal-access","university","unlink","unlock","unlock-alt","upload","user","user-alt","user-alt-slash","user-astronaut","user-check","user-circle","user-clock","user-cog","user-edit","user-friends","user-graduate","user-injured","user-lock","user-md","user-minus","user-ninja","user-nurse","user-plus","user-secret","user-shield","user-slash","user-tag","user-tie","user-times","users","users-cog","users-slash","utensil-spoon","utensils","vector-square","venus","venus-double","venus-mars","vest","vest-patches","vial","vials","video","video-slash","vihara","virus","virus-slash","viruses","voicemail","volleyball-ball","volume-down","volume-mute","volume-off","volume-up","vote-yea","vr-cardboard","walking","wallet","warehouse","water","wave-square","weight","weight-hanging","wheelchair","wifi","wind","window-close","window-maximize","window-minimize","window-restore","wine-bottle","wine-glass","wine-glass-alt","won-sign","wrench","x-ray","yen-sign","yin-yang"];
    }])
 
    // needs cleanup
    .controller('SettingsController', ['$scope', '$routeParams', 'Api', 'uuid', '$uibModal', '$filter', '$timeout', '$sanitize', function ($scope, $routeParams, Api, uuid, $uibModal, $filter, $timeout, $sanitize) {
      $scope.alertMessage = {};
      Api.Settings.get(null, function(results) {
        if (!results.settings.messages.replaceText)
          results.settings.messages.replaceText = [{}];
        if (!results.settings.aliases)
          results.settings.aliases = {};
        if (!results.settings.aliases.templates)
          results.settings.aliases.templates = [{}];
        if (!results.settings.auth.keys)
          results.settings.auth.keys = [{}];
        $scope.settings = results.settings;
        $scope.plugins = results.plugins;
        $scope.themes = results.themes;
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
          $scope.alertMessage.text = 'Error saving settings: ' + response.data.error;
          $scope.alertMessage.type = 'alert-danger';
          $scope.alertMessage.show = true;
          $timeout(function () {
            $scope.alertMessage.show = false;
          }, 3000);
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

      $scope.addTemplate = function () {
        $scope.settings.aliases.templates.push({
          'name': "",
          'agency': "",
          'icon': "",
          'color': ""
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

      $scope.templateSelected = function() {
        if ($scope.settings && $scope.settings.aliases) {
          var trues = $filter("filter")($scope.settings.aliases.templates, {
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

      $scope.removeTemplate = function () {
        var newDataList=[];
        $scope.selectedAll = false;
        angular.forEach($scope.settings.aliases.templates, function(selected){
            if(!selected.selected){
                newDataList.push(selected);
            }
            else {
              console.log('Deleting key '+selected.name);
            }
        });
        $scope.settings.aliases.templates = newDataList;
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
        .when('/users', {
          templateUrl: '/templates/admin/users.html',
          controller: 'UserController'
        })
        .when('/users/:id', {
          templateUrl: '/templates/admin/userDetails.html',
          controller: 'UserDetailController'
        })
        .when('/settings', {
          templateUrl: '/templates/admin/settings.html',
          controller: 'SettingsController'
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
