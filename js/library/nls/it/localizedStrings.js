﻿/*global define */
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
define({
    showNullValue: "N/A",
    buttons: {
        okButtonText: "OK",
        print: "Print",
        back: "Back",
        backToMap: "Back to map",
        more: "More",
        less: "Less",
        link: "Link",
        embedding: "Embedding",
        email: "Email",  // Shown next to icon for sharing the current map extents via email; works with shareViaEmail tooltip
        facebook: "Facebook",  // Shown next to icon for sharing the current map extents via a Facebook post; works with shareViaFacebook tooltip
        twitter: "Twitter"  // Shown next to icon for sharing the current map extents via a Twitter tweet; works with shareViaTwitter tooltip
    },
    tooltips: {
        search: "Search",
        route: "Route",
        locate: "Locate",
        share: "Share",
        help: "Help",
        clearDirection: "Clear Direction",
        clearEntry: "Clear",
        loadingText: "Loading..."
    },
    titles: {
        frequentRouteText: "Frequent Routes",
        informationPanelTitle: "Information for current map view",
        webpageDisplayText: "Copy/Paste HTML into your web page"
    },
    sentenceFragment: {
        to: "to"
    },
    errorMessages: {
        invalidSearch: "No results found",
        falseConfigParams: "Required configuration key values are either null or not exactly matching with layer attributes. This message may appear multiple times.",
        invalidLocation: "Current location not found.",
        invalidProjection: "Unable to plot current location on the map.",
        widgetNotLoaded: "Unable to load widgets.",
        shareLoadingFailed: "Unable to shorten URL, Bit.ly failed to load.",
        shareFailed: "Unable to share.",
        noDirection: "Location could not be found",
        webMapMessages: "Title and/or QueryLayerId parameters in SearchSettings do not match with configured webmap",
        noInfoWindow: "InfoWindow not found for this layer",
        enterCorrectPoints: "Enter correct source or destination.",
        enterCorrectSource: "Enter correct source.",
        enterCorrectDestination: "Enter correct destination.",
        noPortalUrl: "Portal URL could not be found"
    }
});
