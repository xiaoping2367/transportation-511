﻿/*global define, dojo, esri, Modernizr, alert */
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
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/dom-class",
    "dojo/query",
    "dojo/string",
    "dojo/dom-geometry",
    "esri/tasks/locator",
    "esri/tasks/query",
    "../scrollBar/scrollBar",
    "dojo/Deferred",
    "dojo/DeferredList",
    "esri/tasks/QueryTask",
    "esri/geometry/Point",
    "dojo/text!./templates/locatorTemplate.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dojo/topic"
], function (declare, domConstruct, domStyle, domAttr, lang, on, domClass, query, string, domGeom, Locator, Query, ScrollBar, Deferred, DeferredList, QueryTask, Point, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, topic) {
    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        lastSearchString: null,
        stagedSearch: null,
        locatorScrollbar: null,
        screenPoint: null,

        /**
        * display locator widget
        *
        * @class
        * @name widgets/locator/locatorSetting
        */
        /**
        * filter valid results from results returned by locator service
        * @param {object} candidates Contains results from locator service
        * @memberOf widgets/locator/locatorSetting
        */
        /**
        * call locator service and get search results
        * @memberOf widgets/locator/locatorSetting
        */
        searchLocation: function () {
            var nameArray, locatorSettings, locator, searchFieldName, addressField, baseMapExtent,
                options, searchFields, addressFieldValues, addressFieldName, deferredArray, index, locatorDef,
                resultLength, deferredListResult, value;

            nameArray = { Address: [] };
            domStyle.set(this.imgSearchLoader, "display", "block");
            domStyle.set(this.close, "display", "none");
            domAttr.set(this.txtAddress, "defaultAddress", this.txtAddress.value);
            this._setHeightAddressResults();

            /**
            * call locator service specified in configuration file
            */
            locatorSettings = dojo.configData.LocatorSettings;
            locator = new Locator(locatorSettings.LocatorURL);
            searchFieldName = locatorSettings.LocatorParameters.SearchField;
            addressField = {};
            addressField[searchFieldName] = lang.trim(this.txtAddress.value);
            baseMapExtent = this.map.getLayer(this.map.layerIds[0]).fullExtent;
            options = {};
            options.address = addressField;
            options.outFields = locatorSettings.LocatorOutFields;
            options[locatorSettings.LocatorParameters.SearchBoundaryField] = baseMapExtent;
            locator.outSpatialReference = this.map.spatialReference;
            searchFields = [];
            addressFieldValues = locatorSettings.FilterFieldValues;
            addressFieldName = locatorSettings.FilterFieldName;
            for (value in addressFieldValues) {
                if (addressFieldValues.hasOwnProperty(value)) {
                    searchFields.push(addressFieldValues[value]);
                }
            }

            /**
            * get results from locator service
            * @param {object} options Contains address, outFields and basemap extent for locator service
            * @param {object} candidates Contains results from locator service
            */
            deferredArray = [];
            for (index = 0; index < dojo.configData.SearchAnd511Settings.length; index++) {
                this._locateLayersearchResult(deferredArray, dojo.configData.SearchAnd511Settings[index]);
            }
            locatorDef = locator.addressToLocations(options);
            locator.on("address-to-locations-complete", lang.hitch(this, function (candidates) {
                var deferred = new Deferred();
                deferred.resolve(candidates);
                return deferred.promise;
            }), function () {
                domStyle.set(this.imgSearchLoader, "display", "none");
                domStyle.set(this.close, "display", "block");
                this._locatorErrBack();
            });
            deferredArray.push(locatorDef);
            deferredListResult = new DeferredList(deferredArray);
            deferredListResult.then(lang.hitch(this, function (result) {
                var num, key, order, i, resultAttributes;
                if (result) {
                    if (result.length > 0) {
                        for (num = 0; num < result.length; num++) {
                            if (dojo.configData.SearchAnd511Settings[num]) {
                                key = dojo.configData.SearchAnd511Settings[num].SearchDisplayTitle;
                                nameArray[key] = [];
                                for (order = 0; order < result[num][1].features.length; order++) {
                                    resultAttributes = result[num][1].features[order].attributes;
                                    for (i in resultAttributes) {
                                        if (resultAttributes.hasOwnProperty(i)) {
                                            if (!resultAttributes[i]) {
                                                resultAttributes[i] = sharedNls.showNullValue;
                                            }
                                        }
                                    }
                                    if (nameArray[key].length < dojo.configData.LocatorSettings.MaxResults) {
                                        nameArray[key].push({
                                            name: string.substitute(dojo.configData.SearchAnd511Settings[num].SearchDisplayFields, result[num][1].features[order].attributes),
                                            attributes: resultAttributes,
                                            fields: result[num][1].fields,
                                            layer: dojo.configData.SearchAnd511Settings[num],
                                            geometry: result[num][1].features[order].geometry
                                        });
                                    }
                                }
                            } else {
                                this._addressResult(result[num][1], nameArray, searchFields, addressFieldName);
                            }
                            resultLength = result[num][1].length;
                        }
                        this._showLocatedAddress(nameArray, resultLength);
                    }
                } else {
                    domStyle.set(this.imgSearchLoader, "display", "none");
                    domStyle.set(this.close, "display", "block");
                    this.mapPoint = null;
                    this._locatorErrBack();
                }
            }));
        },

        /**
        * push results into nameArray
        * @memberOf widgets/locator/locatorSetting
        */
        _addressResult: function (candidates, nameArray, searchFields, addressFieldName) {
            var order, j;
            if (candidates.length > 0) {
                domStyle.set(this.noResultFound, "display", "none");
                domStyle.set(this.divAddressScrollContainer, "display", "block");
                domClass.add(this.divAddressScrollContent, "esriCTdivAddressScrollContent");
                for (order = 0; order < candidates.length; order++) {
                    if (candidates[order].attributes[dojo.configData.LocatorSettings.AddressMatchScore.Field] > dojo.configData.LocatorSettings.AddressMatchScore.Value) {
                        for (j in searchFields) {
                            if (searchFields.hasOwnProperty(j)) {
                                if (candidates[order].attributes[addressFieldName].toString() === searchFields[j].toString()) {
                                    if (nameArray.Address.length < dojo.configData.LocatorSettings.MaxResults) {
                                        nameArray.Address.push({
                                            name: string.substitute(dojo.configData.LocatorSettings.DisplayField, candidates[order].attributes),
                                            attributes: candidates[order]
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
                if (nameArray.Address.length === 0) {
                    setTimeout(lang.hitch(this, function () {
                        this._locatorErrBack();
                    }), 100);
                }
            } else {
                this._locatorErrBack();
            }
        },

        /**
        * query layer for searched result
        * @param {array} deferred array to push query result
        * @param {object} an instance of services
        * @memberOf widgets/locator/locatorSetting
        */
        _locateLayersearchResult: function (deferredArray, layerobject) {
            var queryTask, queryLayer, queryTaskResult, deferred;
            domStyle.set(this.imgSearchLoader, "display", "block");
            domStyle.set(this.close, "display", "none");
            if (layerobject.QueryURL) {
                queryTask = new QueryTask(layerobject.QueryURL);
                queryLayer = new Query();
                queryLayer.where = string.substitute(layerobject.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase().replace(/'/g, "''")]);
                queryLayer.outSpatialReference = this.map.spatialReference;
                queryLayer.returnGeometry = true;
                queryLayer.maxAllowableOffset = 100;
                queryLayer.outFields = ["*"];
                queryTaskResult = queryTask.execute(queryLayer, lang.hitch(this, function (featureSet) {
                    deferred = new Deferred();
                    deferred.resolve(featureSet);
                    return deferred.promise;
                }), function (err) {
                    alert(err.message);
                });
                deferredArray.push(queryTaskResult);
            }
        },

        /**
        * reset position of scrollbar
        * @memberOf widgets/locator/locatorSetting
        */
        _resetLocatorScrollBar: function () {
            var addressContentStyle, addressContentHeight;
            if (dojo.window.getBox().w <= 680) {
                if (this.locatorScrollbar) {
                    domClass.add(this.locatorScrollbar._scrollBarContent, "esriCTZeroHeight");
                    this.locatorScrollbar.removeScrollBar();
                }
                //if else to for issue of address container in mobiles
                if (window.orientation !== 0) {
                    addressContentHeight = document.documentElement.clientHeight - 100;
                } else {
                    addressContentHeight = 230;
                }
                addressContentStyle = { height: addressContentHeight + "px" };
                domAttr.set(this.divAddressScrollContent, "style", addressContentStyle);
                this.locatorScrollbar = new ScrollBar({ domNode: this.divAddressScrollContent });
                this.locatorScrollbar.setContent(this.divAddressResults);
                this.locatorScrollbar.createScrollBar();
            }

        },

        /**
        * filter valid results from results returned by locator service
        * @param {object} candidates Contains results from locator service
        * @param {int} length of candidates result
        * @memberOf widgets/locator/locatorSetting
        */
        _showLocatedAddress: function (candidates, resultLength) {
            var addrListCount = 0, addrList = [], candidateArray, divAddressCounty, divAddressSearchCell, addressContentStyle, addressContentHeight,
                candiate, listContainer, i;
            if (dojo.window.getBox().w <= 680) {
                addressContentHeight = document.documentElement.clientHeight - domGeom.getMarginBox(this.divAddressContent).h - domGeom.getMarginBox(query(".divlegendContainer")[0]).h - domGeom.getMarginBox(query(".esriCTRightTab")[0]).h - 35;
                //if else to for issue of address container in mobiles
                if (window.orientation !== 0) {
                    addressContentHeight = document.documentElement.clientHeight - 100;
                } else {
                    addressContentHeight = 230;
                }
                addressContentStyle = { height: addressContentHeight + "px" };
                if (addressContentHeight > 0) {
                    domAttr.set(this.divAddressScrollContent, "style", addressContentStyle);
                }
            }
            domConstruct.empty(this.divAddressResults);
            if (resultLength > 0 && lang.trim(this.txtAddress.value) === "") {
                this.txtAddress.focus();
                domConstruct.empty(this.divAddressResults);
                this.locatorScrollbar = new ScrollBar({ domNode: this.divAddressScrollContent });
                this.locatorScrollbar.setContent(this.divAddressResults);
                this.locatorScrollbar.createScrollBar();
                domStyle.set(this.imgSearchLoader, "display", "none");
                domStyle.set(this.close, "display", "block");
                return;
            }

            /**
            * display all the located address in the address container
            * 'this.divAddressResults' div dom element contains located addresses, created in widget template
            */

            if (this.locatorScrollbar) {
                domClass.add(this.locatorScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.locatorScrollbar.removeScrollBar();
            }
            if (resultLength > 0) {
                this.locatorScrollbar = new ScrollBar({ domNode: this.divAddressScrollContent });
                this.locatorScrollbar.setContent(this.divAddressResults);
                this.locatorScrollbar.createScrollBar();
                for (candidateArray in candidates) {
                    if (candidates.hasOwnProperty(candidateArray)) {
                        if (candidates[candidateArray].length > 0) {
                            divAddressCounty = domConstruct.create("div", { "class": "esriCTSearchGroupRow esriCTBottomBorder esriCTResultColor esriCTCursorPointer esriAddressCounty" }, this.divAddressResults);
                            divAddressSearchCell = domConstruct.create("div", { "class": "esriCTSearchGroupCell" }, divAddressCounty);
                            candiate = candidateArray + " (" + candidates[candidateArray].length + ")";
                            domConstruct.create("div", { "innerHTML": "+", "class": "plus-minus" }, divAddressSearchCell);
                            domConstruct.create("div", { "innerHTML": candiate, "class": "esriCTGroupList" }, divAddressSearchCell);
                            domStyle.set(this.imgSearchLoader, "display", "none");
                            domStyle.set(this.close, "display", "block");
                            addrList.push(divAddressSearchCell);
                            this._toggleAddressList(addrList, addrListCount);
                            addrListCount++;
                            listContainer = domConstruct.create("div", { "class": "listContainer hideAddressList" }, this.divAddressResults);
                            for (i = 0; i < candidates[candidateArray].length; i++) {
                                this._displayValidLocations(candidates[candidateArray][i], i, candidates[candidateArray], listContainer);
                            }
                        }
                    }
                }
            } else {
                domStyle.set(this.imgSearchLoader, "display", "none");
                domStyle.set(this.close, "display", "block");
                this.mapPoint = null;
                this._locatorErrBack();
            }
        },

        /**
        * Expand and collapse result on click
        * @memberOf widgets/locator/locatorSetting
        */
        _toggleAddressList: function (addressList, idx) {
            var listStatusSymbol;
            on(addressList[idx], "click", lang.hitch(this, function () {
                if (domClass.contains(query(".listContainer")[idx], "showAddressList")) {
                    domClass.toggle(query(".listContainer")[idx], "showAddressList");
                    listStatusSymbol = (domAttr.get(query(".plus-minus")[idx], "innerHTML") === "+") ? "-" : "+";
                    domAttr.set(query(".plus-minus")[idx], "innerHTML", listStatusSymbol);
                } else {
                    domClass.add(query(".listContainer")[idx], "showAddressList");
                    domAttr.set(query(".plus-minus")[idx], "innerHTML", "-");
                }
                this.locatorScrollbar.resetScrollBar();
            }));
        },

        /**
        * display valid result in search panel
        * @param {object} candidate Contains valid result to be displayed in search panel
        * @return {Boolean} true if result is displayed successfully
        * @memberOf widgets/locator/locatorSetting
        */
        _displayValidLocations: function (candidate, index, candidateArray, listContainer) {
            var esriCTrow, candidateDate, _this = this;

            domClass.remove(this.divAddressContent, "esriCTAddressResultHeight");
            domClass.add(this.divAddressContent, "esriCTAddressContainerHeight");

            esriCTrow = domConstruct.create("div", { "class": "esriCTrowTable" }, listContainer);
            candidateDate = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer" }, esriCTrow);
            domAttr.set(candidateDate, "index", index);
            try {
                if (candidate.name) {
                    domAttr.set(candidateDate, "innerHTML", candidate.name);
                } else {
                    domAttr.set(candidateDate, "innerHTML", candidate);
                }
                if (candidate.attributes.location) {
                    domAttr.set(candidateDate, "x", candidate.attributes.location.x);
                    domAttr.set(candidateDate, "y", candidate.attributes.location.y);
                    domAttr.set(candidateDate, "address", string.substitute(dojo.configData.LocatorSettings.DisplayField, candidate.attributes.attributes));
                }
            } catch (err) {
                alert(sharedNls.errorMessages.falseConfigParams);
            }
            candidateDate.onclick = function () {
                var layer, infoIndex;
                topic.publish("showProgressIndicator");
                if (_this.map.infoWindow) {
                    _this.map.infoWindow.hide();
                }
                _this.txtAddress.value = this.innerHTML;
                domAttr.set(_this.txtAddress, "defaultAddress", _this.txtAddress.value);
                _this._hideAddressContainer();
                topic.publish("resetDirectionTab");
                if (candidate.attributes.location) {
                    dojo.setMapTipPosition = true;
                    _this.mapPoint = new Point(domAttr.get(this, "x"), domAttr.get(this, "y"), _this.map.spatialReference);
                    topic.publish("locateAddressOnMap", _this.mapPoint);
                } else {
                    if (candidateArray[domAttr.get(candidateDate, "index", index)]) {
                        dojo.setMapTipPosition = false;
                        layer = candidateArray[domAttr.get(candidateDate, "index", index)].layer.QueryURL;
                        for (infoIndex = 0; infoIndex < dojo.configData.SearchAnd511Settings.length; infoIndex++) {
                            if (dojo.configData.InfoWindowSettings[infoIndex] && dojo.configData.InfoWindowSettings[infoIndex].InfoQueryURL.toString() === layer.toString()) {
                                _this._showFeatureResultsOnMap(candidateArray, candidate, infoIndex, index);
                            } else if (dojo.configData.SearchAnd511Settings[infoIndex].QueryURL === layer) {
                                if (candidate.geometry.type === "polyline") {
                                    _this._showRoadResultsOnMap(candidate);
                                } else {
                                    alert(sharedNls.errorMessages.noDirection);
                                }
                            }
                        }
                    }
                }
            };
        },

        /**
        * Show polyline result on map
        * @param {object} to get geometry points
        * @memberOf widgets/locator/locatorSetting
        */
        _showRoadResultsOnMap: function (candidate) {
            var candidatePoint;
            this.map.setLevel(dojo.configData.ZoomLevel);
            candidatePoint = candidate.geometry.getPoint(0, 0);
            this.map.centerAt(candidatePoint);
            topic.publish("hideProgressIndicator");
        },

        /**
        * Show point feature result on map
        * @memberOf widgets/locator/locatorSetting
        */
        _showFeatureResultsOnMap: function (candidateArray, candidate, infoIndex, index) {
            var featurePoint;
            dojo.showIndicator = false;
            domStyle.set(this.imgSearchLoader, "display", "block");
            domStyle.set(this.close, "display", "none");
            this.txtAddress.value = candidate.name;
            if (candidateArray[index].geometry.type === "point") {
                this.createInfoWindowContent(candidateArray[index].geometry, candidateArray[index].attributes, candidateArray[index].fields, infoIndex, null, null, this.map, false);
            } else if (candidateArray[index].geometry.type === "polyline") {
                featurePoint = candidateArray[index].geometry.getPoint(0, 0);
                this.createInfoWindowContent(featurePoint, candidateArray[index].attributes, candidateArray[index].fields, infoIndex, null, null, this.map, false);
            }
        },

        /**
        * create infowindow content
        * @memberOf widgets/locator/locatorSetting
        */
        createInfoWindowContent: function (mapPoint, attributes, fields, infoIndex, featureArray, count, map, isInfoArrowClicked) {
            var screenPoint, i, j, objID, layerSettings, infoPopupFieldsCollection, key,
                divInfoRow, utcMilliseconds, divInfoDetailsTab, fieldNames, link, divLink,
                infoTitle, mobTitle;
            if (!infoIndex && infoIndex !== 0) {
                topic.publish("hideInfoWindowOnMap");
                if (window.location.toString().split("$featurepoint=").length <= 1) {
                    map.setExtent(this._calculateCustomMapExtent(mapPoint));
                }
                topic.publish("hideProgressIndicator");
                return;
            }
            if (featureArray) {
                if (window.location.toString().split("$featurepoint=").length <= 1 || !dojo.isInfoWinodwShareExtent) {
                    if (featureArray.length > 1 && parseInt(count, 10) !== featureArray.length - 1) {
                        domClass.add(query(".esriCTdivInfoRightArrow")[0], "esriCTShowInfoRightArrow");
                        domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", count);
                    } else {
                        domClass.remove(query(".esriCTdivInfoRightArrow")[0], "esriCTShowInfoRightArrow");
                        domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", "");
                    }
                    if (count > 0 && count < featureArray.length) {
                        domClass.add(query(".esriCTdivInfoLeftArrow")[0], "esriCTShowInfoLeftArrow");
                        domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", count + 1);
                    } else {
                        domClass.remove(query(".esriCTdivInfoLeftArrow")[0], "esriCTShowInfoLeftArrow");
                        domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", count + 1);
                    }
                }
            } else {
                domClass.remove(query(".esriCTdivInfoRightArrow")[0], "esriCTShowInfoRightArrow");
                domClass.remove(query(".esriCTdivInfoLeftArrow")[0], "esriCTShowInfoLeftArrow");
                domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", "");
                domAttr.set(query(".esriCTdivInfoTotalFeatureCount")[0], "innerHTML", "");
            }
            for (i = 0; i < fields.length; i++) {
                if (fields[i].type === "esriFieldTypeOID") {
                    objID = fields[i].name;
                    break;
                }
            }
            dojo.featurePoint = attributes[objID];
            dojo.LayerID = infoIndex;
            layerSettings = dojo.configData;
            infoPopupFieldsCollection = layerSettings.InfoWindowSettings[infoIndex].InfoWindowData;
            divInfoDetailsTab = domConstruct.create("div", { "class": "esriCTInfoDetailsTab" }, null);
            this.divInfoDetailsContainer = domConstruct.create("div", { "class": "divInfoDetailsContainer" }, divInfoDetailsTab);
            for (key = 0; key < infoPopupFieldsCollection.length; key++) {
                divInfoRow = domConstruct.create("div", { "className": "esriCTDisplayRow" }, this.divInfoDetailsContainer);
                // Create the row's label
                this.divInfoDisplayField = domConstruct.create("div", { "className": "esriCTDisplayField", "innerHTML": infoPopupFieldsCollection[key].DisplayText }, divInfoRow);
                this.divInfoFieldValue = domConstruct.create("div", { "className": "esriCTValueField" }, divInfoRow);
                for (i in attributes) {
                    if (attributes.hasOwnProperty(i)) {
                        if (!attributes[i]) {
                            attributes[i] = sharedNls.showNullValue;
                        }
                    }
                }
                for (j = 0; j < fields.length; j++) {
                    if (fields[j].type === "esriFieldTypeDate") {
                        if (attributes[fields[j].name]) {
                            if (Number(attributes[fields[j].name])) {
                                utcMilliseconds = Number(attributes[fields[j].name]);
                                attributes[fields[j].name] = dojo.date.locale.format(this.utcTimestampFromMs(utcMilliseconds), {
                                    datePattern: dojo.configData.FormatDateAs,
                                    selector: "date"
                                });
                            }
                        }
                    }
                }
                fieldNames = string.substitute(infoPopupFieldsCollection[key].FieldName, attributes);
                if (string.substitute(infoPopupFieldsCollection[key].FieldName, attributes).match("http:") || string.substitute(infoPopupFieldsCollection[key].FieldName, attributes).match("https:")) {
                    link = fieldNames;
                    //Check if url is of image then create image in Infopopup
                    if (link.match(/\.(jpeg|jpg|gif|png)$/) !== null) {
                        divLink = domConstruct.create("img", { "class": "esriCTLinkImg" }, this.divInfoFieldValue);
                        domAttr.set(divLink, "src", link);
                    } else if (layerSettings.SearchAnd511Settings[infoIndex].SearchDisplayTitle === "Video Cameras") {
                        divLink = domConstruct.create("div", { "class": "esriCTLink" }, this.divInfoFieldValue);
                        this._renderVideoContent(link, divLink);
                    } else {
                        divLink = domConstruct.create("div", { "class": " esriCTInfoLink", innerHTML: sharedNls.buttons.link }, this.divInfoFieldValue);
                        on(divLink, "click", lang.hitch(this, this._makeWindowOpenHandler(link)));
                    }
                    domClass.replace(this.divInfoFieldValue, "esriCTValueFieldLink", "esriCTValueField");
                } else {
                    this.divInfoFieldValue.innerHTML = fieldNames;
                }
            }
            for (j in attributes) {
                if (attributes.hasOwnProperty(j)) {
                    if (!attributes[j]) {
                        attributes[j] = sharedNls.showNullValue;
                    }
                }
            }
            infoTitle = string.substitute(layerSettings.InfoWindowSettings[infoIndex].InfoWindowHeaderField, attributes);
            //Check if InfowindowContent available if not then showing infp title as mobile title.
            //In WebMap case infowindow contents will be not available
            if (layerSettings.InfoWindowSettings[infoIndex].InfoWindowContent) {
                mobTitle = string.substitute(layerSettings.InfoWindowSettings[infoIndex].InfoWindowContent, attributes);
            } else {
                mobTitle = infoTitle;
            }
            dojo.selectedMapPoint = mapPoint;
            if (isInfoArrowClicked) {
                domClass.remove(query(".esriCTdivInfoRightArrow")[0], "disableArrow");
                domClass.remove(query(".esriCTdivInfoLeftArrow")[0], "disableArrow");
                screenPoint = map.toScreen(dojo.selectedMapPoint);
                screenPoint.y = map.height - screenPoint.y;
                topic.publish("setInfoWindowOnMap", infoTitle, mobTitle, divInfoDetailsTab, screenPoint);
                topic.publish("setMapTipPosition", dojo.selectedMapPoint);
                topic.publish("hideProgressIndicator");
            } else {
                domClass.remove(query(".esriCTdivInfoRightArrow")[0], "disableArrow");
                domClass.remove(query(".esriCTdivInfoLeftArrow")[0], "disableArrow");
                this._centralizeInfowindowOnMap(map, infoTitle, mobTitle, divInfoDetailsTab);

            }
        },

        /**
        * Set InfoWinodw Position on map
        * @memberOf widgets/locator/locatorSetting
        */
        _centralizeInfowindowOnMap: function (map, infoTitle, mobTitle, divInfoDetailsTab) {
            var extentChanged, screenPoint;
            if (dojo.isInfoWinodwShareExtent) {
                screenPoint = map.toScreen(dojo.selectedMapPoint);
                screenPoint.y = map.height - screenPoint.y;
                topic.publish("setInfoWindowOnMap", infoTitle, mobTitle, divInfoDetailsTab, screenPoint);
                dojo.isInfoWinodwShareExtent = false;
            } else {
                extentChanged = map.setExtent(this._calculateCustomMapExtent(dojo.selectedMapPoint));
                extentChanged.then(lang.hitch(this, function () {
                    screenPoint = map.toScreen(dojo.selectedMapPoint);
                    screenPoint.y = map.height - screenPoint.y;
                    topic.publish("setInfoWindowOnMap", infoTitle, mobTitle, divInfoDetailsTab, screenPoint);
                }));
            }
            topic.publish("hideProgressIndicator");
        },

        /**
        * open link in a window on clicking of it
        * @param {url} get link url
        * @memberOf widgets/locator/locatorSetting
        */
        _makeWindowOpenHandler: function (link) {
            return function () {
                window.open(link);
            };
        },

        /**
        * Convert time
        * @return {object} Date object
        * @memberOf widgets/locator/locatorSetting
        */
        utcTimestampFromMs: function (utcMilliseconds) { // returns Date
            return this.localToUtc(new Date(utcMilliseconds));
        },

        /**
        * Convert time
        * @return {object} Date object
        * @memberOf widgets/locator/locatorSetting
        */
        localToUtc: function (localTimestamp) { // returns Date
            return new Date(localTimestamp.getTime() + (localTimestamp.getTimezoneOffset() * 60000));
        },

        /**
        * Set video contnet in info window
        * @memberOf widgets/locator/locatorSetting
        */
        _renderVideoContent: function (pageContentModule, pageModule) {
            var embed = '';
            embed += "<video width=" + "90%" + " height=" + "150" + "px src='" + pageContentModule + "' frameborder=0 webkitAllowFullScreen mozallowfullscreen allowFullScreen></video>";
            pageModule.innerHTML = embed;
        },

        /**
        * calculate map extent
        * @return {geometry} extent geometry
        * @memberOf widgets/locator/locatorSetting
        */
        _calculateCustomMapExtent: function (mapPoint) {
            var width, infoWidth, height, diff, ratioHeight, ratioWidth, totalYPoint, xmin,
                ymin, xmax, ymax;

            width = this.map.extent.getWidth();
            infoWidth = (this.map.width / 2) + dojo.configData.InfoPopupWidth / 2 + 400;
            height = this.map.extent.getHeight();
            if (infoWidth > this.map.width) {
                diff = infoWidth - this.map.width;
            } else {
                diff = 0;
            }
            ratioHeight = height / this.map.height;
            ratioWidth = width / this.map.width;
            totalYPoint = dojo.configData.InfoPopupHeight + 30 + 61;
            xmin = mapPoint.x - (width / 2);
            if (dojo.window.getBox().w >= 680) {
                ymin = mapPoint.y - height + (ratioHeight * totalYPoint);
                xmax = xmin + width + diff * ratioWidth;
            } else {
                ymin = mapPoint.y - (height / 2);
                xmax = xmin + width;
            }
            ymax = ymin + height;
            return new esri.geometry.Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
        }

    });
});
