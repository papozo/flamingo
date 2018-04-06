/*
 * Copyright (C) 2012-2017 B3Partners B.V.
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
/**
 * Edit component
 * @author <a href="mailto:meinetoonen@b3partners.nl">Meine Toonen</a>
 * @author mprins
 */
Ext.define("viewer.components.Edit", {
    extend: "viewer.components.Component",
    vectorLayer: null,
    inputContainer: null,
    geomlabel: null,
    savebutton: null,
    pixelTolerance:0,
    showGeomType: null,
    newGeomType: null,
    tekstGeom: 'feature',
    mode: null,
    layerSelector: null,
    toolMapClick: null,
    editingLayer: null,
    currentFID: null,
    geometryEditable: null,
    deActivatedTools: [],
    schema: null,
    editLinkInFeatureInfoCreated: false,
    afterLoadAttributes: null,
    filterFeatureId: null,
    // Boolean to check if window is hidden temporarily for mobile mode
    mobileHide: false,
    config: {
        title: "",
        iconUrl: "",
        tooltip: "",
        layers: null,
        label: "",
        allowDelete: false,
        allowCopy: false,
        allowNew: true,
        allowEdit: true,
        cancelOtherControls: ["viewer.components.Merge", "viewer.components.Split"],
        formLayout: 'anchor',
        showEditLinkInFeatureInfo: false,
        details: {
            minWidth: 400,
            minHeight: 250
        }
    },
    editLblClass: 'editCmpLbl',
    constructor: function (conf) {
        this.initConfig(conf);
        viewer.components.Edit.superclass.constructor.call(this, this.config);
        var me = this;

        Ext.mixin.Observable.capture(this.config.viewerController.mapComponent.getMap(), function (event) {
            if (event == viewer.viewercontroller.controller.Event.ON_GET_FEATURE_INFO
                    || event == viewer.viewercontroller.controller.Event.ON_MAPTIP) {
                if (me.mode == "new" || me.mode == "edit" || me.mode == "delete" || me.mode == "copy") {
                    return false;
                }
            }
            return true;
        });

        if (this.config.layers != null) {
            this.config.layers = Ext.Array.filter(this.config.layers, function (layerId) {
                // XXX must check editAuthorized in appLayer
                // cannot get that from this layerId
                return true;
            });
        }
        this.renderButton({
            handler: function () {
                me.showWindow();
            },
            text: me.config.title,
            icon: me.config.iconUrl,
            tooltip: me.config.tooltip,
            label: me.config.label
        });

        this.toolMapClick = this.config.viewerController.mapComponent.createTool({
            type: viewer.viewercontroller.controller.Tool.MAP_CLICK,
            id: this.name + "toolMapClick",
            handlerOptions: {pixelTolerance:me.pixelTolerance},
            handler: {
                fn: this.mapClicked,
                scope: this
            },
            viewerController: this.config.viewerController
        });
        this.schema = new Ext.data.schema.Schema();

        this.loadWindow();
        this.config.viewerController.addListener(viewer.viewercontroller.controller.Event.ON_SELECTEDCONTENT_CHANGE, this.selectedContentChanged, this);
        return this;
    },
    selectedContentChanged: function () {
        if (this.vectorLayer == null) {
            this.createVectorLayer();
        } else {
            this.config.viewerController.mapComponent.getMap().addLayer(this.vectorLayer);
        }
    },
    createVectorLayer: function () {
        this.vectorLayer = this.config.viewerController.mapComponent.createVectorLayer({
            name: this.name + 'VectorLayer',
            geometrytypes: ["Circle", "Polygon", "MultiPolygon", "Point", "LineString"],
            showmeasures: false,
            viewerController: this.config.viewerController,
            style: {
                fillcolor: "FF0000",
                fillopacity: 50,
                strokecolor: "FF0000",
                strokeopacity: 50
            }
        });
        this.vectorLayer.addListener(viewer.viewercontroller.controller.Event.ON_FEATURE_ADDED, function () {
            this.showAndFocusForm();
        }, this);
        this.config.viewerController.registerSnappingLayer(this.vectorLayer);
        this.config.viewerController.mapComponent.getMap().addLayer(this.vectorLayer);
    },
    showWindow: function () {
        if (this.vectorLayer == null) {
            this.createVectorLayer();
        }
        this.mobileHide = false;
        this.layerSelector.initLayers();
        this.popup.popupWin.setTitle(this.config.title);
        this.config.viewerController.deactivateControls(this.config.cancelOtherControls);
        this.setFormVisible(false);
        this.untoggleButtons();
        var buttons = this.maincontainer.down("#buttonPanel").query("button");
        if (buttons.length === 1 && !buttons[0].isDisabled()) {
            buttons[0].fireEvent("click", buttons[0]);
        }
        this.popup.show();
        this.popup.popupWin.addListener('hide', function () {
            this.cancel();
        }.bind(this));
    },
    loadWindow: function () {
        this.createLayerSelector();
        this.maincontainer = Ext.create('Ext.container.Container', {
            id: this.name + 'Container',
            width: '100%',
            height: '100%',
            autoScroll: true,
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            style: {
                backgroundColor: 'White'
            },
            padding: 10,
            renderTo: this.getContentDiv(),
            items: [this.layerSelector.getLayerSelector(),
                {
                    itemId: 'buttonPanel',
                    xtype: "container",
                    items: this.createActionButtons()
                },
                {
                    itemId: "geomLabel",
                    margin: '5 0',
                    text: '',
                    xtype: "label"
                },
                {
                    itemId: 'inputPanel',
                    border: 0,
                    xtype: "form",
                    autoScroll: true,
                    flex: 1,
                    layout: this.config.formLayout,
                    hidden: true
                }, {
                    itemId: 'savePanel',
                    xtype: "container",
                    layout: {
                        type: 'hbox',
                        pack: 'end'
                    },
                    defaults: {
                        xtype: 'button'
                    },
                    items: [
                        {
                            itemId: "cancelButton",
                            tooltip: "Annuleren",
                            text: "Annuleren",
                            listeners: {
                                click: {
                                    scope: this,
                                    fn: this.cancel
                                }
                            }
                        },
                        {
                            itemId: "saveButton",
                            tooltip: "Opslaan",
                            text: "Opslaan",
                            listeners: {
                                click: {
                                    scope: this,
                                    fn: this.save
                                }
                            }
                        }
                    ],
                    hidden: true
                }
            ]
        });
        this.inputContainer = this.maincontainer.down('#inputPanel');
        this.geomlabel = this.maincontainer.down("#geomLabel");
        this.savebutton = this.maincontainer.down("#saveButton");

    },
    createActionButtons: function () {
        var buttons = [];
        if (this.config.allowNew) {
            buttons.push(this.createButton("newButton", "Nieuw", this.createNew));
        }
        if (this.config.allowCopy) {
            buttons.push(this.createButton("copyButton", "Kopie", this.copy, "Kopie bewerken"));
        }
        if (this.config.allowEdit) {
            buttons.push(this.createButton("editButton", "Bewerken", this.edit));
        }
        if (this.config.allowDelete) {
            buttons.push(this.createButton("deleteButton", "Verwijder", this.deleteFeature));
        }
        return buttons;
    },
    createButton: function (itemid, label, fn, tooltip) {
        return {
            xtype: 'button',
            itemId: itemid,
            tooltip: tooltip || label,
            componentCls: 'button-toggle',
            disabled: true,
            text: label,
            listeners: {
                click: {
                    scope: this,
                    fn: function (btn) {
                        btn.addCls("active-state");
                        fn.call(this);
                    }
                }
            }
        };
    },
    getButtonAllowed: function (itemid) {
        var configKey = {
            "newButton": this.config.allowNew,
            "copyButton": this.config.allowCopy,
            "editButton": this.config.allowEdit,
            "deleteButton": this.config.allowDelete
        };
        return configKey[itemid];
    },
    setButtonDisabled: function (itemid, disabled) {
        if (!this.getButtonAllowed(itemid)) {
            return;
        }
        var button = this.maincontainer.down("#" + itemid);
        if (button)
            button.setDisabled(disabled);
    },
    showAndFocusForm: function () {
        this.showMobilePopup();
        this.setFormVisible(true);
        var firstField = this.inputContainer.down("field");
        if(firstField) {
            firstField.focus();
        }
        this.geomlabel.setText("");
        this.untoggleButtons();
    },
    setFormVisible: function (visible) {
        this.inputContainer.setVisible(visible);
        this.maincontainer.down("#savePanel").setVisible(visible);
    },
    createLayerSelector: function () {
        var config = {
            viewerController: this.config.viewerController,
            restriction: "editable",
            id: this.name + "layerSelector",
            layers: this.config.layers,
            width: '100%'
        };
        this.layerSelector = Ext.create("viewer.components.LayerSelector", config);
        this.layerSelector.addListener(viewer.viewercontroller.controller.Event.ON_LAYERSELECTOR_CHANGE, this.layerChanged, this);
        this.layerSelector.addListener(viewer.viewercontroller.controller.Event.ON_LAYERSELECTOR_INITLAYERS, this.layerSelectorInit, this);
    },
    layerSelectorInit: function (evt) {
        if (this.layerSelector.getVisibleLayerCount() === 1) {
            this.layerSelector.selectFirstLayer();
        }
        if (this.config.showEditLinkInFeatureInfo) {
            this.createFeatureInfoLink(evt.layers);
        }
    },
    createFeatureInfoLink: function (editableLayers) {
        if (this.editLinkInFeatureInfoCreated) {
            return;
        }
        var infoComponents = this.viewerController.getComponentsByClassNames(["viewer.components.FeatureInfo", "viewer.components.ExtendedFeatureInfo"]);
        var appLayers = [];
        Ext.each(editableLayers, function (record) {
            var appLayer = this.viewerController.getAppLayerById(record.id);
            if(appLayer){
                appLayers.push(appLayer);
            }
        }, this);
        for (var i = 0; i < infoComponents.length; i++) {
            infoComponents[i].registerExtraLink(
                    this,
                    function (feature, appLayer, coords) {
                        this.handleFeatureInfoLink(feature, appLayer, coords);
                    }.bind(this),
                    this.config.title || 'Edit',
                    appLayers
                    );
        }
        this.editLinkInFeatureInfoCreated = true;
    },
    handleFeatureInfoLink: function (feature, appLayer, coords) {
        // Show the window
        this.showWindow();
        // Add event handler to get features for coordinates
        this.afterLoadAttributes = function () {
            this.afterLoadAttributes = null;
            this.filterFeatureId = feature.getAttribute('__fid');
            this.mode = "edit";
            this.config.viewerController.mapComponent.getMap().setMarker("edit", coords.x, coords.y);
            this.getFeaturesForCoords(coords);
        };
        // Check if the appLayer is selected already
        // If the layer is already selected, fire layerChanged ourself
        var selectedAppLayer = this.layerSelector.getValue();
        if (selectedAppLayer && selectedAppLayer.id === parseInt(appLayer.id, 10)) {
            this.layerChanged(appLayer);
            return;
        }
        // Find and select layerselector record
        this.layerSelector.getStore().each(function (record) {
            if (parseInt(record.get('layerId'), 10) === parseInt(appLayer.id, 10)) {
                this.layerSelector.setValue(record);
            }
        }, this);
    },
    layerChanged: function (appLayer) {
        if (appLayer != null) {
            if (this.vectorLayer) {
                this.vectorLayer.removeAllFeatures();
            }
            this.mode = null;
            this.config.viewerController.mapComponent.getMap().removeMarker("edit");
            if (appLayer.details && appLayer.details["editfunction.title"]) {
                this.popup.popupWin.setTitle(appLayer.details["editfunction.title"]);
            }
            this.inputContainer.setLoading("Laadt attributen...");
            this.inputContainer.removeAll();
            this.loadAttributes(appLayer);
            this.inputContainer.setLoading(false);
        } else {
            this.cancel();
        }
    },
    loadAttributes: function (appLayer) {
        this.appLayer = appLayer;
        var me = this;
        if (this.appLayer != null) {
            this.featureService = this.config.viewerController.getAppLayerFeatureService(this.appLayer);
            // check if featuretype was loaded
            if (this.appLayer.attributes == undefined) {
                this.featureService.loadAttributes(me.appLayer, function (attributes) {
                    me.initAttributeInputs(me.appLayer);
                });
            } else {
                this.initAttributeInputs(me.appLayer);
            }
        }
        if (this.afterLoadAttributes !== null) {
            this.afterLoadAttributes.call(this);
        }
    },
    initAttributeInputs: function (appLayer) {
        var attributes = appLayer.attributes;
        var type = "geometry";
        if (appLayer.geometryAttributeIndex != undefined || appLayer.geometryAttributeIndex != null) {
            var geomAttribute = appLayer.attributes[appLayer.geometryAttributeIndex];
            if (geomAttribute.editValues != undefined && geomAttribute.editValues != null && geomAttribute.editValues.length >= 1) {
                type = geomAttribute.editValues[0];
            } else {
                type = geomAttribute.type;
            }
            this.geometryEditable = appLayer.attributes[appLayer.geometryAttributeIndex].editable;
            if (geomAttribute.userAllowedToEditGeom !== undefined) {
                this.geometryEditable = geomAttribute.userAllowedToEditGeom;
            }
        } else {
            this.geometryEditable = false;
        }

        this.showGeomType = type;
        var possible = true;
        var tekst = "";
        switch (type) {
            case "multipolygon":
                this.showGeomType = "MultiPolygon";
                this.newGeomType = "Polygon";
                this.tekstGeom = "vlak";
                break;
            case "polygon":
                this.showGeomType = "Polygon";
                this.newGeomType = "Polygon";
                this.tekstGeom = "vlak";
                break;
            case "multipoint":
            case "point":
                this.showGeomType = "Point";
                this.newGeomType = "Point";
                this.tekstGeom = "punt";
                break;
            case "multilinestring":
            case "linestring":
                this.showGeomType = "LineString";
                this.newGeomType = "LineString";
                this.tekstGeom = "lijn";
                break;
            case "geometry":
                possible = true;
                this.newGeomType = null;
                break;
            default:
                this.newGeomType = null;
                possible = false;
                break;
        }

        if (possible) {
            if (this.geometryEditable) {
                this.setButtonDisabled("editButton", false);
                this.setButtonDisabled("deleteButton", false);
                this.setButtonDisabled("copyButton", false);
                if (this.newGeomType == null) {
                    tekst = "Geometrie mag alleen bewerkt worden";
                } else {
                    this.setButtonDisabled("newButton", false);
                    tekst = "";
                    if (this.config.allowDelete) {
                        tekst = "";
                    }
                }
            } else {
                tekst = 'Geometrie mag niet bewerkt worden.';
            }
            this.geomlabel.setText(tekst);

            var groupedInputs = {};
            var nonGrouped = [];
            for (var i = 0; i < attributes.length; i++) {
                var attribute = attributes[i];
                if (appLayer.featureType && attribute.featureType === appLayer.featureType && attribute.editable) {
                    var values = Ext.clone(attribute.editValues);
                    var input = null;
                    if (i == appLayer.geometryAttributeIndex) {
                        continue;
                    }
                    if (attribute.valueList !== "dynamic" && (values == undefined || values.length == 1)) {
                        input = this.createStaticInput(attribute, values);
                    } else if (attribute.valueList === "dynamic" || (values && values.length > 1)) {
                        input = this.createDynamicInput(attribute, values);
                    }
                    if(attribute.folder_label) {
                        if(!groupedInputs.hasOwnProperty(attribute.folder_label)) {
                            groupedInputs[attribute.folder_label] = Ext.create('Ext.form.FieldSet', {
                                title: attribute.folder_label,
                                collapsible: true,
                                collapsed: true,
                                bodyPadding: 10,
                                items: []
                            });
                        }
                        groupedInputs[attribute.folder_label].add(input);
                    } else {
                        nonGrouped.push(input);
                    }
                    this.setButtonDisabled("editButton", false);
                }
            }
            this.inputContainer.add(nonGrouped);
            for(var label in groupedInputs) if(groupedInputs.hasOwnProperty(label)) {
                this.inputContainer.add(groupedInputs[label]);
            }
        } else {
            this.geomlabel.setText("Geometrietype onbekend. Bewerken niet mogelijk.");
            this.setButtonDisabled("editButton", true);
            this.setButtonDisabled("newButton", true);
            this.setButtonDisabled("deleteButton", true);
            this.setButtonDisabled("copyButton", true);
        }
    },
    createStaticInput: function (attribute, values) {
        var fieldText = "";
        if (typeof values !== 'undefined') {
            fieldText = values[0];
        }
        var options = {
            name: attribute.name,
            fieldLabel: attribute.editAlias || attribute.name,
            value: fieldText,
            disabled: !this.allowedEditable(attribute),
            labelClsExtra: this.editLblClass
        };
        var input;
        if (attribute.editHeight) {
            options.height = attribute.editHeight;
            input = Ext.create("Ext.form.field.TextArea", options);
        } else {
            input = Ext.create("Ext.form.field.Text", options);
        }
        if (attribute.type === 'date') {
            // Flamingo uses new SimpleDateFormat("dd-MM-yyyy HH:mm:ss") in
            // FeatureToJson#formatValue eg. 14-11-2013 00:00:00
            // Ext uses PHP conventions! see:
            // https://docs.sencha.com/extjs/5.1/5.1.0-apidocs/#!/api/Ext.Date
            options.format = 'd-m-Y';
            options.altFormats = 'd-m-y|d-M-Y';
            // ISO 8601 (local time + UTC offset)
            options.submitFormat = 'c';
            input = Ext.create("Ext.form.field.Date", options);
        }

        if (attribute.disableUserEdit) {
            input.setReadOnly(true);
            input.addCls("x-item-disabled");
        }

        return input;
    },
    createDynamicInput: function (attribute, values) {
        var valueStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'label']
        });
        if (values && values.length > 1) {
            var allBoolean = true;
            for (var v = 0; v < values.length; v++) {
                var hasLabel = values[v].indexOf(":") !== -1;
                var val = hasLabel ? values[v].substring(0, values[v].indexOf(":")) : values[v];
                if (val.toLowerCase() !== "true" && val.toLowerCase() !== "false") {
                    allBoolean = false;
                    break;
                }
            }

            Ext.each(values, function (value, index, original) {
                var hasLabel = value.indexOf(":") !== -1;
                var label = value;
                if (hasLabel) {
                    label = value.substring(value.indexOf(":") + 1);
                    value = value.substring(0, value.indexOf(":"));
                }

                if (allBoolean) {
                    value = value.toLowerCase() === "true";
                }
                original[index] = {
                    id: value,
                    label: label
                };
            });
            valueStore.setData(values);
        } else {
            // attributes.valueList === "dynamic"
            var reqOpts = {
                featureType: attribute.valueListFeatureType,
                attributes: [attribute.valueListValueName, attribute.valueListLabelName],
                maxFeatures: 1000,
                getKeyValuePairs: 't'
            };
            var proxy = Ext.create('Ext.data.proxy.Ajax', {
                url: actionBeans.unique,
                model: valueStore.model,
                extraParams: reqOpts,
                limitParam: '',
                reader: {
                    type: 'json',
                    rootProperty: 'valuePairs',
                    transform: {
                        fn: function (data) {
                            // transform and sort the data
                            var valuePairs = [];
                            Ext.Object.each(data.valuePairs, function (key, value, object) {
                                valuePairs.push({
                                    id: key,
                                    label: value
                                });
                            });
                            valuePairs = valuePairs.sort(function (a, b) {
                                if (a.label < b.label)
                                    return -1;
                                if (a.label > b.label)
                                    return 1;
                                return 0;
                            });
                            return {
                                success: data.success,
                                valuePairs: valuePairs
                            };
                        },
                        scope: this
                    }
                }
            });
            valueStore.setProxy(proxy);
            valueStore.load();
        }

        var input = Ext.create('Ext.form.field.ComboBox', {
            fieldLabel: attribute.editAlias || attribute.name,
            store: valueStore,
            queryMode: 'local',
            displayField: 'label',
            name: attribute.name,
            id: attribute.name,
            valueField: 'id',
            disabled: !this.allowedEditable(attribute),
            editable: !(attribute.hasOwnProperty('allowValueListOnly') && attribute.allowValueListOnly),
            labelClsExtra: this.editLblClass
        });

        if (attribute.hasOwnProperty('disallowNullValue') && attribute.disallowNullValue) {
            try {
                if (valueStore.loadCount !== 0) { // if store is loaded already load event is not fired anymore
                    input.select(valueStore.getAt(0));
                } else {
                    valueStore.on('load', function () {
                        input.select(valueStore.getAt(0));
                    });
                }
            } catch (e) {
            }
        }

        if (attribute.disableUserEdit) {
            input.setReadOnly(true);
            input.addCls("x-item-disabled");
        }

        return input;
    },
    setInputPanel: function (feature) {
        this.inputContainer.getForm().setValues(feature);
    },
    mapClicked: function (toolMapClick, comp) {
        this.deactivateMapClick();
        this.showMobilePopup();
        if (this.mode === "new") {
            return;
        }
        Ext.get(this.getContentDiv()).mask("Haalt features op...");
        var coords = comp.coord;
        this.config.viewerController.mapComponent.getMap().setMarker("edit", coords.x, coords.y);
        this.getFeaturesForCoords(coords);
    },
    getFeaturesForCoords: function (coords) {
        var layer = this.layerSelector.getValue();
        var featureInfo = Ext.create("viewer.FeatureInfo", {
            viewerController: this.config.viewerController
        });
        var me = this;
        featureInfo.editFeatureInfo(coords.x, coords.y, this.config.viewerController.mapComponent.getMap().getResolution() * 4, layer, function (response) {
            var features = response.features;
            me.featuresReceived(features);
        }, function (msg) {
            me.failed(msg);
        });
    },
    featuresReceived: function (features) {
        if (features.length === 0) {
            this.handleFeature(null);
            return;
        }
        // A feature filter has been set, filter the right feature from the result set
        if (this.filterFeatureId !== null) {
            for (var i = 0; i < features.length; i++) {
                if (features[i].__fid === this.filterFeatureId) {
                    this.handleFeature(this.indexFeatureToNamedFeature(features[i]));
                    this.filterFeatureId = null; // Remove filter after first use
                    return;
                }
            }
            // Filtered Feature is not found
        }
        if (features.length === 1) {
            var feat = this.indexFeatureToNamedFeature(features[0]);
            this.handleFeature(feat);
        } else {
            // Handel meerdere features af.
            this.createFeaturesGrid(features);
        }
    },
    handleFeature: function (feature) {
        if (feature != null) {
            this.inputContainer.getForm().setValues(feature);
            if (this.mode === "copy") {
                this.currentFID = null;
            } else {
                this.currentFID = feature.__fid;
            }
            if (this.geometryEditable) {
                var wkt = feature[this.appLayer.geometryAttribute];
                var feat = Ext.create("viewer.viewercontroller.controller.Feature", {
                    wktgeom: wkt,
                    id: "T_0"
                });
                this.vectorLayer.addFeature(feat);
            } else {
                this.showAndFocusForm();
            }
        }
        Ext.get(this.getContentDiv()).unmask();
    },
    failed: function (msg) {
        Ext.Msg.alert('Mislukt', msg);
        Ext.get(this.getContentDiv()).unmask();
    },
    /**
     * clear any loaded feature from the form and the map.
     */
    clearFeatureAndForm: function () {
        this.vectorLayer.removeAllFeatures();
        this.inputContainer.getForm().reset();
        this.currentFID = null;
        this.setFormVisible(false);
    },
    createNew: function () {
        this.hideMobilePopup();
        this.clearFeatureAndForm();
        this.geomlabel.setText("Voeg een nieuw " + this.tekstGeom + " toe op de kaart");
        this.config.viewerController.mapComponent.getMap().removeMarker("edit");
        this.mode = "new";
        if (this.newGeomType != null && this.geometryEditable) {
            this.vectorLayer.drawFeature(this.newGeomType);
        }
        this.savebutton.setText("Opslaan");
        this.untoggleButtons("newButton");

    },
    edit: function () {
        this.hideMobilePopup();
        this.clearFeatureAndForm();
        this.geomlabel.setText("Selecteer een te bewerken " + this.tekstGeom + " in de kaart");
        this.mode = "edit";
        this.activateMapClick();
        this.savebutton.setText("Opslaan");
        this.untoggleButtons("editButton");
    },
    copy: function () {
        this.hideMobilePopup();
        this.clearFeatureAndForm();
        this.geomlabel.setText("Selecteer een te kopieren " + this.tekstGeom + " in de kaart");
        this.mode = "copy";
        this.activateMapClick();
        this.savebutton.setText("Opslaan");
        this.untoggleButtons("copyButton");
    },
    deleteFeature: function () {
        if (!this.config.allowDelete) {
            return;
        }
        this.hideMobilePopup();
        this.clearFeatureAndForm();
        this.geomlabel.setText("Selecteer een te verwijderen " + this.tekstGeom + " in de kaart");
        this.mode = "delete";
        this.activateMapClick();
        this.savebutton.setText("Verwijderen");
        this.untoggleButtons("deleteButton");
    },
    untoggleButtons: function (filter) {
        var buttons = ["newButton", "editButton", "copyButton", "deleteButton"];
        var itemid;
        var button;
        for (var i = 0; i < buttons.length; i++) {
            itemid = buttons[i];
            if (filter === itemid || !this.getButtonAllowed(itemid)) {
                continue;
            }
            button = this.maincontainer.down("#" + itemid);
            if (button)
                button.removeCls("active-state");
        }
    },
    activateMapClick: function () {
        if (Array.isArray(this.deActivatedTools) && this.deActivatedTools.length === 0) {
            this.deActivatedTools = this.config.viewerController.mapComponent.deactivateTools();
        }
        this.toolMapClick.activateTool();
    },
    deactivateMapClick: function () {
        for (var i = 0; i < this.deActivatedTools.length; i++) {
            this.deActivatedTools[i].activate();
        }
        this.deActivatedTools = [];
        this.toolMapClick.deactivateTool();
        this.showAndFocusForm();
    },
    hideMobilePopup: function() {
        if(viewer.components.MobileManager.isMobile()) {
            this.mobileHide = true;
            this.popup.hide();
        }
    },
    showMobilePopup: function() {
        if(viewer.components.MobileManager.isMobile()) {
            this.mobileHide = false;
            this.popup.show();
        }
    },
    save: function () {
        if (this.mode === "delete") {
            this.remove();
            return;
        }

        var feature = this.inputContainer.getValues();

        if (this.geometryEditable) {
            if (this.vectorLayer.getActiveFeature()) {
                var wkt = this.vectorLayer.getActiveFeature().config.wktgeom;
                feature[this.appLayer.geometryAttribute] = wkt;
            }
        }
        if (this.mode === "edit") {
            feature.__fid = this.currentFID;
        }
        if (this.mode === "copy") {
            delete feature.__fid;
        }
        var me = this;
        try {
            feature = this.changeFeatureBeforeSave(feature);
        } catch (e) {
            me.failed(e);
            return;
        }

        me.editingLayer = this.config.viewerController.getLayer(this.layerSelector.getValue());
        Ext.create("viewer.EditFeature", {
            viewerController: this.config.viewerController
        }).edit(
                me.editingLayer,
                feature,
                function (fid) {
                    me.saveSucces(fid);
                }, function (error) {
            me.failed(error);
        });
    },
    remove: function () {
        if (!this.config.allowDelete || !this.geometryEditable) {
            Ext.Msg.alert('Mislukt', "Verwijderen is niet toegestaan.");
            return;
        }

        var feature = this.inputContainer.getValues();
        feature.__fid = this.currentFID;

        var me = this;
        try {
            feature = this.changeFeatureBeforeSave(feature);
        } catch (e) {
            me.failed(e);
            return;
        }
        me.editingLayer = this.config.viewerController.getLayer(this.layerSelector.getValue());
        Ext.create("viewer.EditFeature", {
            viewerController: this.config.viewerController,
            actionbeanUrl: actionBeans["editfeature"]+"?delete"
        }).remove(
                me.editingLayer,
                feature,
                function (fid) {
                    me.deleteSucces();
                }, function (error) {
            me.failed(error);
        });
    },
    /**
     * Can be overwritten to add some extra feature attributes before saving the
     * feature.
     * @return the changed feature
     */
    changeFeatureBeforeSave: function (feature) {
        return feature;
    },
    /**
     * Can be overwritten to disable editing in the component/js
     */
    allowedEditable: function (attribute) {
        return true;
    },
    saveSucces: function (fid) {
        this.editingLayer.reload();
        this.currentFID = fid;
        Ext.Msg.alert('Gelukt', "Het feature is aangepast.");
        this.cancel();
    },
    deleteSucces: function () {
        this.editingLayer.reload();
        this.currentFID = null;
        Ext.Msg.alert('Gelukt', "Het feature is verwijderd.");
        this.cancel();
    },
    saveFailed: function (msg) {
        Ext.Msg.alert('Mislukt', msg);
    },
    cancel: function () {
        if(this.mobileHide) {
            return;
        }
        this.resetForm();
        this.popup.hide();
    },
    resetForm: function () {
        this.setButtonDisabled("editButton", true);
        this.setButtonDisabled("newButton", true);
        this.setButtonDisabled("deleteButton", true);
        this.setButtonDisabled("copyButton", true);
        this.savebutton.setText("Opslaan");
        this.mode = null;
        this.layerSelector.clearSelection();
        this.geomlabel.setText("");
        this.inputContainer.removeAll();
        this.config.viewerController.mapComponent.getMap().removeMarker("edit");
        if (this.vectorLayer) {
            // vector layer may be null when cancel() is called
            this.vectorLayer.removeAllFeatures();
        }
    },
    getExtComponents: function () {
        return [this.maincontainer.getId()];
    },
    createFeaturesGrid: function (features) {
        var appLayer = this.layerSelector.getSelectedAppLayer();
        var attributes = appLayer.attributes;
        var index = 0;
        var attributeList = new Array();
        var columns = new Array();

        for (var i = 0; i < attributes.length; i++) {
            var attribute = attributes[i];
            if (attribute.editable) {

                var attIndex = index++;
                if (i == appLayer.geometryAttributeIndex) {
                    continue;
                }
                var colName = attribute.alias != undefined ? attribute.alias : attribute.name;
                attributeList.push({
                    name: "c" + attIndex,
                    type: 'string'
                });
                columns.push({
                    id: "c" + attIndex,
                    text: colName,
                    dataIndex: "c" + attIndex,
                    flex: 1,
                    filter: {
                        xtype: 'textfield'
                    }
                });
            }
        }

        var modelName = this.name + appLayer.id + 'Model';
        if (!this.schema.hasEntity(modelName)) {
            Ext.define(modelName, {
                extend: 'Ext.data.Model',
                fields: attributeList,
                schema: this.schema
            });
        }

        var store = Ext.create('Ext.data.Store', {
            pageSize: 10,
            model: modelName,
            data: features
        });

        var me = this;
        var grid = Ext.create('Ext.grid.Panel', {
            id: this.name + 'GridFeaturesWindow',
            store: store,
            columns: columns,
            listeners: {
                itemdblclick: {
                    scope: me,
                    fn: me.itemDoubleClick
                }
            }
        });
        var container = Ext.create("Ext.container.Container", {
            id: this.name + "GridContainerFeaturesWindow",
            width: "100%",
            height: "100%",
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            items: [
                {
                    id: this.name + 'GridPanelFeaturesWindow',
                    xtype: "container",
                    autoScroll: true,
                    width: '100%',
                    flex: 1,
                    items: [grid]
                }, {
                    id: this.name + 'ButtonPanelFeaturesWindow',
                    xtype: "container",
                    width: '100%',
                    height: 30,
                    items: [{
                            xtype: "button",
                            id: this.name + "SelectFeatureButtonFeaturesWindow",
                            text: "Bewerk geselecteerd feature",
                            listeners: {
                                click: {
                                    scope: me,
                                    fn: me.selectFeature
                                }
                            }
                        },
                        {
                            xtype: "button",
                            id: this.name + "CancelFeatureButtonFeaturesWindow",
                            text: "Annuleren",
                            listeners: {
                                click: {
                                    scope: me,
                                    fn: me.cancelSelectFeature
                                }
                            }
                        }]
                }
            ]
        });

        var window = Ext.create("Ext.window.Window", {
            id: this.name + "FeaturesWindow",
            width: 500,
            height: 300,
            layout: 'fit',
            title: "Kies één feature",
            items: [container]
        });

        window.show();
    },
    itemDoubleClick: function (gridview, row) {
        this.featuresReceived([row.data]);
        Ext.getCmp(this.name + "FeaturesWindow").destroy();
    },
    selectFeature: function () {
        var grid = Ext.getCmp(this.name + 'GridFeaturesWindow');
        var selection = grid.getSelectionModel().getSelection()[0];
        var feature = selection.data;
        this.featuresReceived([feature]);
        Ext.getCmp(this.name + "FeaturesWindow").destroy();
    },
    cancelSelectFeature: function () {
        this.resetForm();
        Ext.get(this.getContentDiv()).unmask();
        Ext.getCmp(this.name + "FeaturesWindow").destroy();
    },
    indexFeatureToNamedFeature: function (feature) {
        var map = this.makeConversionMap();
        var newFeature = {};
        for (var key in feature) {
            if (!feature.hasOwnProperty(key)) {
                continue;
            }
            var namedIndex = map[key];
            var value = feature[key];
            if (namedIndex != undefined) {
                newFeature[namedIndex] = value;
            } else {
                newFeature[key] = value;
            }
        }
        return newFeature;
    },
    makeConversionMap: function () {
        var appLayer = this.layerSelector.getSelectedAppLayer();
        var attributes = appLayer.attributes;
        var map = {};
        var index = 0;
        for (var i = 0; i < attributes.length; i++) {
            if (attributes[i].name === appLayer.geometryAttribute && attributes[i].editable) {
                // if the editing of the geometry attribute is disabled at
                // the layer level (using a "G!B Geometrie NIET Bewerken" group)
                // skip a level in the conversion map
                if (attributes[i].userAllowedToEditGeom !== undefined) {
                    if (!attributes[i].userAllowedToEditGeom) {
                        index++;
                        continue;
                    }
                }
            }
            if (attributes[i].editable) {
                map["c" + index] = attributes[i].name;
                index++;
            }
        }
        return map;
    }
});
