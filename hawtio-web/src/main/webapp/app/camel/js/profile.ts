module Camel {

    export function ProfileRouteController($scope, $location, workspace:Workspace, jolokia) {

        $scope.data = [];
        $scope.search = "";
        $scope.calcManually = true;
        $scope.icons = {};
        $scope.selectedRouteId = "";

        var columnDefs: any[] = [
            {
                field: 'id',
                displayName: 'Id',
                cellTemplate: '<div class="ngCellText" ng-bind-html-unsafe="rowIcon(row.entity.id)"></div>',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'count',
                displayName: 'Count',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'last',
                displayName: 'Last',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'delta',
                displayName: 'Delta',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'mean',
                displayName: 'Mean',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'min',
                displayName: 'Min',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'max',
                displayName: 'Max',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'total',
                displayName: 'Total',
                cellFilter: null,
                width: "*",
                resizable: true
            },
            {
                field: 'self',
                displayName: 'Self',
                cellFilter: null,
                width: "*",
                resizable: true
            }
        ];

        $scope.rowIcon = (id) => {
          var entry = $scope.icons[id];
          if (entry) {
            return entry.img + " " + id;
          } else {
            return id;
          }
        }

        $scope.gridOptions = {
            data: 'data',
            displayFooter: true,
            displaySelectionCheckbox: false,
            canSelectRows: false,
            enableSorting: false,
            columnDefs: columnDefs,
            filterOptions: {
                filterText: 'search'
            }
        };


      var populateProfileMessages = function (response) {
        console.log("Populate profile data...")
        var updatedData = [];

        // its xml structure so we need to parse it
        var xml = response.value;
        if (angular.isString(xml)) {

          // lets parse the XML DOM here...
          var doc = $.parseXML(xml);

          var routeMessages = $(doc).find("routeStat");

          routeMessages.each((idx, message) => {
            var messageData = {
              id: {},
              count: {},
              last: {},
              delta: {},
              mean: {},
              min: {},
              max: {},
              total: {},
              self: {}
            };

            // compare counters, as we only update if we have new data
            messageData.id = message.getAttribute("id");

            var total = 0;
            total += +message.getAttribute("exchangesCompleted");
            total += +message.getAttribute("exchangesFailed");
            messageData.count = total;
            messageData.last = message.getAttribute("lastProcessingTime");
            // delta is only avail from Camel 2.11 onwards
            var delta = message.getAttribute("deltaProcessingTime");
            if (delta) {
              messageData.delta = delta;
            } else {
              messageData.delta = 0;
            }
            messageData.mean = message.getAttribute("meanProcessingTime");
            messageData.min = message.getAttribute("minProcessingTime");
            messageData.max = message.getAttribute("maxProcessingTime");
            messageData.total = message.getAttribute("totalProcessingTime");
            // self is pre calculated from Camel 2.11 onwards
            var self = message.getAttribute("selfProcessingTime");
            if (self) {
              messageData.self = self;
            } else {
              // we need to calculate this manually
              $scope.calcManually = true
              messageData.self = "0";
            }

            updatedData.push(messageData);
          });

          console.log("Updating processor stats...");
          var processorMessages = $(doc).find("processorStat");

          processorMessages.each((idx, message) => {
            var messageData = {
              id: {},
              count: {},
              last: {},
              delta: {},
              mean: {},
              min: {},
              max: {},
              total: {},
              self: {}
            };

            messageData.id = message.getAttribute("id");
            var total = 0;
            total += +message.getAttribute("exchangesCompleted");
            total += +message.getAttribute("exchangesFailed");
            messageData.count = total;
            messageData.last = message.getAttribute("lastProcessingTime");
            // delta is only avail from Camel 2.11 onwards
            var delta = message.getAttribute("deltaProcessingTime");
            if (delta) {
              messageData.delta = delta;
            } else {
              messageData.delta = 0;
            }
            messageData.mean = message.getAttribute("meanProcessingTime");
            messageData.min = message.getAttribute("minProcessingTime");
            messageData.max = message.getAttribute("maxProcessingTime");
            // total time for processors is pre calculated as accumulated from Camel 2.11 onwards
            var total = message.getAttribute("accumulatedProcessingTime");
            if (total) {
              messageData.total = total;
            } else {
              messageData.total = "0"
            }
            // self time for processors is their total time
            messageData.self = message.getAttribute("totalProcessingTime");

            updatedData.push(messageData);
          });
        }

        // for Camel 2.10 or older we need to run through the data and calculate the self/total times manually
        // TODO: check camel version and enable this or not using a flag
        if ($scope.calcManually) {

          // sort the data accordingly to order in the icons map
          console.log("Before sorting " + updatedData);
          updatedData.sort((e1, e2) => {
            var entry1 = $scope.icons[e1.id];
            var entry2 = $scope.icons[e2.id];
            if (entry1 && entry2) {
              return entry1.index - entry2.index;
            } else {
              return 0;
            }
          });
          console.log("After sorting " + updatedData);

          var accTotal = 0;
          updatedData.reverse().forEach((data, idx) => {
              // update accTotal with self time
              if (idx < updatedData.length - 1) {
                // each processor should have the total updated with the accumulated total
                accTotal += +data.self;
                data.total = accTotal;
              } else {
                // the last row is the route, which should have self calculated as follows
                data.self = +(data.total - accTotal);
                // just to be safe we dont want negative values self value for the route
                if (data.self < 0) {
                  data.self = 0;
                }
              }
            });

          // reverse back again
          updatedData.reverse();
        }

        // TODO: need a way to update data without flickering
        // if we do as below with the forEach then the data does not update
        // replace data with updated data
//        if ($scope.data.length === 0) {
          $scope.data = updatedData;
//        } else {
//          updatedData.forEach((data, idx) => {
//            $scope.data[idx] = data;
//          });
//        }

        Core.$apply($scope);
      };

        // function to trigger reloading page
        $scope.onResponse = function (response) {
          //console.log("got response: " + response);
          loadData();
        };

        $scope.$watch('workspace.tree', function () {
          // if the JMX tree is reloaded its probably because a new MBean has been added or removed
          // so lets reload, asynchronously just in case
          setTimeout(loadData, 50);
        });

        function initIdToIcon() {
          console.log("initializing id and icons")

          $scope.icons = {};
          var routeXml = Core.pathGet(workspace.selection, ["routeXmlNode"]);
          if (routeXml) {

            // add route id first
            var entry = {
              img : "",
              index : 0
            };
            entry.index = -1;
            entry.img = "<img src='app/camel/img/camel_route.png'>";
            $scope.icons[$scope.selectedRouteId] = entry;

            // then each processor id and icons
            $(routeXml).find('*').each((idx, element) => {
              var id = element.getAttribute("id");
              if (id) {
                var entry = {
                  img : "",
                  index : 0
                };
                entry.index = idx;
                var icon = Camel.getRouteNodeIcon(element);
                if (icon) {
                  entry.img = "<img src='" + icon + "'>";
                } else {
                  entry.img = "";
                }
                $scope.icons[id] = entry;
              }
            });
          }
        }

        function loadData() {
          console.log("Loading Camel route profile data...");
          $scope.selectedRouteId = getSelectedRouteId(workspace);
          var routeMBean = getSelectionRouteMBean(workspace, $scope.selectedRouteId);
          console.log("Selected route is " + $scope.selectedRouteId)

          var camelVersion = getCamelVersion(workspace, jolokia);
          if (camelVersion) {
            console.log("Camel version " + camelVersion)
            camelVersion += "camel-";
            var numbers = Core.parseVersionNumbers(camelVersion);
            if (Core.compareVersionNumberArrays(numbers, [2, 11]) >= 0) {
              // this is Camel 2.11 or better so we dont need to calculate data manually
              console.log("Camel 2.11 or better detected")
              $scope.calcManually = false
            } else {
              console.log("Camel 2.10 or older detected")
              $scope.calcManually = true
            }
          }

          initIdToIcon();
          console.log("Initialized icons, with " + $scope.icons.length + " icons")

          // schedule update the profile data, based on the configured interval
          // TOOD: the icons is not initialized the first time, for some reason, the routeXmlNode is empty/undefined
          // TODO: have cellFilter with bar grey-scale for highlighting the scales between the numbers
          // TODO: have the icons indent, there is some CSS ninja crack to do this

          var query = {type: 'exec', mbean: routeMBean, operation: 'dumpRouteStatsAsXml(boolean,boolean)', arguments: [false, true]};
          scopeStoreJolokiaHandle($scope, jolokia, jolokia.register(populateProfileMessages, query));
       }

    }
}