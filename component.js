(function() {
    let template = document.createElement("template");
    var gPassedServiceType; // holds passed in guarantee of service - set in onCustomWidgetBeforeUpdate()
    var gPassedPortalURL;   // ESRI Portal URL
    var gPassedAPIkey;      // ESRI JS api key
    var gPassedWebMapId;    // ESRI Web Map ID
    var gWebmapInstantiated = 0; // a global used in applying definition query
    var gMyLyr;             // for sublayer
    var gMyWebmap;          // needs to be global for async call to onCustomWidgetAfterUpdate()

    template.innerHTML = `
        <link rel="stylesheet" href="https://js.arcgis.com/4.18/esri/themes/light/main.css">
        <style>
        #mapview {
            width: 100%;
            height: 100%;
        }
        #timeSlider {
            position: absolute;
            left: 5%;
            right: 15%;
            bottom: 20px;
        }
        </style>
        <div id='mapview'></div>
        <div id='timeSlider'></div>
    `;

    function applyDefinitionQuery() {
        var svcLyr = gMyWebmap.findLayerById('daed1167baed413a9e38f47ea81b0fab'); 
        console.log("Layer is", svcLyr);

        if (!svcLyr) return;

        svcLyr.visible = true;

        svcLyr.when(function() {
            gMyLyr = svcLyr.findSublayerById(6);    
            console.log("Sublayer loaded...", gMyLyr);

            if (gMyLyr) {
                gMyLyr.visible = true;
                processDefinitionQuery();
            }
        });
    };

    function processDefinitionQuery() {
        if (!gMyLyr) return;

        if (gPassedServiceType <= 1) { 
            gMyLyr.definitionExpression = "1 = 1";
        } else if (gPassedServiceType === 2) { 
            gMyLyr.definitionExpression = "NODISCONCT = '1'";
        } else if (gPassedServiceType === 3) { 
            gMyLyr.definitionExpression = "NODISCONCT = '2'";
        } else if (gPassedServiceType === 4) { 
            gMyLyr.definitionExpression = "NODISCONCT = '3'";
        } else if (gPassedServiceType === 5) { 
            gMyLyr.definitionExpression = "NODISCONCT = '4'";
        } else if (gPassedServiceType === 6) { 
            gMyLyr.definitionExpression = "NODISCONCT = '5'";
        } else if (gPassedServiceType === 7) { 
            gMyLyr.definitionExpression = "NODISCONCT = '6'";
        } else { 
            gMyLyr.definitionExpression = "NODISCONCT IN ('1', '2', '3', '4', '5', '6')";
        }
    }

    class Map extends HTMLElement {
        constructor() {
            super();
            this.appendChild(template.content.cloneNode(true));
            this._props = {};

            let that = this;

            require([
                "esri/config",
                "esri/WebMap",
                "esri/views/MapView",
                "esri/widgets/BasemapToggle",
                "esri/layers/FeatureLayer",
                "esri/widgets/TimeSlider",
                "esri/widgets/Expand",
                "esri/tasks/RouteTask",
                "esri/tasks/support/RouteParameters",
                "esri/tasks/support/FeatureSet",
                "esri/tasks/support/Query",
                "esri/layers/support/Sublayer",
                "esri/Graphic",
                "esri/views/ui/UI",
                "esri/views/ui/DefaultUI" 
            ], function(esriConfig, WebMap, MapView, BasemapToggle, FeatureLayer, TimeSlider, Expand, RouteTask, RouteParameters, FeatureSet, Query, Sublayer, Graphic) {
        
                // set portal and API Key
                esriConfig.portalUrl = gPassedPortalURL || "";
                esriConfig.apiKey = gPassedAPIkey || "";

                // routing service
                var routeTask = new RouteTask({
                    url: "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World"
                });

                // Use dynamic Web Map ID from property, fallback to default if missing
                const webmap = new WebMap({
                    portalItem: {
                        id: gPassedWebMapId || "87c95b1486bc4abf9f47431c81edff57"
                    }
                });

                gMyWebmap = webmap;  

                const view = new MapView({
                    container: "mapview",
                    map: webmap
                });

                const timeSlider = new TimeSlider({
                    container: "timeSlider",
                    view: view
                });
        
                view.on("click", addStop);
        
                function addGraphic(type, point) {
                    var graphic = new Graphic({
                        symbol: {
                            type: "simple-marker",
                            color: type === "start" ? "white" : "black",
                            size: "8px"
                        },
                        geometry: point
                    });
                    view.graphics.add(graphic);
                }

                function addStop(event) {
                    if (view.graphics.length === 0) {
                        addGraphic("start", event.mapPoint);
                    } else if (view.graphics.length === 1) {
                        addGraphic("finish", event.mapPoint);
                        getRoute();
                    } else {
                        view.graphics.removeAll();
                        addGraphic("start", event.mapPoint);
                    }
                };

                function getRoute() {
                    var routeParams = new RouteParameters({
                        stops: new FeatureSet({
                            features: view.graphics.toArray()
                        }),
                        returnDirections: true
                    });
                    routeTask.solve(routeParams).then(showRoute);
                }

                function showRoute(data) {
                    data.routeResults.forEach(function(result) {
                        result.route.symbol = {
                            type: "simple-line",
                            color: [5, 150, 255],
                            width: 3
                        };
                        view.graphics.add(result.route);
                    });

                    var directions = document.createElement("ol");
                    directions.classList = "esri-widget esri-widget--panel esri-directions__scroller";
                    directions.style.marginTop = 0;
                    directions.style.paddingTop = "15px";
        
                    var features = data.routeResults[0].directions.features;
                    features.forEach(function(result, i) {
                        var direction = document.createElement("li");
                        direction.innerHTML =
                          result.attributes.text + " (" + result.attributes.length.toFixed(2) + " miles)";
                        directions.appendChild(direction);
                    });

                    view.ui.empty("top-right");
                    view.ui.add(directions, "top-right");
                }

                view.when(function () {
                    view.popup.autoOpenEnabled = true; 
                    gWebmapInstantiated = 1;
        
                    var basemapToggle = new BasemapToggle({
                        view:view,
                        nextBasemap: "satellite"
                    });
                    view.ui.add(basemapToggle, "bottom-right");
        
                    console.log("Service Level:", gPassedServiceType);

                    applyDefinitionQuery();
                });

            }); 
        }    

        getSelection() {
            return this._currentSelection;
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            if ("servicelevel" in changedProperties) {
                this.$servicelevel = changedProperties["servicelevel"];
            }
            gPassedServiceType = this.$servicelevel;

            if ("portalurl" in changedProperties) {
                this.$portalurl = changedProperties["portalurl"];
            }
            gPassedPortalURL = this.$portalurl;

            if ("apikey" in changedProperties) {
                this.$apikey = changedProperties["apikey"];
            }
            gPassedAPIkey = this.$apikey;

            if ("webmapid" in changedProperties) {
                this.$webmapid = changedProperties["webmapid"];
            }
            gPassedWebMapId = this.$webmapid;

            if (gWebmapInstantiated === 1) {
                applyDefinitionQuery();
            }
        }
    } 

    let scriptSrc = "https://js.arcgis.com/4.18/"
    let onScriptLoaded = function() {
        customElements.define("com-sap-custom-geomap", Map);
    }

    let customElementScripts = JSON.parse(window.sessionStorage.getItem("customElementScripts") || "[]");
    let scriptStatus = customElementScripts.find(function(element) {
        return element.src === scriptSrc;
    });

    if (scriptStatus) {
        if(scriptStatus.status == "ready") {
            onScriptLoaded();
        } else {
            scriptStatus.callbacks.push(onScriptLoaded);
        }
    } else {
        let scriptObject = {
            "src": scriptSrc,
            "status": "loading",
            "callbacks": [onScriptLoaded]
        }
        customElementScripts.push(scriptObject);
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = scriptSrc;
        script.onload = function(){
            scriptObject.status = "ready";
            scriptObject.callbacks.forEach((callbackFn) => callbackFn.call());
        };
        document.head.appendChild(script);
    }

})(); 
