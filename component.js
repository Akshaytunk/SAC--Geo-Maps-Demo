(function () {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            #mapViewDiv {
                width: 100%;
                height: 100%;
                padding: 0;
                margin: 0;
            }
        </style>
        <div id="mapViewDiv"></div>
    `;

    class GeoMap extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));

            this._props = {};
        }

        static get properties() {   // 🔑 Add this section
            return {
                apikey: {
                    type: "string"
                },
                portalurl: {
                    type: "string"
                },
                webmapid: {          // ✅ Declare webmapid
                    type: "string"
                }
            };
        }

        async renderMap() {
            if (!this._props.apikey || !this._props.portalurl || !this._props.webmapid) {
                console.warn("GeoMap: Missing portalurl, apikey or webmapid");
                return;
            }

            require([
                "esri/config",
                "esri/portal/Portal",
                "esri/WebMap",
                "esri/views/MapView"
            ], (esriConfig, Portal, WebMap, MapView) => {
                esriConfig.apiKey = this._props.apikey;
                esriConfig.portalUrl = this._props.portalurl;

                const webmap = new WebMap({
                    portalItem: { id: this._props.webmapid }
                });

                new MapView({
                    container: this._shadowRoot.getElementById("mapViewDiv"),
                    map: webmap
                });
            });
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
            this.renderMap();
        }
    }

    customElements.define("com-sap-custom-geomap", GeoMap);
})();
