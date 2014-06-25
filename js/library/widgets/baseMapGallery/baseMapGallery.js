﻿/*global define,dojo,esri,console */
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
    "dojo/_base/lang",
    "dojo/on",
    "dojo/dom",
    "dojo/_base/array",
    "dojo/text!./templates/baseMapGalleryTemplate.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/js/library/nls/localizedStrings"
], function (declare, domConstruct, lang, on, dom, array, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,

        /**
        * create baseMapGallery widget
        *
        * @class
        * @name widgets/baseMapGallery/baseMapGallery
        */
        postCreate: function () {
            var i, basemapContainer, baseMapURL = 0, baseMapURLCount = 0, baseMapLayers;
            baseMapLayers = dojo.configData.BaseMapLayers;
            for (i = 0; i < baseMapLayers.length; i++) {
                if (baseMapLayers[i].MapURL || baseMapLayers[i].length) {
                    if (baseMapURLCount === 0) {
                        baseMapURL = i;
                    }
                    baseMapURLCount++;
                }
            }
            basemapContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
            basemapContainer.appendChild(this.esriCTDivLayerContainer);
            this.layerList.appendChild(this._createBaseMapElement(baseMapURL, baseMapURLCount));
        },

        _createBaseMapElement: function (baseMapURL, baseMapURLCount) {
            var presentThumbNail, divContainer, imgThumbnail, presentBaseMap, thumbnailSrc;
            divContainer = domConstruct.create("div", { "class": "esriCTbaseMapContainerNode" });
            if (dojo.configData.BaseMapLayers[baseMapURL + 1].length) {
                thumbnailSrc = dojo.configData.BaseMapLayers[baseMapURL + 1][0].ThumbnailSource;
            } else {
                thumbnailSrc = dojo.configData.BaseMapLayers[baseMapURL + 1].ThumbnailSource;
            }
            imgThumbnail = domConstruct.create("img", { "class": "basemapThumbnail", "src": thumbnailSrc }, null);
            presentBaseMap = baseMapURL + 1;
            presentThumbNail = baseMapURL + 2;
            on(imgThumbnail, "click", lang.hitch(this, function () {
                if (dojo.configData.BaseMapLayers[presentThumbNail].length) {
                    imgThumbnail.src = dojo.configData.BaseMapLayers[presentThumbNail][0].ThumbnailSource;
                } else {
                    imgThumbnail.src = dojo.configData.BaseMapLayers[presentThumbNail].ThumbnailSource;
                }
                this._changeBaseMap(presentBaseMap);
                if (baseMapURLCount - 1 === presentThumbNail) {
                    presentThumbNail = baseMapURL;
                } else {
                    presentThumbNail++;
                }
                if (baseMapURLCount - 1 === presentBaseMap) {
                    presentBaseMap = baseMapURL;
                } else {
                    presentBaseMap++;
                }
            }));
            divContainer.appendChild(imgThumbnail);
            return divContainer;
        },

        _changeBaseMap: function (spanControl) {
            var basemap, prevIndex, basemapType;
            basemapType = "defaultBasemap";
            if (spanControl === 0) {
                prevIndex = dojo.configData.BaseMapLayers.length - 1;
            } else {
                prevIndex = spanControl - 1;
            }

            if (dojo.configData.BaseMapLayers[prevIndex].length) {
                array.forEach(dojo.configData.BaseMapLayers[prevIndex], lang.hitch(this, function (layer, index) {
                    if (this.map.getLayer(basemapType + index)) {
                        this.map.removeLayer(this.map.getLayer(basemapType + index));
                    }
                }));
            } else {
                basemap = this.map.getLayer(basemapType);
                if (basemap) {
                    this.map.removeLayer(basemap);
                }
            }
            this._selectBasemapLayers(dojo.configData.BaseMapLayers[spanControl], basemapType);
        },

        _selectBasemapLayers: function (basemapLayers, basemapLayerId) {
            var layer;
            if (basemapLayers.length) {
                array.forEach(basemapLayers, lang.hitch(this, function (basemap, index) {
                    layer = new esri.layers.ArcGISTiledMapServiceLayer(basemap.MapURL, { id: basemapLayerId + index, visible: true });
                    this.map.addLayer(layer, index);
                }));
            } else {
                layer = new esri.layers.ArcGISTiledMapServiceLayer(basemapLayers.MapURL, { id: basemapLayerId, visible: true });
                this.map.addLayer(layer, 0);
            }
        }
    });
});
