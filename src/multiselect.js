(function () {
    const multiselect = angular.module('btorfs.multiselect', ['btorfs.multiselect.templates'])

    multiselect.getRecursiveProperty = function (object, path) {
        return path.split('.').reduce((obj, x) => {
            if (obj) {
                return obj[x]
            }
            return null
        }, object)
    }

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
                placeholder: '@?',
            },
            require: 'ngModel',
            templateUrl: 'multiselect.html',
            controller: ['$scope', function ($scope) {
                if (angular.isUndefined($scope.classesBtn)) {
                    $scope.classesBtn = ['btn-block', 'btn-default']
                }
            }],
            link: {
                post($scope, $element, $attrs, $ngModelCtrl) {
                    $scope.selectionLimit = $scope.selectionLimit || 0
                    $scope.searchLimit = $scope.searchLimit || 25

                    $scope.searchFilter = ''

                    $scope.resolvedOptions = []
                    if (typeof $scope.options !== 'function') {
                        $scope.resolvedOptions = $scope.options
                    }

                    if (typeof $attrs.disabled !== 'undefined') {
                        $scope.disabled = true
                    }


                    const closeHandler = function (event) {
                        if (!$element[0].contains(event.target)) {
                            $scope.$apply(() => {
                                $scope.open = false
                            })
                        }
                    }

                    $document.on('click', closeHandler)

                    const updateSelectionLists = function () {
                        if (!$scope.resolvedOptions && !$scope.options) {
                            return
                        }

                        if (!$ngModelCtrl.$viewValue) {
                            if ($scope.selectedOptions) {
                                $scope.selectedOptions = []
                            }
                            $scope.unselectedOptions = ($scope.resolvedOptions || $scope.options).slice() // Take a copy
                        } else {
                            $scope.selectedOptions = ($scope.resolvedOptions || $scope.options).filter((el) => {
                                const id = $scope.getId(el)
                                for (let i = 0; i < $ngModelCtrl.$viewValue.length; i++) {
                                    const selectedId = $scope.getId($ngModelCtrl.$viewValue[i])
                                    if (id === selectedId) {
                                        return true
                                    }
                                }
                                return false
                            })
                            $scope.unselectedOptions = ($scope.resolvedOptions || $scope.options).filter((el) => {
                                return $scope.selectedOptions.indexOf(el) < 0
                            })
                        }
                        $scope.getButtonText()
                    }

                    $scope.toggleDropdown = function () {
                        $scope.open = !$scope.open
                        $scope.resolvedOptions = $scope.options
                        updateSelectionLists()
                    }

                    $ngModelCtrl.$render = function () {
                        updateSelectionLists()
                    }

                    $ngModelCtrl.$viewChangeListeners.push(() => {
                        updateSelectionLists()
                    })

                    $ngModelCtrl.$isEmpty = function (value) {
                        if (value) {
                            return (value.length === 0)
                        }
                        return true
                    }

                    const watcher = $scope.$watch('selectedOptions', () => {
                        const selecteds = angular.copy($scope.selectedOptions)
                        if (selecteds) {
                            if ($scope.idProp) {
                                $ngModelCtrl.$setViewValue(selecteds && selecteds.map((elem) => elem[$scope.idProp]))
                            } else {
                                $ngModelCtrl.$setViewValue(selecteds)
                            }
                        }
                    }, true)

                    $scope.$on('$destroy', () => {
                        $document.off('click', closeHandler)
                        if (watcher) {
                            watcher() // Clean watcher
                        }
                    })

                    $scope.getButtonText = function () {
                        if ($scope.selectedOptions && $scope.selectedOptions.length === 1) {
                            $scope.buttonText = $scope.getDisplay($scope.selectedOptions[0])
                        } else if ($scope.selectedOptions && $scope.selectedOptions.length > 1) {
                            const totalSelected = angular.isDefined($scope.selectedOptions) ? $scope.selectedOptions.length : 0
                            if (totalSelected === 0) {
                                $scope.buttonText = $scope.labels && $scope.labels.select ? $scope.labels.select : 'Select'
                            } else {
                                $scope.buttonText = `${totalSelected} ${$scope.labels && $scope.labels.itemsSelected ? $scope.labels.itemsSelected : 'selected'}`
                            }
                        } else {
                            $scope.buttonText = $scope.labels && $scope.labels.select ? $scope.labels.select : 'Select'
                        }
                    }

                    $scope.selectAll = function () {
                        $scope.selectedOptions = $scope.resolvedOptions.slice().filter((el) => $scope.getId(el) !== '') // Take a copy;
                        $scope.unselectedOptions = []
                    }

                    $scope.unselectAll = function () {
                        $scope.selectedOptions = []
                        $scope.unselectedOptions = $scope.resolvedOptions.slice() // Take a copy;
                    }

                    $scope.toggleItem = function (item) {
                        if (typeof $scope.selectedOptions === 'undefined') {
                            $scope.selectedOptions = []
                        }
                        const selectedIndex = $scope.selectedOptions.indexOf(item)
                        const currentlySelected = (selectedIndex !== -1)
                        if (currentlySelected) {
                            $scope.unselectedOptions.push($scope.selectedOptions[selectedIndex])
                            $scope.selectedOptions.splice(selectedIndex, 1)
                        } else if (!currentlySelected && ($scope.selectionLimit === 0 || $scope.selectedOptions.length < $scope.selectionLimit)) {
                            const unselectedIndex = $scope.unselectedOptions.indexOf(item)
                            $scope.unselectedOptions.splice(unselectedIndex, 1)
                            $scope.selectedOptions.push(item)
                        }
                    }

                    $scope.getId = function (item) {
                        if (angular.isString(item)) {
                            return item
                        } else if (angular.isObject(item)) {
                            if ($scope.idProp) {
                                return multiselect.getRecursiveProperty(item, $scope.idProp)
                            }
                            $log.error('Multiselect: when using objects as model, a idProp value is mandatory.')
                            return ''
                        }
                        return item
                    }

                    $scope.getDisplay = function (item) {
                        if (angular.isString(item)) {
                            return item
                        } else if (angular.isObject(item)) {
                            if ($scope.displayProp) {
                                return multiselect.getRecursiveProperty(item, $scope.displayProp)
                            }
                            $log.error('Multiselect: when using objects as model, a displayProp value is mandatory.')
                            return ''
                        }
                        return item
                    }

                    $scope.isSelected = function (item) {
                        if (!$scope.selectedOptions) {
                            return false
                        }
                        const itemId = $scope.getId(item)
                        for (let i = 0; i < $scope.selectedOptions.length; i++) {
                            const selectedElement = $scope.selectedOptions[i]
                            if ($scope.getId(selectedElement) === itemId) {
                                return true
                            }
                        }
                        return false
                    }

                    $scope.updateOptions = function () {
                        if (typeof $scope.options === 'function') {
                            $scope.options().then((resolvedOptions) => {
                                $scope.resolvedOptions = resolvedOptions
                                updateSelectionLists()
                            })
                        }
                    }

                    // This search function is optimized to take into account the search limit.
                    // Using angular limitTo filter is not efficient for big lists, because it still runs the search for
                    // all elements, even if the limit is reached
                    $scope.search = function () {
                        let counter = 0
                        return function (item) {
                            if (counter > $scope.searchLimit) {
                                return false
                            }
                            const displayName = $scope.getDisplay(item)
                            if (displayName) {
                                const result = displayName.toLowerCase().indexOf($scope.searchFilter.toLowerCase()) > -1
                                if (result) {
                                    counter += 1
                                }
                                return result
                            }
                        }
                    }

                    $scope.$watch('options', updateSelectionLists)
                },
            },
        }
    }])
}())
