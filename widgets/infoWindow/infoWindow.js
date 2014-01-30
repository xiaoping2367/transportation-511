﻿/*global define, document, Modernizr */
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
        "dojo/dom-style",
        "dojo/dom-attr",
        "dojo/_base/lang",
        "dojo/on",
        "dojo/dom-geometry",
        "dojo/dom",
        "dojo/dom-class",
        "dojo/string",
        "dojo/topic",
        "esri/domUtils",
        "esri/InfoWindowBase",
        "dojo/text!./templates/infoWindow.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "esri/tasks/query",
        "dijit/_WidgetsInTemplateMixin"
],
 function (declare, domConstruct, domStyle, domAttr, lang, on, domGeom, dom, domClass, string, topic, domUtils, InfoWindowBase, template, _WidgetBase, _TemplatedMixin, query, _WidgetsInTemplateMixin) {
     return declare([InfoWindowBase, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
         templateString: template,
         InfoShow: null,

         postCreate: function () {
             if (!this.infoWindowWidth) {
                 this.infoWindowWidth = "100px";
             }
             if (!this.infoWindowHeight) {
                 this.infoWindowHeight = "100px";
             }
             this.infoWindowContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
             this.infoWindowContainer.appendChild(this.domNode);
             this._anchor = domConstruct.create("div", { "class": "esriCTdivTriangle" }, this.domNode);
             domUtils.hide(this.domNode);
             this.own(on(this.esriCTclosediv, "click", lang.hitch(this, function (evt) {
                 if (query(".map .logo-sm")) {
                     this.InfoShow = true;
                 } else {
                     this.InfoShow = false;
                 }
                 domUtils.hide(this.domNode);
             })));
         },

         show: function (detailsTab, screenPoint) {
             this.InfoShow = false;
             if (this.divInfoDetailsScroll) {
                 while (this.divInfoDetailsScroll.hasChildNodes()) {
                     this.divInfoDetailsScroll.removeChild(this.divInfoDetailsScroll.lastChild);
                 }
             }
             this.divInfoDetailsScroll.appendChild(detailsTab);
             this.setLocation(screenPoint);
         },

         resize: function (width, height) {
             this.infoWindowWidth = width;
             this.infoWindowHeight = height;
             domStyle.set(this.domNode, {
                 width: width + "px",
                 height: height + "px"
             });
         },

         setTitle: function (infoTitle) {
             if (infoTitle.length > 0) {
                 this.esriCTheadderPanel.innerHTML = infoTitle;
                 this.esriCTheadderPanel.title = infoTitle;
             } else {
                 this.esriCTheadderPanel.innerHTML = "";
             }

         },

         setLocation: function (location) {
             if (location.spatialReference) {
                 location = this.map.toScreen(location);
             }
             domStyle.set(this.domNode, {
                 left: (location.x - (this.infoWindowWidth / 2)) + "px",
                 bottom: (location.y + 28) + "px"
             });
             if (this.InfoShow) {
             } else {
                 domUtils.show(this.domNode);
             }
             this.isShowing = true;
         },

         hide: function () {
             domUtils.hide(this.domNode);
             this.isShowing = false;
             this.onHide();
         },

         _hideInfoContainer: function (map) {
             this.own(on(this.esriCTclosediv, "click", lang.hitch(this, function (evt) {
                 domUtils.hide(this.domNode);
             })));
         }

     });
 });