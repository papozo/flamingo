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
/**
 * Custom configuration object for LayerSwitch configuration
 * @author <a href="mailto:meinetoonen@b3partners.nl">Meine Toonen</a>
 */
Ext.define("viewer.components.CustomConfiguration",{
    extend: "viewer.components.ConfigObject",
    constructor: function (parentid,config){
        viewer.components.CustomConfiguration.superclass.constructor.call(this, parentid,config);
        this.form.add([{
            xtype: 'textfield',
            fieldLabel: 'Toppositie',
            name: 'top',
            value: (config != null && config.top != undefined) ? config.top : '',
            labelWidth:this.top
        },
        {
            xtype: 'textfield',
            fieldLabel: 'Linkerpositie',
            name: 'left',
            value: (config != null && config.left != undefined) ? config.left : '',
            labelWidth:this.left
        }]);
        return this;
    }
});