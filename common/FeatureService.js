/* 
 * Copyright (C) 2012 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


Ext.define("viewer.FeatureService", {
    config: {
        actionbeanUrl: null,
        service: null,
        layer: null
    },
    url: null,
    constructor: function(config) {        
        this.initConfig(config);       
        
    },
    getFeatureType: function(success, failure) {
        
        Ext.Ajax.request({
            url: this.config.actionbeanUrl,
            params: this.config, // XXX also posts actionbeanUrl, but is harmless
            success: function(result) {
                var response = JSON.parse(result.responseText);
                
                if(response.success) {
                    success(response.featureType);
                } else {
                    failure(response.error);
                }
            },
            failure: function(result) {
                failure("Ajax request failed with status " + result.status + " " + result.statusText + ": " + result.responseText);
            }
        });
    }
});
