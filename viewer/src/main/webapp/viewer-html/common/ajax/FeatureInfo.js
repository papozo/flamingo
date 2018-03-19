/*
 * Copyright (C) 2012-2013 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

Ext.define("viewer.FeatureInfo", {
    config: {
        actionBeanUrl: null,
        viewerController: null
    },
    constructor: function(config) {
        this.initConfig(config);
        if(this.config.actionbeanUrl == null) {
            this.config.actionbeanUrl = actionBeans["featureinfo"];
        }
    },
    featureInfoInternal: function(params, successFunction, failureFunction,scope) {
        var me = this;
        params = Ext.apply(params, { application: this.config.viewerController.app.id });
        return Ext.Ajax.request({
            url: this.config.actionbeanUrl,
            params: params,
            scope:scope,
            timeout: 60000,
            success: function(result) {
                var response = Ext.JSON.decode(result.responseText);

                for(var i = 0 ; i < response.length ; i++) {
                    var r = response[i];
                    if(r.request.appLayer) {
                        r.appLayer = me.config.viewerController.app.appLayers[r.request.appLayer];
                    } else if(r.request.service) {
                        r.service = me.config.viewerController.app.services[r.request.service];
                    }
                }
                successFunction(response);
            },
            failure: function(result) {
                if (failureFunction !== undefined) {
                    failureFunction("Ajax request failed with status " + result.status + " " + result.statusText + ": " + result.responseText, scope);
                }
            }
        });
    },
    featureInfo: function(x, y, distance, successFunction, failureFunction) {
        var visibleAppLayers = this.config.viewerController.getVisibleAppLayers();

        var queries = [];
        for(var i = 0; i < visibleAppLayers.length; i++) {
            var appLayer = this.config.viewerController.app.appLayers[i];
            var query = { appLayer: appLayer.id };
            if(appLayer.filter) {
                query.filter = appLayer.filter.getCQL();
            }
            queries.push(query);
        }

        var params = {featureInfo: true, x: x, y: y, distance: distance, queryJSON: Ext.JSON.encode(queries)};

        this.featureInfoInternal(params, successFunction, failureFunction);
    },
    layersFeatureInfo: function(x, y, distance, appLayers, extraParams, successFunction, failureFunction,scope) {

        var visibleAppLayers = this.config.viewerController.getVisibleAppLayers();

        var queries = [];
        for(var i = 0; i < appLayers.length; i++) {
            var appLayer = appLayers[i];

            if(visibleAppLayers[appLayer.id] === true) {
                var query = { appLayer: appLayer.id };
                if(appLayer.filter) {
                    query.filter = appLayer.filter.getCQLWithoutType("GEOMETRY");
                }
                queries.push(query);
            }
        }

        var params = {
            featureInfo: true,
            x: x,
            y: y,
            distance: distance,
            queryJSON: Ext.JSON.encode(queries)
        };
        Ext.merge(params, extraParams);
        if(queries.length > 0) {
            return this.featureInfoInternal(params, successFunction, failureFunction,scope);
        }
    },
    relatedFeatureInfo: function(appLayer, relatedFeature, successCallback, failureCallback, extraOptions) {
        var filter = "&filter="+encodeURIComponent(relatedFeature.filter);
        var featureType="&featureType="+relatedFeature.id;
        var options = {
            application: this.config.viewerController.app.id,
            appLayer: appLayer.id,
            limit: 1000,
            filter: filter
        };
        Ext.Object.merge(options, extraOptions || {});
        Ext.Ajax.request({
            url: appLayer.featureService.getStoreUrl() + featureType + filter,
            params: options,
            scope: this,
            success: function(result) {
                var response = Ext.JSON.decode(result.responseText);
                successCallback(response);
            },
            failure: function(result) {
                if(typeof failureCallback !== 'undefined') {
                    failureCallback("Ajax request failed with status " + result.status + " " + result.statusText + ": " + result.responseText);
                } else {
                    this.config.viewerController.logger.error(result);
                }
            }
        });
    },  
    editFeatureInfo: function(x, y, distance, appLayer, successFunction, failureFunction, extraParams, extendUrl) {
        if(extendUrl === undefined){
            extendUrl = "";
        }
        var query = [{appLayer: appLayer.id}];
        var params ={application: this.config.viewerController.app.id, featureInfo: true, edit: true, arrays: true, x: x, y: y, distance: distance, queryJSON: Ext.JSON.encode(query)};
        if(extraParams){
            Ext.merge(params, extraParams);
        }
        Ext.Ajax.request({
            url: this.config.actionbeanUrl+extendUrl,
            params: params,
            timeout: 40000,
            success: function(result) {
                var response = Ext.JSON.decode(result.responseText)[0];
                if(response.error) {
                    failureFunction("Error finding feature to edit: " + response.error);
                } else {
                    if(extendUrl !== ""){
                        successFunction(response);
                    }else{
                        successFunction(response.features);
                    }
                }
            },
            failure: function(result) {
                if(failureFunction != undefined) {
                    failureFunction("Ajax request failed with status " + result.status + " " + result.statusText + ": " + result.responseText);
                }
            }
        });
    }
});