﻿/*global dojo,define,document */
/*jslint sloppy:true */
/** @license
| Version 10.2
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
    "dojo/_base/array",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom",
    "dojo/query",
    "dojo/dom-class",
    "esri/tasks/RouteParameters",
    "esri/tasks/FeatureSet",
    "dojo/dom-geometry",
    "esri/tasks/GeometryService",
    "dojo/string",
    "dojo/_base/html",
    "dojo/text!./templates/getRoute.html",
    "esri/urlUtils",
    "esri/tasks/query",
    "esri/dijit/Directions",
    "esri/tasks/QueryTask",
    "dojo/Deferred",
    "dojo/DeferredList",
    "esri/dijit/editing/Union",
    "dijit/layout/BorderContainer",
    "esri/symbols/SimpleLineSymbol",
    "dijit/layout/ContentPane",
    "../scrollBar/scrollBar",
    "esri/graphic",
    "dojo/_base/Color",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "dojo/aspect",
    "esri/tasks/DataFile",
     "dojo/cookie",
    "esri/tasks/BufferParameters",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!nls/localizedStrings",
    "esri/geometry/Polyline",
    "esri/SnappingManager",
    "esri/symbols/CartographicLineSymbol",
    "esri/layers/GraphicsLayer"
  ],
function (declare, domConstruct, on, topic, lang, array, domStyle, domAttr, dom, query, domClass, RouteParameters, FeatureSet, domGeom, GeometryService, string, html, template, urlUtils, Query, Directions, QueryTask, Deferred, DeferredList, Union, _BorderContainer, SimpleLineSymbol, _ContentPane, scrollBar, Graphic, Color, SimpleFillSymbol, SimpleMarkerSymbol, aspect, DataFile, cookie, BufferParameters, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, nls, Polyline, SnappingManager, CartographicLineSymbol, GraphicsLayer) {

    //========================================================================================================================//

    return declare([_BorderContainer, _ContentPane, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        nls: nls,
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
        * @memberOf widgets/route/route
        */
        showRoute: function () {
            esriConfig.defaults.io.alwaysUseProxy = true;
            var directionsUnits = dojo.configData.RouteSymbology.DirectionUnits;

            if (!this._esriDirectionsWidget) {
                this._esriDirectionsWidget = new Directions({
                    map: this.map,
                    directionsLengthUnits: directionsUnits,
                    routeTaskUrl: dojo.configData.RouteTaskService
                }, domConstruct.create("div", {}, this.esriCTRouteContainer));
                this._esriDirectionsWidget.options.geocoderOptions.autoComplete = true;
                this._esriDirectionsWidget.startup();
                //barriers feature set
                this._esriDirectionsWidget.routeParams.barriers = new FeatureSet();
                this._esriDirectionsWidget.routeParams.polylineBarriers = new FeatureSet();
                this._esriDirectionsWidget.routeParams.polygonBarriers = new FeatureSet();

                this._esriDirectionsWidget.options.routeSymbol.color = new Color([parseInt(dojo.configData.RouteSymbology.ColorRGB.split(",")[0]), parseInt(dojo.configData.RouteSymbology.ColorRGB.split(",")[1]), parseInt(dojo.configData.RouteSymbology.ColorRGB.split(",")[2]), parseFloat(dojo.configData.RouteSymbology.Transparency.split(",")[0])]);
                this._esriDirectionsWidget.options.routeSymbol.width = parseInt(dojo.configData.RouteSymbology.Width);
                if (dojo.configData.FrequentRoutesLayer.FrequentRoutesEnabled == "true" && lang.trim(dojo.configData.FrequentRoutesLayer.FrequentRoutesEnabled).length != 0) {
                    var divFrequentRoute = domConstruct.create("div", { "class": "esriCTdivFrequentRoute" });
                    domConstruct.place(divFrequentRoute, query(".esriRoutesContainer")[0], "first");
                    this.routeLoader = domConstruct.create("img", { "class": "esriCTInfoLoader" }, divFrequentRoute);
                    domAttr.set(this.routeLoader, "src", dojoConfig.baseURL + "/js/library/themes/images/blue-loader.gif");
                }
                this.own(on(this._esriDirectionsWidget, "directions-finish", lang.hitch(this, function (evt) {
                    topic.publish("showProgressIndicator");
                    if (this._esriDirectionsWidget.directions != null) {
                        this._onDirectionFinish();
                    } else {
                        this._routeGeocodersResult();
                        if (!this.resultLength) {
                            this._showErrorResult();
                            this._clearAllGraphics();
                        }
                        topic.publish("hideProgressIndicator");
                    }
                }), function (err) {
                    alert(err.message);
                    topic.publish("hideProgressIndicator");
                }));
                this.own(on(this._esriDirectionsWidget, "add-stops", lang.hitch(this, function (evt) {
                    this._routeGeocodersResult();
                    if (!this.resultLength) {
                        topic.publish("showProgressIndicator");
                        this._esriDirectionsWidget.getDirections();
                    }
                })));
                this._persistRouteAddress();
            }
        },

        _routeGeocodersResult: function () {
            this.resultLength = false;
            for (var j = 0; j < this._esriDirectionsWidget.geocoders.length; j++) {
                if (this._esriDirectionsWidget.geocoders[j].results.length == 0 && this._esriDirectionsWidget.stops[j].name == "") {
                    this.resultLength = true;
                    break;
                }
            }
        },

        _onRouteHandle: function (evt) {
            dojo.stopEvent(evt);
            this._moveHandle(evt.mapPoint);
            //using the handle.eventPadding 1px length line with a 512px-width symbol around the handle
            //so if user moves cursor too fast, graphicsLayterHandle will still produce onMouseMove events
            //while draggin the Handle
            var r = Math.max(this.map.toMap(new esri.geometry.Point(0, 0)).y - this.map.toMap(new esri.geometry.Point(0, 1)).y, 1);
            var pl = new esri.geometry.Polyline({ paths: [[[evt.mapPoint.x, evt.mapPoint.y - r], [evt.mapPoint.x, evt.mapPoint.y + r]]] });
            pl.setSpatialReference(graphicsHandleEvent.spatialReference);
            if (!handle.eventPadding) {
                handle.eventPadding = new Graphic(pl);
            }
            handle.eventPadding.setGeometry(pl);
            graphicsHandleEvent.clear();
            graphicsHandleEvent.add(handle.eventPadding);
            this.map.addLayer(graphicsHandleEvent);
        },

        _onMoveWaypoint: function (evt) {
            var stopIndex = Math.ceil(this._esriDirectionsWidget.stops.length / 2);
            this._esriDirectionsWidget.addStop(evt.mapPoint, stopIndex);
            this._esriDirectionsWidget.clearDirections();
        },

        _moveHandle: function (point) {
            //moving handle
            handle.geometry = point;
            graphicsLayerHandle.clear();
            graphicsLayerHandle.add(handle);
        },

        _persistRouteAddress: function () {
            var storage, stops;
            stops = [];
            storage = window.localStorage;
            if (storage) {
                stops.push((storage.getItem("SourceAddress") !== null) ? storage.getItem("SourceAddress") : "");
                stops.push((storage.getItem("DestAddress") !== null) ? storage.getItem("DestAddress") : "");
            } else {
                if (cookie.isSupported()) {
                    stops.push((cookie("SourceAddress") != undefined) ? cookie("SourceAddress") : "");
                    stops.push((cookie("DestAddress") != undefined) ? cookie("DestAddress") : "");
                }
            }
            this._esriDirectionsWidget.updateStops(stops);
        },

        _onDirectionFinish: function () {
            this.esriRoute = false;
            domStyle.set(this.divFrequentRoutePanel, "display", "none");
            this.infoPanelHeight = false;
            domStyle.set(query(".esriRoutesContainer")[0], "display", "block");
            this._showHideFrequentRouteContainer();
            this.own(on(this._esriDirectionsWidget, "add-stops", lang.hitch(this, function () {
            })));
            this.inforesult = true;
            this._clearAllGraphics();
            this._addBufferGeometry();
            this._enableMouseEvents();
            var esriRoutesHeight = window.innerHeight - query(".esriCTApplicationHeader")[0].offsetHeight - html.coords(query(".simpleDirections .esriStopsContainer")[0]).h - 100;
            var esriRoutesStyle = { height: esriRoutesHeight + 'px' };
            domAttr.set(query(".esriRoutes")[0], "style", esriRoutesStyle);
            domAttr.set(query(".esriResultsPrint")[0], "innerHTML", nls.print);
            if (!this.esriCTrouteDirectionScrollbar) {
                this.esriCTrouteDirectionScrollbar = new scrollBar({ domNode: this.esriCTRouteContainer });
                this.esriCTrouteDirectionScrollbar.setContent(query(".simpleDirections")[0]);
                this.esriCTrouteDirectionScrollbar.createScrollBar();
            }
        },

        _enableMouseEvents: function () {
            this.disableMouseEvents();
            var routeGraphics = this.map.getLayer("esriCTParentDivContainer_graphics");
            var dragSymbol = new SimpleMarkerSymbol(
                SimpleMarkerSymbol.STYLE_CIRCLE,
                12,
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color(dojo.configData.RouteSymbology.RouteCircleColor), dojo.configData.RouteSymbology.RouteCirclewidth
                ),
                new Color(dojo.configData.RouteSymbology.RouteFillCircleColor)
				);

            this.routeGraphics_onMouseMove = on(routeGraphics, "mouse-over", lang.hitch(this, function (evt) {
                //snapping to active directions geometry on hovering
                this._initSnappingManager();
                handle.setSymbol(dragSymbol);
                clearTimeout(handle.hideTimer);
                this.map.setMapCursor("pointer");
                this.map.snappingManager.getSnappingPoint(evt.screenPoint).then(this._moveHandle);
            }));
            this.routeGraphics_onMouseOut = on(routeGraphics, "mouse-out", lang.hitch(this, function (evt) {
                //hide the handle
                clearTimeout(handle.hideTimer);
                handle.hideTimer = setTimeout("graphicsLayerHandle.clear();", 500);
                this.map.setMapCursor("default");
            }));

            this.routeGraphics_onMouseDown = on(routeGraphics, "mouse-down", lang.hitch(this, function (evt) {
                handle.setSymbol(dragSymbol);
                this._onRouteHandle(evt);
            }));

            this.graphicsLayerHandleEventPadding_onMouseDrag = on(graphicsHandleEvent, "mouse-move", lang.hitch(this, function (evt) {
                this._onRouteHandle(evt);
            }));
            this.graphicsLayerHandleEventPadding_onMouseUp = on(graphicsHandleEvent, "mouse-up", lang.hitch(this, function (evt) {
                graphicsHandleEvent.clear(); //hiding circular geometry around mouse cursor which helped to deal with mouse events
                this._onMoveWaypoint(evt); //permanently moving waypoint, rebuilding directions
            }));
        },

        _initSnappingManager: function (tolerance) {
            if (this.snapManager == null) {
                if (!tolerance) tolerance = 15;
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

        _addBufferGeometry: function () {
            var featureGeometry = [];
            var geometryServiceUrl = dojo.configData.GeometryService;
            var geometryService = new GeometryService(geometryServiceUrl);
            for (var featureIndex = 1; featureIndex < this._esriDirectionsWidget.directions.features.length; featureIndex++) {
                featureGeometry.push(this._esriDirectionsWidget.directions.features[featureIndex].geometry);
            }
            if (this.countBuffer) {
                this._getIncidentGeometryOnMap(featureGeometry, geometryService);
            }
            else {
                this._showBufferDistance(featureGeometry, geometryService, null, null);
                this._showBufferOnRoute(featureGeometry, geometryService);
            }
        },

        _getIncidentGeometryOnMap: function (geometry, geometryService) {
            this.countBuffer = false;
            geometryService.union(geometry).then(lang.hitch(this, function (geometries) {
                var params = new BufferParameters();
                params.distances = [parseInt(dojo.configData.BufferMilesForProximityAnalysis) * this.buffercount];
                params.bufferSpatialReference = new esri.SpatialReference({ wkid: this.map.spatialReference.wkid });
                params.outSpatialReference = this.map.spatialReference;
                params.unit = GeometryService.UNIT_STATUTE_MILE;
                params.geometries = [geometries];
                geometryService.buffer(params, lang.hitch(this, function (bufferedRouteGeometries) {
                    this._onRouteIncidentCount(bufferedRouteGeometries[0]);
                }));
            }), function (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
        },

        _onRouteIncidentCount: function (onBuffergeometry) {
            var onRouteFeaturArray = [];
            var onRouteFeatureData = [];
            var countOfFeatures = 0;
            for (var index = 0; index < dojo.configData.SearchAnd511Settings.length; index++) {
                if (dojo.configData.SearchAnd511Settings[index].BarrierLayer == "true") {
                    onRouteFeatureData.push(dojo.configData.SearchAnd511Settings[index]);
                    this._showfeatureCountResult(onRouteFeaturArray, index, onBuffergeometry);
                }
            }
            var deferredListResult = new DeferredList(onRouteFeaturArray);
            var barrierArray = [];
            deferredListResult.then(lang.hitch(this, function (result) {
                for (count = 0; count < result.length; count++) {
                    if (result[count][1].features) {
                        if (result[count][1].features.length > 0) {
                            dojo.forEach(result[count][1].features, lang.hitch(this, function (feature) {
                                countOfFeatures++;
                                barrierArray.push(feature);
                            }));
                        }
                    }
                }
                this._esriDirectionsWidget.getDirections();
            }));
        },

        _showBufferDistance: function (geometry, geometryService, featureLayer, frequentRouteName) {
            esriConfig.defaults.io.alwaysUseProxy = true;
            var routeLength = this._esriDirectionsWidget.stops.length;
            var routeFirstName = this._esriDirectionsWidget.stops[0].name;
            var routeLastName = this._esriDirectionsWidget.stops[routeLength - 1].name;
            var routeName = routeFirstName + " " + nls.to + " " + routeLastName;
            geometryService.union(geometry).then(lang.hitch(this, function (geometries) {
                this.executeBufferQuery(geometries, geometryService, this.map.getLayer("esriGraphicsLayerMapSettings"), routeName);
            }), function (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
        },

        executeBufferQuery: function (geometry, geometryService, featureLayer, routeName) {
            var params = new BufferParameters();
            params.distances = [parseInt(dojo.configData.BufferMilesForProximityAnalysis)];
            params.bufferSpatialReference = new esri.SpatialReference({ wkid: this.map.spatialReference.wkid });
            params.outSpatialReference = this.map.spatialReference;
            params.unit = GeometryService.UNIT_STATUTE_MILE;
            params.geometries = [geometry];
            geometryService.buffer(params, lang.hitch(this, function (bufferedGeometries) {
                this.showBufferRoute(featureLayer, bufferedGeometries);
                this.onBufferInfoResult(bufferedGeometries[0], routeName);
            }), function (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
        },

        onBufferInfoResult: function (geometry, routeName) {
            domAttr.set(this.esriCTRouteInformationTitle, "innerHTML", routeName);
            if (domStyle.get(this.esriCTInfoLayerFeatureList, "display", "block") == "block") {
                domStyle.set(this.esriCTInfoLayerFeatureList, "display", "none");
                domStyle.set(this.esriCTRouteInformationTitle, "display", "block");
                domStyle.set(this.esriCTInfoLayerTitle, "display", "block");
            }
            this._infoResult(geometry);
        },

        _showBufferOnRoute: function (geometry, geometryService) {
            esriConfig.defaults.io.alwaysUseProxy = true;
            geometryService.union(geometry).then(lang.hitch(this, function (geometries) {
                var params = new BufferParameters();
                params.distances = [parseInt(dojo.configData.BufferMetersForFindingBarriers)];
                params.bufferSpatialReference = new esri.SpatialReference({ wkid: this.map.spatialReference.wkid });
                params.outSpatialReference = this.map.spatialReference;
                params.unit = GeometryService.UNIT_METER;
                params.geometries = [geometries];
                geometryService.buffer(params, lang.hitch(this, function (bufferedRouteGeometries) {
                    if (bufferedRouteGeometries.length > 0) {
                        this._onRouteFeatureCount(geometries);
                    }
                }));
            }), function (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
        },

        _onRouteFeatureCount: function (onRoutegeometry) {
            topic.publish("hideInfoWindowOnMap");
            this.divSearchLoader = domConstruct.create("div", { "class": "esriCTRouteLoader" });
            domConstruct.place(this.divSearchLoader, query(".esriRoutesContainer")[0], "first");
            var onRouteFeaturArray = [];
            var onRouteFeatureData = [];
            var countOfFeatures = 0;
            for (var index = 0; index < dojo.configData.SearchAnd511Settings.length; index++) {
                if (dojo.configData.SearchAnd511Settings[index].BarrierLayer == "true") {
                    onRouteFeatureData.push(dojo.configData.SearchAnd511Settings[index]);
                    this._showfeatureCountResult(onRouteFeaturArray, index, onRoutegeometry);
                }
            }
            var deferredListResult = new DeferredList(onRouteFeaturArray);
            var barrierArray = [];
            deferredListResult.then(lang.hitch(this, function (result) {
                for (var count = 0; count < result.length; count++) {
                    if (result[count][1].features) {
                        if (result[count][1].features.length > 0) {
                            dojo.forEach(result[count][1].features, lang.hitch(this, function (feature) {
                                countOfFeatures++;
                                barrierArray.push(feature);
                                if (feature.geometry && feature.geometry.type && feature.geometry.type.toLowerCase() == "polygon") {
                                    this._esriDirectionsWidget.routeParams.polygonBarriers.features.push(new Graphic(feature.geometry));
                                } else if (feature.geometry && feature.geometry.type && feature.geometry.type.toLowerCase() == "polyline") {
                                    this._esriDirectionsWidget.routeParams.polylineBarriers.features.push(new Graphic(feature.geometry));
                                } else if (feature.geometry && feature.geometry.type && feature.geometry.type.toLowerCase() == "point") {
                                    this._esriDirectionsWidget.routeParams.barriers.features.push(new Graphic(feature.geometry));
                                }
                            }));
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

        _showRouteButton: function (countOfFeatures) {
            var count = 0;
            this.divShowReRouteContainer = domConstruct.create("div", { "class": "esriCTdivShowReRouteContainer" });
            domConstruct.place(this.divShowReRouteContainer, query(".esriRoutesContainer")[0], "first");
            var showRouteInfoContent = domConstruct.create("div", { "class": "esriCTshowRouteInfoContent" }, this.divShowReRouteContainer);
            domAttr.set(showRouteInfoContent, "innerHTML", countOfFeatures + " " + nls.reRouteDisplayText);
            var showRouteImgContent = domConstruct.create("div", { "class": "showRouteImgContent esriCTCursorPointer" }, this.divShowReRouteContainer);
            this.own(on(showRouteImgContent, "click", lang.hitch(this, function (evt) {
                topic.publish("showProgressIndicator");
                this.countBuffer = true;
                count++;
                this.buffercount++;
                this._addBufferGeometry();
            })));
        },

        _showfeatureCountResult: function (onRouteFeaturArray, index, geometry) {
            var layerobject = dojo.configData.SearchAnd511Settings[index];
            if (layerobject.QueryURL) {
                var queryTask = new QueryTask(layerobject.QueryURL);
                var query = new Query();
                var newDate = (new Date().toISOString().split("T")[0]);
                var newTime = ((new Date().toISOString().split("T")[1]).split(".")[0]);
                var fullDate = newDate + " " + newTime;
                if (layerobject.BarrierSearchExpression && layerobject.BarrierSearchExpression.length != 0) {
                    query.where = string.substitute(layerobject.BarrierSearchExpression, [fullDate, fullDate]);
                } else {
                    query.where = "1=1";
                }
                query.returnGeometry = true;
                query.outSpatialReference = { wkid: this.map.spatialReference.wkid };
                query.outFields = ["*"];
                query.geometry = geometry;
                query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
                var queryOnRouteTask = queryTask.execute(query, lang.hitch(this, function (featureSet) {
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

        showBufferRoute: function (layer, geometries) {
            this.inforesult = true;
            var symbol = new SimpleFillSymbol(
                    SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(
                      SimpleLineSymbol.STYLE_SOLID,
                      new Color([parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[0]), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[1]), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[2]), parseFloat(dojo.configData.BufferSymbology.LineSymbolTransparency.split(",")[0])]), 2
                    ),
                    new Color([parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[0]), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[1]), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[2]), parseFloat(dojo.configData.BufferSymbology.FillSymbolTransparency.split(",")[0])])
                  );
            dojo.forEach(geometries, lang.hitch(this, function (geometry) {
                var graphic = new Graphic(geometry, symbol);
                var features = [];
                features.push(graphic);
                var featureSet = new FeatureSet();
                featureSet.features = features;
                layer.add(featureSet.features[0]);
            }));
        }
    });
});