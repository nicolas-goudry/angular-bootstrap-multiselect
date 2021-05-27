"use strict";

(function () {
  var multiselect = angular.module('btorfs.multiselect', ['btorfs.multiselect.templates']);

  multiselect.getRecursiveProperty = function (object, path) {
    return path.split('.').reduce(function (obj, x) {
      if (obj) {
        return obj[x];
      }

      return null;
    }, object);
  };

  multiselect.directive('multiselect', ['$filter', '$document', '$log', function ($filter, $document, $log) {
    return {
      restrict: 'AE',
      scope: {
        options: '=',
        displayProp: '@',
        idProp: '@',
        searchLimit: '=?',
        selectionLimit: '=?',
        showSelectAll: '=?',
        showUnselectAll: '=?',
        showSearch: '=?',
        searchFilter: '=?',
        disabled: '=?ngDisabled',
        labels: '=?',
        classesBtn: '=?',
        showTooltip: '=?',
        placeholder: '@?'
      },
      require: 'ngModel',
      templateUrl: 'multiselect.html',
      controller: ['$scope', function ($scope) {
        if (angular.isUndefined($scope.classesBtn)) {
          $scope.classesBtn = ['btn-block', 'btn-default'];
        }
      }],
      link: {
        post: function post($scope, $element, $attrs, $ngModelCtrl) {
          $scope.selectionLimit = $scope.selectionLimit || 0;
          $scope.searchLimit = $scope.searchLimit || 25;
          $scope.searchFilter = '';
          $scope.resolvedOptions = [];

          if (typeof $scope.options !== 'function') {
            $scope.resolvedOptions = $scope.options;
          }

          if (typeof $attrs.disabled !== 'undefined') {
            $scope.disabled = true;
          }

          var closeHandler = function closeHandler(event) {
            if (!$element[0].contains(event.target)) {
              $scope.$apply(function () {
                $scope.open = false;
              });
            }
          };

          $document.on('click', closeHandler);

          var updateSelectionLists = function updateSelectionLists() {
            if (!$scope.resolvedOptions && !$scope.options) {
              return;
            }

            if (!$ngModelCtrl.$viewValue) {
              if ($scope.selectedOptions) {
                $scope.selectedOptions = [];
              }

              $scope.unselectedOptions = ($scope.resolvedOptions || $scope.options).slice(); // Take a copy
            } else {
              $scope.selectedOptions = ($scope.resolvedOptions || $scope.options).filter(function (el) {
                var id = $scope.getId(el);

                for (var i = 0; i < $ngModelCtrl.$viewValue.length; i++) {
                  var selectedId = $scope.getId($ngModelCtrl.$viewValue[i]);

                  if (id === selectedId) {
                    return true;
                  }
                }

                return false;
              });
              $scope.unselectedOptions = ($scope.resolvedOptions || $scope.options).filter(function (el) {
                return $scope.selectedOptions.indexOf(el) < 0;
              });
            }

            $scope.getButtonText();
          };

          $scope.toggleDropdown = function () {
            $scope.open = !$scope.open;
            $scope.resolvedOptions = $scope.options;
            updateSelectionLists();
          };

          $ngModelCtrl.$render = function () {
            updateSelectionLists();
          };

          $ngModelCtrl.$viewChangeListeners.push(function () {
            updateSelectionLists();
          });

          $ngModelCtrl.$isEmpty = function (value) {
            if (value) {
              return value.length === 0;
            }

            return true;
          };

          var watcher = $scope.$watch('selectedOptions', function () {
            var selecteds = angular.copy($scope.selectedOptions);

            if (selecteds) {
              if ($scope.idProp) {
                $ngModelCtrl.$setViewValue(selecteds && selecteds.map(function (elem) {
                  return elem[$scope.idProp];
                }));
              } else {
                $ngModelCtrl.$setViewValue(selecteds);
              }
            }
          }, true);
          $scope.$on('$destroy', function () {
            $document.off('click', closeHandler);

            if (watcher) {
              watcher(); // Clean watcher
            }
          });

          $scope.getButtonText = function () {
            if ($scope.selectedOptions && $scope.selectedOptions.length === 1) {
              $scope.buttonText = $scope.getDisplay($scope.selectedOptions[0]);
            } else if ($scope.selectedOptions && $scope.selectedOptions.length > 1) {
              var totalSelected = angular.isDefined($scope.selectedOptions) ? $scope.selectedOptions.length : 0;

              if (totalSelected === 0) {
                $scope.buttonText = $scope.labels && $scope.labels.select ? $scope.labels.select : 'Select';
              } else {
                $scope.buttonText = "".concat(totalSelected, " ").concat($scope.labels && $scope.labels.itemsSelected ? $scope.labels.itemsSelected : 'selected');
              }
            } else {
              $scope.buttonText = $scope.labels && $scope.labels.select ? $scope.labels.select : 'Select';
            }
          };

          $scope.selectAll = function () {
            $scope.selectedOptions = $scope.resolvedOptions.slice().filter(function (el) {
              return $scope.getId(el) !== '';
            }); // Take a copy;

            $scope.unselectedOptions = [];
          };

          $scope.unselectAll = function () {
            $scope.selectedOptions = [];
            $scope.unselectedOptions = $scope.resolvedOptions.slice(); // Take a copy;
          };

          $scope.toggleItem = function (item) {
            if (typeof $scope.selectedOptions === 'undefined') {
              $scope.selectedOptions = [];
            }

            var selectedIndex = $scope.selectedOptions.indexOf(item);
            var currentlySelected = selectedIndex !== -1;

            if (currentlySelected) {
              $scope.unselectedOptions.push($scope.selectedOptions[selectedIndex]);
              $scope.selectedOptions.splice(selectedIndex, 1);
            } else if (!currentlySelected && ($scope.selectionLimit === 0 || $scope.selectedOptions.length < $scope.selectionLimit)) {
              var unselectedIndex = $scope.unselectedOptions.indexOf(item);
              $scope.unselectedOptions.splice(unselectedIndex, 1);
              $scope.selectedOptions.push(item);
            }
          };

          $scope.getId = function (item) {
            if (angular.isString(item)) {
              return item;
            } else if (angular.isObject(item)) {
              if ($scope.idProp) {
                return multiselect.getRecursiveProperty(item, $scope.idProp);
              }

              $log.error('Multiselect: when using objects as model, a idProp value is mandatory.');
              return '';
            }

            return item;
          };

          $scope.getDisplay = function (item) {
            if (angular.isString(item)) {
              return item;
            } else if (angular.isObject(item)) {
              if ($scope.displayProp) {
                return multiselect.getRecursiveProperty(item, $scope.displayProp);
              }

              $log.error('Multiselect: when using objects as model, a displayProp value is mandatory.');
              return '';
            }

            return item;
          };

          $scope.isSelected = function (item) {
            if (!$scope.selectedOptions) {
              return false;
            }

            var itemId = $scope.getId(item);

            for (var i = 0; i < $scope.selectedOptions.length; i++) {
              var selectedElement = $scope.selectedOptions[i];

              if ($scope.getId(selectedElement) === itemId) {
                return true;
              }
            }

            return false;
          };

          $scope.updateOptions = function () {
            if (typeof $scope.options === 'function') {
              $scope.options().then(function (resolvedOptions) {
                $scope.resolvedOptions = resolvedOptions;
                updateSelectionLists();
              });
            }
          }; // This search function is optimized to take into account the search limit.
          // Using angular limitTo filter is not efficient for big lists, because it still runs the search for
          // all elements, even if the limit is reached


          $scope.search = function () {
            var counter = 0;
            return function (item) {
              if (counter > $scope.searchLimit) {
                return false;
              }

              var displayName = $scope.getDisplay(item);

              if (displayName) {
                var result = displayName.toLowerCase().indexOf($scope.searchFilter.toLowerCase()) > -1;

                if (result) {
                  counter += 1;
                }

                return result;
              }
            };
          };

          $scope.$watch('options', updateSelectionLists);
        }
      }
    };
  }]);
})();
"use strict";

