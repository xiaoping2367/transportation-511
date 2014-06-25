﻿/*global dojo,define,dojoConfig,alert,esri,handle,graphicsLayerHandle */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/*
 | Copyright 2013 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
//============================================================================================================================//
define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/topic",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/query",
    "dojo/dom-class",
    "dojo/_base/array",
    "esri/tasks/FeatureSet",
    "esri/tasks/GeometryService",
    "dojo/string",
    "dojo/_base/html",
    "dojo/text!./templates/routeTemplate.html",
    "esri/tasks/query",
    "esri/dijit/Directions",
    "esri/tasks/QueryTask",
    "dojo/Deferred",
    "dojo/DeferredList",
    "dijit/layout/BorderContainer",
    "esri/symbols/SimpleLineSymbol",
    "dijit/layout/ContentPane",
    "esri/graphic",
    "dojo/_base/Color",
    "esri/urlUtils",
    "esri/geometry/Extent",
    "../scrollBar/scrollBar",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "dojo/cookie",
    "esri/tasks/BufferParameters",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "esri/geometry/Polyline"
], function (declare, domConstruct, on, topic, lang, domStyle, domAttr, query, domClass, array, FeatureSet, GeometryService, string, html, template, Query, Directions, QueryTask, Deferred, DeferredList, _BorderContainer, SimpleLineSymbol, _ContentPane, Graphic, Color, urlUtils, geometryExtent, ScrollBar, SimpleFillSymbol, SimpleMarkerSymbol, cookie, BufferParameters, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, Polyline) {

    //========================================================================================================================//

    return declare([_BorderContainer, _ContentPane, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        _esriDirectionsWidget: null,
        esriCTrouteScrollbar: null,
        esriCTInfoLayerFeatureList: null,
        logoContainer: null,
        esriCTrouteDirectionScrollbar: null,
        divShowReRouteContainer: null,
        divEmptyContainer: null,
        countBuffer: false,
        inforesult: false,
        infoPanelHeight: false,
        buffercount: 0,
        divapplicationFrequentRoutes: null,
        containerButtonHtml: null,
        routeTopTiteArrow: null,
        esriRoute: false,

        /**
        * show route page
        * @memberOf widgets/route/routeSetting
        * Add path of proxy url
        * Create instance of Direction widget ,extend and override the Direction widget
        */
        showRoute: function () {
            var directionsUnits = dojo.configData.RouteSymbology.DirectionUnits, divFrequentRoute, i, stopsGeometry;
            urlUtils.addProxyRule({
                urlPrefix: dojo.configData.RouteTaskService,
                proxyUrl: dojoConfig.baseURL + dojo.configData.ProxyUrl
            });
            urlUtils.addProxyRule({
                urlPrefix: dojo.configData.GeometryService,
                proxyUrl: dojoConfig.baseURL + dojo.configData.ProxyUrl
            });
            if (!this._esriDirectionsWidget && dojo.configData.RoutingEnabled === "true" && lang.trim(dojo.configData.RoutingEnabled).length !== 0) {
                this._esriDirectionsWidget = new Directions({
                    map: this.map,
                    directionsLengthUnits: directionsUnits,
                    showTrafficOption: false,
                    routeTaskUrl: dojo.configData.RouteTaskService
                }, domConstruct.create("div", {}, this.esriCTRouteContainer));
                this._esriDirectionsWidget.options.geocoderOptions.autoComplete = true;
                this._esriDirectionsWidget.autoSolve = false;
                this._esriDirectionsWidget.startup();
                //barriers feature set
                if (this._esriDirectionsWidget.routeParams) {
                    this._esriDirectionsWidget.routeParams.barriers = new FeatureSet();
                    this._esriDirectionsWidget.routeParams.polylineBarriers = new FeatureSet();
                    this._esriDirectionsWidget.routeParams.polygonBarriers = new FeatureSet();
                }
                this._clearTextBox();

                this.own(on(this._esriDirectionsWidget, "add-stops", lang.hitch(this, function (evt, a, b) {
                    this._clearTextBox();
                })));
                this._esriDirectionsWidget.options.routeSymbol.color = new Color([parseInt(dojo.configData.RouteSymbology.ColorRGB.split(",")[0], 10), parseInt(dojo.configData.RouteSymbology.ColorRGB.split(",")[1], 10), parseInt(dojo.configData.RouteSymbology.ColorRGB.split(",")[2], 10), parseFloat(dojo.configData.RouteSymbology.Transparency.split(",")[0], 10)]);
                this._esriDirectionsWidget.options.routeSymbol.width = parseInt(dojo.configData.RouteSymbology.Width, 10);
                this.own(on(this._esriDirectionsWidget, "directions-finish", lang.hitch(this, function () {
                    domConstruct.create("div", { "class": "esriCTRouteBlankPanel" }, query(".esriRoutes")[0]);
                    if (query(".esriRoutesError")[0]) {
                        domStyle.set(query(".esriRoutesError")[0], "display", "none");
                    }
                    dojo.stops = [];
                    for (i = 0; i < this._esriDirectionsWidget.stops.length; i++) {
                        if (this._esriDirectionsWidget.stops[i].feature) {
                            stopsGeometry = parseFloat(this._esriDirectionsWidget.stops[i].feature.geometry.x) + "," + parseFloat(this._esriDirectionsWidget.stops[i].feature.geometry.y);
                            dojo.stops.push(stopsGeometry);
                        }
                    }
                    topic.publish("hideInfoWindowOnMap");
                    topic.publish("showProgressIndicator");
                    if (this._esriDirectionsWidget.directions !== null) {
                        this.routeOnMap = true;
                        this._onDirectionFinish();
                        if (domStyle.get(this.esriCTRouteContainer, "display") !== "block") {
                            domStyle.set(this.esriCTDirectionRefreshButton, "display", "none");
                        }
                    } else {
                        this.routeOnMap = false;
                        this._validateAddress();
                        this._routeGeocodersResult();
                        if (!this.resultLength) {
                            this._showErrorResult();
                            this.clearAllGraphics(false);
                        } else {
                            alert(sharedNls.errorMessages.enterCorrectPoints);
                        }
                        topic.publish("hideProgressIndicator");
                        if (this.esriCTDirectionRefreshButton) {
                            domStyle.set(this.esriCTDirectionRefreshButton, "display", "none");
                        }
                    }
                }), function (err) {
                    this.routeOnMap = false;
                    if (this.esriCTDirectionRefreshButton) {
                        domStyle.set(this.esriCTDirectionRefreshButton, "display", "none");
                    }
                    alert(err.message);
                    topic.publish("hideProgressIndicator");
                }));
                this.own(on(this._esriDirectionsWidget, "add-stops", lang.hitch(this, function () {
                    this._routeGeocodersResult();
                    if (!this.resultLength) {
                        topic.publish("showProgressIndicator");
                        this._esriDirectionsWidget.getDirections();
                    }
                })));
                this._persistRouteAddress();
            }

            if (!this.routeLoader && dojo.configData.FrequentRoutesSettings.FrequentRoutesEnabled === "true" && lang.trim(dojo.configData.FrequentRoutesSettings.FrequentRoutesEnabled).length !== 0) {
                divFrequentRoute = domConstruct.create("div", { "class": "esriCTdivFrequentRoute" });
                if (query(".esriRoutesContainer")[0]) {
                    domConstruct.place(divFrequentRoute, query(".esriRoutesContainer")[0], "first");
                } else {
                    domConstruct.place(divFrequentRoute, this.esriCTRouteContainer);
                }
                this.routeLoader = domConstruct.create("img", { "class": "esriCTInfoLoader" }, divFrequentRoute);
                domAttr.set(this.routeLoader, "src", dojoConfig.baseURL + "/js/library/themes/images/blue-loader.gif");
            }
        },

        /**
        * Clear route graphics present on map
        * @memberOf widgets/route/routeSetting
        */
        clearDirection: function () {
            var graphicsLength, graphicsBufferLength, _this = this;
            graphicsLength = this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length;
            graphicsBufferLength = this.map.getLayer("frequentRoutesLayerID").graphics.length;
            if (graphicsLength > 0) {
                if (this.map.getLayer("esriGraphicsLayerMapSettings").visible) {
                    if (domStyle.get(this.esriCTRouteContainer, "display") === "block") {
                        domStyle.set(this.esriCTDirectionRefreshButton, "display", "block");
                    } else {
                        domStyle.set(this.esriCTDirectionRefreshButton, "display", "none");
                    }
                }
            }
            if (graphicsBufferLength > 0) {
                if (this.map.getLayer("frequentRoutesLayerID").visible) {
                    domStyle.set(this.esriCTDirectionRefreshButton, "display", "block");
                }
            }
            if (domStyle.get(this.esriCTDirectionRefreshButton, "display") === "block") {
                this.esriCTDirectionRefreshButton.onclick = function () {
                    _this.routeOnMap = false;
                    dojo.stops = [];
                    dojo.frequentRouteId = null;
                    if (_this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length > 0) {
                        domStyle.set(_this.containerButtonHtml, "cursor", "default");
                        domStyle.set(_this.routeTopTiteArrow, "cursor", "default");
                        _this.setDirectionScrollbar();
                        domClass.replace(_this.routeTopTiteArrow, "esriCTrouteUpTitleArrow", "esriCTrouteDownTitleArrow");
                        domClass.replace(_this.divFrequentRouteContainerButton, "esriCTFrequentRouteContainerButton", "esriCTFrequentRouteContainerTopButton");
                        domStyle.set(query(".esriRoutesContainer")[0], "display", "none");
                        domStyle.set(_this.divFrequentRoutePanel, "display", "block");
                    }
                    _this.clearAllGraphics(true);
                    domStyle.set(_this.esriCTDirectionRefreshButton, "display", "none");
                    graphicsLayerHandle.clear();
                };
            }
        },

        /**
        * On double click clear direction widget textbox
        * @memberOf widgets/route/routeSetting
        */
        _clearTextBox: function () {
            var addressArray = query(".esriGeocoderContainer"), updatedAddressArray;
            array.forEach(addressArray, lang.hitch(this, function (inputBox) {
                inputBox.getElementsByTagName("input")[0].ondblclick = lang.hitch(this, function (evt) {
                    var stops = [];
                    evt.currentTarget.value = "";
                    updatedAddressArray = query(".esriGeocoderContainer");
                    array.forEach(updatedAddressArray, lang.hitch(this, function (directionTextBox) {
                        stops.push(directionTextBox.getElementsByTagName("input")[0] ? directionTextBox.getElementsByTagName("input")[0].value : "");
                    }));
                    this._esriDirectionsWidget.updateStops(stops);
                });
            }));
        },

        /**
        * Set alert for direction widget results
        * @memberOf widgets/route/routeSetting
        */
        _validateAddress: function () {
            if (dojo.stops[0] === "" && dojo.stops[dojo.stops.length - 1] !== "") {
                alert(sharedNls.errorMessages.enterCorrectSource);
            } else if (dojo.stops[0] !== "" && dojo.stops[dojo.stops.length - 1] === "") {
                alert(sharedNls.errorMessages.enterCorrectDestination);
            } else if (dojo.stops[0] === "" && dojo.stops[dojo.stops.length - 1] === "") {
                alert(sharedNls.errorMessages.enterCorrectPoints);
            }
            this.clearAllGraphics(false);
        },

        /**
        * set alert for Incorrect end points
        * @memberOf widgets/route/routeSetting
        */
        _showErrorResult: function () {
            var featureLength = this._esriDirectionsWidget.stops, result;
            for (result = 0; result < featureLength.length; result++) {
                if (!featureLength[result].feature) {
                    alert(featureLength[result].name + " " + sharedNls.errorMessages.noDirection);
                }
            }
        },

        /**
        * Geocode the address of direction widget
        * @memberOf widgets/route/routeSetting
        */
        _routeGeocodersResult: function () {
            var j;
            this.resultLength = false;
            for (j = 0; j < this._esriDirectionsWidget.geocoders.length; j++) {
                if (this._esriDirectionsWidget.geocoders[j].results.length === 0 && this._esriDirectionsWidget.stops[j].name === "") {
                    this.resultLength = true;
                    break;
                }
            }
        },

        /**
        * Bind route handle event
        * @param {object} trigger event to handle route
        * @memberOf widgets/route/routeSetting
        */
        _onRouteHandle: function (evt) {
            var r, pl;
            dojo.stopEvent(evt);
            this._moveHandle(evt.mapPoint);
            //using the handle.eventPadding 1px length line with a 512px-width symbol around the handle
            //so if user moves cursor too fast, graphicsLayterHandle will still produce onMouseMove events
            //while draggin the Handle
            r = Math.max(this.map.toMap(new esri.geometry.Point(0, 0)).y - this.map.toMap(new esri.geometry.Point(0, 1)).y, 1);
            pl = new Polyline({ paths: [[[evt.mapPoint.x, evt.mapPoint.y - r], [evt.mapPoint.x, evt.mapPoint.y + r]]] });
            pl.setSpatialReference(this.graphicsHandleEvent.spatialReference);
            if (!handle.eventPadding) {
                handle.eventPadding = new Graphic(pl);
            }
            handle.eventPadding.setGeometry(pl);
            this.graphicsHandleEvent.clear();
            this.graphicsHandleEvent.add(handle.eventPadding);
            this.map.addLayer(this.graphicsHandleEvent);
        },

        /**
        * Trigger on move up event
        * @param {object} trigger event
        * @memberOf widgets/route/routeSetting
        */
        _onMoveWaypoint: function (evt) {
            var stopIndex = Math.ceil(this._esriDirectionsWidget.stops.length / 2);
            this._esriDirectionsWidget.addStop(evt.mapPoint, stopIndex);
            this._esriDirectionsWidget.clearDirections();
        },

        /**
        * Bind route moving this.handle
        * @param {geometry} current geometry
        * @memberOf widgets/route/routeSetting
        */
        _moveHandle: function (point) {
            //moving this.handle
            handle.geometry = point;
            graphicsLayerHandle.clear();
            graphicsLayerHandle.add(handle);
        },

        /**
        * Set value of persist route
        * @memberOf widgets/route/routeSetting
        */
        _persistRouteAddress: function () {
            var storage, stops;
            stops = [];
            storage = window.localStorage;
            if (storage) {
                stops.push((storage.getItem("SourceAddress") !== null) ? storage.getItem("SourceAddress") : "");
                stops.push((storage.getItem("DestAddress") !== null) ? storage.getItem("DestAddress") : "");
            } else {
                if (cookie.isSupported()) {
                    stops.push((cookie("SourceAddress") !== undefined) ? cookie("SourceAddress") : "");
                    stops.push((cookie("DestAddress") !== undefined) ? cookie("DestAddress") : "");
                }
            }
            this._esriDirectionsWidget.updateStops(stops);
        },

        /**
        * Event triggered on direction finish
        * @memberOf widgets/route/routeSetting
        */
        _onDirectionFinish: function () {
            this.clearDirection();
            var esriRoutesHeight, esriRoutesStyle;
            this.esriRoute = false;
            if (this.applicationHeaderRouteContainer.offsetHeight <= 0) {
                esriRoutesHeight = document.documentElement.clientHeight - query(".esriCTApplicationHeader")[0].offsetHeight - 31;
                esriRoutesStyle = { height: esriRoutesHeight + "px" };
                domAttr.set(this.esriCTRouteContainer, "style", esriRoutesStyle);
            }
            this.infoPanelHeight = false;
            domStyle.set(query(".esriRoutesContainer")[0], "display", "block");
            if (dojo.configData.FrequentRoutesSettings.FrequentRoutesEnabled === "true") {
                domStyle.set(this.divFrequentRoutePanel, "display", "none");
                this._showHideFrequentRouteContainer();
            }
            this.inforesult = true;
            this.clearAllGraphics(false);
            this._addBufferGeometry();
            if (dojo.window.getBox().w > 1025) {
                this._enableMouseEvents();
            }
            esriRoutesHeight = document.documentElement.clientHeight - query(".esriCTApplicationHeader")[0].offsetHeight - html.coords(query(".simpleDirections .esriStopsContainer")[0]).h - 100;
            esriRoutesStyle = { height: esriRoutesHeight + "px" };
            domAttr.set(query(".esriRoutes")[0], "style", esriRoutesStyle);
            domAttr.set(query(".esriResultsPrint")[0], "innerHTML", sharedNls.buttons.print);
            if (!this.esriCTrouteDirectionScrollbar) {
                this.esriCTrouteDirectionScrollbar = new ScrollBar({ domNode: this.esriCTRouteContainer });
                this.esriCTrouteDirectionScrollbar.setContent(query(".simpleDirections")[0]);
                this.esriCTrouteDirectionScrollbar.createScrollBar();
            } else {
                this.esriCTrouteDirectionScrollbar.rePositionScrollBar();
            }
        },

        /**
        * Toggle frequent route button up and down
        * @memberOf widgets/route/routeSetting
        */
        _showHideFrequentRouteContainer: function () {
            var _this = this;
            if (this.divFrequentRouteContainerButton) {
                domStyle.set(this.containerButtonHtml, "cursor", "pointer");
                domStyle.set(this.routeTopTiteArrow, "cursor", "pointer");
                domClass.replace(this.divFrequentRouteContainerButton, "esriCTFrequentRouteContainerTopButton", "esriCTFrequentRouteContainerButton");
                domClass.replace(this.routeTopTiteArrow, "esriCTrouteDownTitleArrow", "esriCTrouteUpTitleArrow");
                this.divapplicationFrequentRoutes.onclick = function () {
                    if (!_this.esriRoute) {
                        if (query(".esriRoutesContainer")[0]) {
                            if (domStyle.get(query(".esriRoutesContainer")[0], "display") === "none" && (_this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length > 0 || _this.routeOnMap)) {
                                _this.setDirectionScrollbar();
                                domClass.replace(_this.divFrequentRouteContainerButton, "esriCTFrequentRouteContainerTopButton", "esriCTFrequentRouteContainerButton");
                                domClass.replace(_this.routeTopTiteArrow, "esriCTrouteDownTitleArrow", "esriCTrouteUpTitleArrow");
                                domStyle.set(query(".esriRoutesContainer")[0], "display", "block");
                                domStyle.set(_this.divFrequentRoutePanel, "display", "none");
                            } else {
                                _this.setDirectionScrollbar();
                                domClass.replace(_this.routeTopTiteArrow, "esriCTrouteUpTitleArrow", "esriCTrouteDownTitleArrow");
                                domClass.replace(_this.divFrequentRouteContainerButton, "esriCTFrequentRouteContainerButton", "esriCTFrequentRouteContainerTopButton");
                                domStyle.set(query(".esriRoutesContainer")[0], "display", "none");
                                domStyle.set(_this.divFrequentRoutePanel, "display", "block");
                            }
                        }
                    }
                };
            }
        },

        /**
        * Set scrollbar on direction panel
        * @memberOf widgets/route/routeSetting
        */
        setDirectionScrollbar: function () {
            var esriRoutesHeight, esriRoutesStyle, _this = this, containerMinHeight;
            if (dojo.configData.RoutingEnabled === "true" && lang.trim(dojo.configData.RoutingEnabled).length !== 0) {
                if (_this.esriCTrouteDirectionScrollbar) {
                    domClass.add(_this.esriCTrouteDirectionScrollbar._scrollBarContent, "esriCTZeroHeight");
                    _this.esriCTrouteDirectionScrollbar.removeScrollBar();
                    if (query(".simpleDirections .esriStopsContainer")[0]) {
                        esriRoutesHeight = document.documentElement.clientHeight - query(".esriCTApplicationHeader")[0].offsetHeight - html.coords(query(".simpleDirections .esriStopsContainer")[0]).h - 300;
                    } else {
                        esriRoutesHeight = document.documentElement.clientHeight - query(".esriCTApplicationHeader")[0].offsetHeight - 64;
                    }
                    //height fix for mobile
                    if (dojo.window.getBox().w <= 680) {
                        containerMinHeight = (document.documentElement.clientHeight - query(".esriCTApplicationHeader")[0].offsetHeight - 50) + "px";
                        domStyle.set(this.esriCTRouteContainer, "min-height", containerMinHeight);
                    }
                    esriRoutesStyle = { height: esriRoutesHeight + "px" };
                    domAttr.set(_this.divFrequentRoutePanel, "style", esriRoutesStyle);
                    _this.esriCTrouteDirectionScrollbar = new ScrollBar({ domNode: _this.esriCTRouteContainer });
                    _this.esriCTrouteDirectionScrollbar.setContent(query(".simpleDirections")[0]);
                    _this.esriCTrouteDirectionScrollbar.createScrollBar();
                }
            }
        },

        /**
        * Enable Mouse events ,mouse-over ,mouse-out ,mouse-down ,mouse-move ,mouse-up
        * @memberOf widgets/route/routeSetting
        */
        _enableMouseEvents: function () {
            var routeGraphics, dragSymbol;
            this.disableMouseEvents();
            routeGraphics = this.map.getLayer("esriCTParentDivContainer_graphics");
            dragSymbol = new SimpleMarkerSymbol(
                SimpleMarkerSymbol.STYLE_CIRCLE,
                12,
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color(dojo.configData.RouteSymbology.RouteCircleColor),
                    dojo.configData.RouteSymbology.RouteCircleWidth
                ),
                new Color(dojo.configData.RouteSymbology.RouteCircleFillColor)
            );

            this.routeGraphics_onMouseMove = on(routeGraphics, "mouse-over", lang.hitch(this, function (evt) {
                //snapping to active directions geometry on hovering
                this._initSnappingManager();
                handle.setSymbol(dragSymbol);
                clearTimeout(handle.hideTimer);
                this.map.setMapCursor("pointer");
                setTimeout(lang.hitch(this, function () {
                    this.map.snappingManager.getSnappingPoint(evt.screenPoint).then(
                        this._moveHandle
                    );
                }), 1000);
            }));
            this.routeGraphics_onMouseOut = on(routeGraphics, "mouse-out", lang.hitch(this, function () {
                //hide the handle
                clearTimeout(handle.hideTimer);
                handle.hideTimer = setTimeout(function () {
                    graphicsLayerHandle.clear();
                }, 500);
                this.map.setMapCursor("default");
            }));

            this.routeGraphics_onMouseDown = on(routeGraphics, "mouse-down", lang.hitch(this, function (evt) {
                handle.setSymbol(dragSymbol);
                this._onRouteHandle(evt);
            }));
            this.graphicsLayerHandleEventPadding_onMouseDrag = on(this.graphicsHandleEvent, "mouse-move", lang.hitch(this, function (evt) {
                this._onRouteHandle(evt);
            }));
            this.graphicsLayerHandleEventPadding_onMouseUp = on(this.graphicsHandleEvent, "mouse-up", lang.hitch(this, function (evt) {
                this.graphicsHandleEvent.clear(); //hiding circular geometry around mouse cursor which helped to deal with mouse events
                this._onMoveWaypoint(evt); //permanently moving waypoint, rebuilding directions
            }));
        },

        /**
        * Create snapping capability to the Edit toolbar.
        * @param {string} set tolerance
        * @memberOf widgets/route/routeSetting
        */
        _initSnappingManager: function (tolerance) {
            if (this.snapManager === null || this.snapManager === undefined) {
                if (!tolerance) { tolerance = 15; }
                this.snapManager = this.map.enableSnapping({
                    layerInfos: [{
                        layer: this.map.getLayer("esriCTParentDivContainer_graphics"),
                        snapToVertex: false,
                        snapToPoint: true,
                        snapToEdge: true
                    }],
                    tolerance: tolerance
                });
            }
        },

        /**
        * Add buffer geometry on map
        * @memberOf widgets/route/routeSetting
        */
        _addBufferGeometry: function () {
            var featureGeometry = [], featureIndex,
                geometryServiceUrl = dojo.configData.GeometryService,
                geometryService = new GeometryService(geometryServiceUrl);
            for (featureIndex = 1; featureIndex < this._esriDirectionsWidget.directions.features.length; featureIndex++) {
                featureGeometry.push(this._esriDirectionsWidget.directions.features[featureIndex].geometry);
            }
            if (this.countBuffer) {
                this._getIncidentGeometryOnMap(featureGeometry, geometryService);
            } else {
                this._showBufferDistance(featureGeometry, geometryService, null, null);
                this._showBufferOnRoute(featureGeometry, geometryService);
            }
        },

        /**
        * Get union of incidents falls on geometry
        * @param {object} geometry of map
        * @param {url} geometry service url
        * @memberOf widgets/route/routeSetting
        */
        _getIncidentGeometryOnMap: function (geometry, geometryService) {
            this.countBuffer = false;
            geometryService.union(geometry).then(lang.hitch(this, function (geometries) {
                var params = new BufferParameters();
                if (dojo.configData.BufferMilesForProximityAnalysis && parseInt(dojo.configData.BufferMilesForProximityAnalysis, 10) !== 0) {
                    params.distances = [parseInt(dojo.configData.BufferMilesForProximityAnalysis, 10) * this.buffercount];
                    params.unit = GeometryService.UNIT_STATUTE_MILE;
                } else if (parseInt(dojo.configData.BufferMetersForFindingBarriers, 10) !== 0) {
                    params.distances = [parseInt(dojo.configData.BufferMetersForFindingBarriers, 10)];
                    params.unit = GeometryService.UNIT_METER;
                } else {
                    this._onRouteIncidentCount(geometries);
                    return;
                }
                params.bufferSpatialReference = new esri.SpatialReference({ wkid: this.map.spatialReference.wkid });
                params.outSpatialReference = this.map.spatialReference;
                params.geometries = [geometries];
                geometryService.buffer(params, lang.hitch(this, function (bufferedRouteGeometries) {
                    this._onRouteIncidentCount(bufferedRouteGeometries[0]);
                }));
            }), function (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
        },

        /**
        * get result of incidents
        * @param{object} Create an object of buffer geometry
        * @memberOf widgets/route/routeSetting
        */
        _onRouteIncidentCount: function (onBuffergeometry) {
            var onRouteFeaturArray = [], onRouteFeatureData = [], barrierArray = [],
                index, deferredListResult, count, i;

            for (index = 0; index < dojo.configData.SearchAnd511Settings.length; index++) {
                if (dojo.configData.SearchAnd511Settings[index].BarrierLayer === "true") {
                    onRouteFeatureData.push(dojo.configData.SearchAnd511Settings[index]);
                    this._showfeatureCountResult(onRouteFeaturArray, index, onBuffergeometry);
                }
            }
            deferredListResult = new DeferredList(onRouteFeaturArray);
            deferredListResult.then(lang.hitch(this, function (result) {
                for (count = 0; count < result.length; count++) {
                    if (result[count][1].features) {
                        if (result[count][1].features.length > 0) {
                            for (i = 0; i < result[count][1].features.length; i++) {
                                barrierArray.push(result[count][1].features[i]);
                            }
                        }
                    }
                }
                this._esriDirectionsWidget.getDirections();
            }));
        },

        /**
        * Get direction widget stops name
        * @param {object} geometry of map
        * @param {url} geometry service url
        * @memberOf widgets/route/routeSetting
        */
        _showBufferDistance: function (geometry, geometryService) {
            var routeLength, routeFirstName, routeLastName, routeName;
            routeLength = this._esriDirectionsWidget.stops.length;
            routeFirstName = this._esriDirectionsWidget.stops[0].name;
            routeLastName = this._esriDirectionsWidget.stops[routeLength - 1].name;
            routeName = routeFirstName + " " + sharedNls.sentenceFragment.to + " " + routeLastName;
            geometryService.union(geometry).then(lang.hitch(this, function (geometries) {
                this.executeBufferQuery(geometries, geometryService, this.map.getLayer("esriGraphicsLayerMapSettings"), routeName);
            }), function (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
        },

        /**
        * Get buffer result of given geometry
        * @param {object} geometry of map
        * @param {url} geometry service url
        * @param {string} feature layer
        * @param {string} name of generated route
        * @memberOf widgets/route/routeSetting
        */
        executeBufferQuery: function (geometry, geometryService, featureLayer, routeName) {
            var params = new BufferParameters();
            if (parseInt(dojo.configData.BufferMilesForProximityAnalysis, 10) !== 0) {
                params.distances = [parseInt(dojo.configData.BufferMilesForProximityAnalysis, 10)];
                params.unit = GeometryService.UNIT_STATUTE_MILE;
            } else if (parseInt(dojo.configData.BufferMetersForFindingBarriers, 10) !== 0) {
                params.distances = [parseInt(dojo.configData.BufferMetersForFindingBarriers, 10)];
                params.unit = GeometryService.UNIT_METER;
            } else {
                this.showBufferRoute(featureLayer, [geometry]);
                this.onBufferInfoResult(geometry, routeName);
                return;
            }
            params.bufferSpatialReference = new esri.SpatialReference({ wkid: this.map.spatialReference.wkid });
            params.outSpatialReference = this.map.spatialReference;
            params.geometries = [geometry];
            geometryService.buffer(params, lang.hitch(this, function (bufferedGeometries) {
                this.showBufferRoute(featureLayer, bufferedGeometries);
                this.onBufferInfoResult(bufferedGeometries[0], routeName);
            }), function (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
        },

        /**
        * Show result of route buffer geometry
        * @param{object} buffer geometry
        * @param{string} name of generated route
        * @memberOf widgets/route/routeSetting
        */
        onBufferInfoResult: function (geometry, routeName) {
            if (!dojo.share) {
                domAttr.set(this.esriCTRouteInformationTitle, "innerHTML", routeName);
            } else if (window.location.toString().split("$frequentRouteId=").length > 1 || window.location.toString().split("$stops=").length > 1) {
                domAttr.set(this.esriCTRouteInformationTitle, "innerHTML", routeName);
            }
            if (this.esriCTInfoLayerFeatureList && domStyle.get(this.esriCTInfoLayerFeatureList, "display") === "block") {
                domStyle.set(this.esriCTInfoLayerFeatureList, "display", "none");
                domStyle.set(this.esriCTRouteInformationTitle, "display", "block");
                domStyle.set(this.esriCTInfoLayerTitle, "display", "block");
            }
            this.infoBufferGeometry = true;
            this.infoRouteResult = true;
            this.infoResultGeometry = geometry;
            topic.publish("hideProgressIndicator");
        },

        /**
        * get union with specify a distance (in meters) to find incidents
        * @param {object} geometry of map
        * @param {url} geometry service url
        * @memberOf widgets/route/routeSetting
        */
        _showBufferOnRoute: function (geometry, geometryService) {
            geometryService.union(geometry).then(lang.hitch(this, function (geometries) {
                if (parseInt(dojo.configData.BufferMetersForFindingBarriers, 10) !== 0) {
                    var params = new BufferParameters();
                    params.distances = [parseInt(dojo.configData.BufferMetersForFindingBarriers, 10)];
                    params.bufferSpatialReference = new esri.SpatialReference({ wkid: this.map.spatialReference.wkid });
                    params.outSpatialReference = this.map.spatialReference;
                    params.unit = GeometryService.UNIT_METER;
                    params.geometries = [geometries];
                    geometryService.buffer(params, lang.hitch(this, function (bufferedRouteGeometries) {
                        if (bufferedRouteGeometries.length > 0) {
                            this._onRouteFeatureCount(bufferedRouteGeometries[0]);
                        }
                    }));
                } else {
                    this._onRouteFeatureCount(geometries);
                }
            }), function (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
        },

        /**
        * Get result of count of incidents
        * @param{object} on route geometry
        * @memberOf widgets/route/routeSetting
        */
        _onRouteFeatureCount: function (onRoutegeometry) {
            var onRouteFeaturArray = [], onRouteFeatureData = [], countOfFeatures = 0, index,
                deferredListResult, barrierArray = [], count, i, feature;
            this.divSearchLoader = domConstruct.create("div", { "class": "esriCTRouteLoader" });
            domConstruct.place(this.divSearchLoader, query(".esriRoutesContainer")[0], "first");
            for (index = 0; index < dojo.configData.SearchAnd511Settings.length; index++) {
                if (dojo.configData.SearchAnd511Settings[index].BarrierLayer === "true") {
                    onRouteFeatureData.push(dojo.configData.SearchAnd511Settings[index]);
                    this._showfeatureCountResult(onRouteFeaturArray, index, onRoutegeometry);
                }
            }
            deferredListResult = new DeferredList(onRouteFeaturArray);
            deferredListResult.then(lang.hitch(this, function (result) {
                for (count = 0; count < result.length; count++) {
                    if (result[count][1].features) {
                        if (result[count][1].features.length > 0) {
                            for (i = 0; i < result[count][1].features.length; i++) {
                                feature = result[count][1].features[i];
                                countOfFeatures++;
                                barrierArray.push(feature);
                                if (feature.geometry && feature.geometry.type && feature.geometry.type.toLowerCase() === "polygon") {
                                    this._esriDirectionsWidget.routeParams.polygonBarriers.features.push(new Graphic(feature.geometry));
                                } else if (feature.geometry && feature.geometry.type && feature.geometry.type.toLowerCase() === "polyline") {
                                    this._esriDirectionsWidget.routeParams.polylineBarriers.features.push(new Graphic(feature.geometry));
                                } else if (feature.geometry && feature.geometry.type && feature.geometry.type.toLowerCase() === "point") {
                                    this._esriDirectionsWidget.routeParams.barriers.features.push(new Graphic(feature.geometry));
                                }
                            }
                        }
                    }
                }
                if (countOfFeatures > 0) {
                    if (this.divEmptyContainer) {
                        domConstruct.empty(this.divEmptyContainer, this.esriCTRouteInformationContent, "first");
                    }
                    this._showRouteButton(countOfFeatures, onRoutegeometry);
                }
            }));
        },

        /**
        * Show re-route button if incidents found
        * @param {count} count of feature
        * @memberOf widgets/route/routeSetting
        */
        _showRouteButton: function (countOfFeatures) {
            var showRouteInfoContent, showRouteImgContent;
            this.divShowReRouteContainer = domConstruct.create("div", { "class": "esriCTdivShowReRouteContainer" });
            domConstruct.place(this.divShowReRouteContainer, query(".esriRoutesContainer")[0], "first");
            showRouteInfoContent = domConstruct.create("div", { "class": "esriCTshowRouteInfoContent" }, this.divShowReRouteContainer);
            domAttr.set(showRouteInfoContent, "innerHTML", countOfFeatures + " " + dojo.configData.ReRouteDisplayText);
            showRouteImgContent = domConstruct.create("div", { "class": "showRouteImgContent esriCTCursorPointer" }, this.divShowReRouteContainer);
            this.own(on(showRouteImgContent, "click", lang.hitch(this, function () {
                topic.publish("showProgressIndicator");
                this.countBuffer = true;
                this.buffercount++;
                this._addBufferGeometry();
            })));
        },

        /**
        * Query to get results falls in given date
        * @param{array} on route aray of feature
        * @param{int} index of settings
        * @param{geometry} buffer geometry
        * @memberOf widgets/route/routeSetting
        */
        _showfeatureCountResult: function (onRouteFeaturArray, index, geometry) {
            var layerobject = dojo.configData.SearchAnd511Settings[index], newDate, queryLayer, queryTask,
                newTime, fullDate, queryOnRouteTask;
            if (layerobject.QueryURL) {
                queryTask = new QueryTask(layerobject.QueryURL);
                queryLayer = new Query();
                newDate = (new Date().toISOString().split("T")[0]);
                newTime = ((new Date().toISOString().split("T")[1]).split(".")[0]);
                fullDate = newDate + " " + newTime;
                if (layerobject.BarrierSearchExpression && layerobject.BarrierSearchExpression.length !== 0) {
                    queryLayer.where = string.substitute(layerobject.BarrierSearchExpression, [fullDate, fullDate]);
                } else {
                    queryLayer.where = "1=1";
                }
                queryLayer.returnGeometry = true;
                queryLayer.maxAllowableOffset = 100;
                queryLayer.outSpatialReference = { wkid: this.map.spatialReference.wkid };
                queryLayer.outFields = ["*"];
                queryLayer.geometry = geometry;
                queryLayer.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
                queryOnRouteTask = queryTask.execute(queryLayer, lang.hitch(this, function (featureSet) {
                    var deferred = new Deferred();
                    deferred.resolve(featureSet);
                    return deferred.promise;
                }), function (err) {
                    alert(err.message);
                    topic.publish("hideProgressIndicator");
                });
                onRouteFeaturArray.push(queryOnRouteTask);
            }
        },

        /**
        * Fill color in the buffer
        * @param{string} graphic layer
        * @param{geometry} buffer geometry
        * @memberOf widgets/route/routeSetting
        */
        showBufferRoute: function (layer, geometries) {
            var symbol, graphic, features, featureSet;
            this.inforesult = true;
            symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.LineSymbolTransparency.split(",")[0], 10)]),
                    2
                ),
                    new Color([parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.FillSymbolTransparency.split(",")[0], 10)])
                  );
            dojo.forEach(geometries, lang.hitch(this, function (geometry) {
                graphic = new Graphic(geometry, symbol);
                features = [];
                features.push(graphic);
                featureSet = new FeatureSet();
                featureSet.features = features;
                layer.add(featureSet.features[0]);
            }));
            if (geometries.length > 0) {
                this.map.setExtent(geometries[0].getExtent(), true);
            }
            this.clearDirection();
        }
    });
});
