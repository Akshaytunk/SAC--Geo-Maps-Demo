(function() {
    let template = document.createElement("template");
    var gPassedPortalURL = "https://tek-analytics.maps.arcgis.com";  // Your portal URL
    var gPassedAPIkey;
    var gPassedWebmapId = "87c95b1486bc4abf9f47431c81edff57"; // Default Esri sample

    template.innerHTML = `
        <link rel="stylesheet" href="https://js.arcgis.com/4.18/esri/themes/light/main.css">
        <style>
        #mapview {
            width: 100%;
            height: 100%;
        }
        </style>
        <div id='mapview'></div>
    `;

    class Map extends HTMLElement {
        constructor() {
            super();
            this.appendChild(template.content.cloneNode(true));
            this._props = {};

            require([
                "esri/config",
                "esri/WebMap",
                "esri/views/MapView",
                "esri/geometry/Point",
                "esri/geometry/geometryEngine",
                "esri/Graphic"
            ], function(esriConfig, WebMap, MapView, Point, geometryEngine, Graphic) {

                // Set ESRI portal and API key
                esriConfig.portalUrl = gPassedPortalURL;
                esriConfig.apiKey = gPassedAPIkey;

                // Load webmap (configurable)
                const webmap = new WebMap({
                    portalItem: { id: gPassedWebmapId }
                });

                const view = new MapView({
                    container: "mapview",
                    map: webmap
                });

                // -----------------------------
                // Dummy showroom data
                // -----------------------------
                let showroomData = [
                    { name: "Dealer A", lat: 40.7128, lon: -74.0060 },   // NYC
                    { name: "Dealer B", lat: 40.7580, lon: -73.9855 },   // Times Square
                    { name: "Dealer C", lat: 41.2033, lon: -77.1945 },   // Pennsylvania
                    { name: "Dealer D", lat: 39.9526, lon: -75.1652 }    // Philadelphia
                ];

                // On map click, show showrooms within 50 miles
                view.on("click", function(event) {
                    view.graphics.removeAll();

                    // clicked point
                    const clickedPoint = new Point({
                        longitude: event.mapPoint.longitude,
                        latitude: event.mapPoint.latitude
                    });

                    // add red marker for clicked location
                    view.graphics.add(new Graphic({
                        geometry: clickedPoint,
                        symbol: { type: "simple-marker", color: "red", size: "12px" }
                    }));

                    // loop through showroom data
                    showroomData.forEach((dealer) => {
                        const dealerPoint = new Point({
                            longitude: dealer.lon,
                            latitude: dealer.lat
                        });

                        // calculate distance in miles
                        const dist = geometryEngine.distance(clickedPoint, dealerPoint, "miles");

                        if (dist <= 50) {
                            // add blue marker for nearby dealer
                            view.graphics.add(new Graphic({
                                geometry: dealerPoint,
                                symbol: { type: "simple-marker", color: "blue", size: "8px" },
                                popupTemplate: {
                                    title: dealer.name,
                                    content: `Distance: ${dist.toFixed(2)} miles`
                                }
                            }));
                        }
                    });
                });
            }); // end of require()
        } // end constructor

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            if ("portalurl" in changedProperties) {
                this.$portalurl = changedProperties["portalurl"];
                gPassedPortalURL = this.$portalurl || "https://tek-analytics.maps.arcgis.com";
            }

            if ("apikey" in changedProperties) {
                this.$apikey = changedProperties["apikey"];
                gPassedAPIkey = this.$apikey;
            }

            if ("webmapid" in changedProperties) {
                this.$webmapid = changedProperties["webmapid"];
                gPassedWebmapId = this.$webmapid || "87c95b1486bc4abf9f47431c81edff57";
            }
        }
    }

    let scriptSrc = "https://js.arcgis.com/4.18/";
    let onScriptLoaded = function() {
        customElements.define("com-sap-custom-geomap", Map);
    }

    let customElementScripts = window.sessionStorage.getItem("customElementScripts") || [];
    let scriptStatus = customElementScripts.find(function(element) {
        return element.src == scriptSrc;
    });

    if (scriptStatus) {
        if (scriptStatus.status == "ready") {
            onScriptLoaded();
        } else {
            scriptStatus.callbacks.push(onScriptLoaded);
        }
    } else {
        let scriptObject = {
            "src": scriptSrc,
            "status": "loading",
            "callbacks": [onScriptLoaded]
        };
        customElementScripts.push(scriptObject);
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = scriptSrc;
        script.onload = function() {
            scriptObject.status = "ready";
            scriptObject.callbacks.forEach((callbackFn) => callbackFn.call());
        };
        document.head.appendChild(script);
    }
})();