//HEAD 
(function (app) {
  try {
    app = angular.module("btorfs.multiselect.templates");
  } catch (err) {
    app = angular.module("btorfs.multiselect.templates", []);
  }

  app.run(["$templateCache", function ($templateCache) {
    "use strict";

    $templateCache.put("multiselect.html", "<div class='btn-group' style='width: 100%'>\n" + "    <button type='button' class='btn dropdown-toggle' ng-class='classesBtn' ng-click='toggleDropdown()' ng-disabled='disabled' style='white-space: nowrap; overflow-x: hidden; text-overflow: ellipsis;'>\n" + "        {{buttonText}}&nbsp;<span class='caret'></span>\n" + "    </button>\n" + "    <ul class='dropdown-menu dropdown-menu-form'\n" + "        ng-style=\"{display: open ? 'block' : 'none'}\" style='width: 100%; overflow-x: auto'>\n" + "\n" + "        <li ng-show='showSelectAll'>\n" + "            <a ng-click='selectAll()' href=''>\n" + "                <span class='fa fa-check'></span> {{labels.selectAll || 'Select All'}}\n" + "            </a>\n" + "        </li>\n" + "        <li ng-show='showUnselectAll'>\n" + "            <a ng-click='unselectAll()' href=''>\n" + "                <span class='fa fa-times'></span> {{labels.unselectAll || 'Unselect All'}}\n" + "            </a>\n" + "        </li>\n" + "        <li ng-show='(showSelectAll || showUnselectAll)'\n" + "            class='divider'>\n" + "        </li>\n" + "\n" + "        <li role='presentation' ng-repeat='option in selectedOptions' class='active'>\n" + "            <a class='item-selected' href='' title=\"{{showTooltip ? getDisplay(option) : ''}}\" ng-click='toggleItem(option); $event.stopPropagation()' style='overflow-x: hidden;text-overflow: ellipsis'>\n" + "                <span class='fa fa-times'></span>\n" + "                {{getDisplay(option)}}\n" + "            </a>\n" + "        </li>\n" + "        <li ng-show='selectedOptions.length > 0' class='divider'></li>\n" + "\n" + "        <li ng-show='showSearch'>\n" + "            <div class='dropdown-header'>\n" + "                <input type='text' class='form-control input-sm' style='width: 100%;'\n" + "                       ng-model='searchFilter' placeholder=\"{{labels.search || 'Search...'}}\" ng-change='updateOptions()'/>\n" + "            </div>\n" + "        </li>\n" + "\n" + "        <li ng-show='showSearch' class='divider'></li>\n" + "        <li role='presentation' ng-repeat='option in unselectedOptions | filter:search() | limitTo: searchLimit'\n" + "            ng-if='!isSelected(option)'\n" + "            ng-class='{disabled : selectionLimit && selectedOptions.length >= selectionLimit}'>\n" + "            <a class='item-unselected' href='' title=\"{{showTooltip ? getDisplay(option) : ''}}\" ng-click='toggleItem(option); $event.stopPropagation()' style='overflow-x: hidden;text-overflow: ellipsis'>\n" + "                {{getDisplay(option)}}\n" + "            </a>\n" + "        </li>\n" + "\n" + "        <li class='divider' ng-show='selectionLimit > 1'></li>\n" + "        <li role='presentation' ng-show='selectionLimit > 1'>\n" + "            <a>{{selectedOptions.length || 0}} / {{selectionLimit}} {{labels.itemsSelected || 'selected'}}</a>\n" + "        </li>\n" + "\n" + "    </ul>\n" + "</div>\n" + "");
  }]);
})();