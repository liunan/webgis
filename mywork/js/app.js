var layerTree = function (options) {
    'use strict';
    if (!(this instanceof layerTree)) {
        throw new Error('layerTree must be constructed with the new keyword.');
    } else if (typeof options === 'object' && options.map && options.target) {
        if (!(options.map instanceof ol.Map)) {
            throw new Error('Please provide a valid OpenLayers 3 map object.');
        }
        this.map = options.map;
        var containerDiv = document.getElementById(options.target);
        if (containerDiv === null || containerDiv.nodeType !== 1) {
            throw new Error('Please provide a valid element id.');
        }
        this.messages = document.getElementById(options.messages) || document.createElement('span');
        var controlDiv = document.createElement('div');
        controlDiv.className = 'layertree-buttons';
		
		
        // 增加本地图层按钮
		controlDiv.appendChild(this.createButton('addvector', '本地图层', 'addlayer'));
		// 删除图层按钮
		controlDiv.appendChild(this.createButton('deletelayer', 'Remove Layer', 'deletelayer'));

        containerDiv.appendChild(controlDiv);
        this.layerContainer = document.createElement('div');
        this.layerContainer.className = 'layercontainer';
        containerDiv.appendChild(this.layerContainer);
        var idCounter = 0;
		this.selectedLayer = null;//当前选中层
        this.createRegistry = function (layer, buffer) {
            layer.set('id', 'layer_' + idCounter);
            idCounter += 1;
            var layerDiv = document.createElement('div');
            layerDiv.className = buffer ? 'layer ol-unselectable buffering' : 'layer ol-unselectable';
            layerDiv.title = layer.get('name') || 'Unnamed Layer';
            layerDiv.id = layer.get('id');
			// 增加单击事件
			this.addSelectEvent(layerDiv);
			
            var layerSpan = document.createElement('span');
            layerSpan.textContent = layerDiv.title;
            layerDiv.appendChild(this.addSelectEvent(layerSpan, true));
            this.layerContainer.insertBefore(layerDiv, this.layerContainer.firstChild);
            return this;
        };
		
		// 图层添加事件
        this.map.getLayers().on('add', function (evt) {
            if (evt.element instanceof ol.layer.Vector) {
                this.createRegistry(evt.element, true);
            } else {
                this.createRegistry(evt.element);
            }
        }, this);
		
		// 图层删除事件
		this.map.getLayers().on('remove', function (evt) {
            this.removeRegistry(evt.element);
        }, this);
		
    } else {
        throw new Error('Invalid parameter(s) provided.');
    }
};

layerTree.prototype.createButton = function (elemName, elemTitle, elemType) {
    var buttonElem = document.createElement('button');
    buttonElem.className = elemName;
    buttonElem.title = elemTitle;
    switch (elemType) {
        case 'addlayer':
            buttonElem.addEventListener('click', function () {
                document.getElementById(elemName).style.display = 'block';
            });
            return buttonElem;
		case 'deletelayer':
            var _this = this;
            buttonElem.addEventListener('click', function () {
                if (_this.selectedLayer) {
                    var layer = _this.getLayerById(_this.selectedLayer.id);
                    _this.map.removeLayer(layer);
                    _this.messages.textContent = 'Layer removed successfully.';
                } else {
                    _this.messages.textContent = 'No selected layer to remove.';
                }
            });
            return buttonElem;
			
        default:
            return false;
    }
};

layerTree.prototype.addBufferIcon = function (layer) {
    layer.getSource().on('change', function (evt) {
        var layerElem = document.getElementById(layer.get('id'));
        switch (evt.target.getState()) {
            case 'ready':
                layerElem.className = layerElem.className.replace(/(?:^|\s)(error|buffering)(?!\S)/g, '');
                break;
            case 'error':
                layerElem.classList.add('error');
                break;
            default:
                layerElem.classList.add('buffering');
                break;
        }
    });
};

layerTree.prototype.removeContent = function (element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
    return this;
};

layerTree.prototype.createOption = function (optionValue) {
    var option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    return option;
};


layerTree.prototype.addVectorLayer = function (form) {
    var file = form.file.files[0];
    var currentProj = this.map.getView().getProjection();
    var fr = new FileReader();
    var sourceFormat;
    var source = new ol.source.Vector();
    fr.onload = function (evt) {
        var vectorData = evt.target.result;
        switch (form.format.value) {
            case 'geojson':
                sourceFormat = new ol.format.GeoJSON();
                break;
            case 'topojson':
                sourceFormat = new ol.format.TopoJSON();
                break;
            case 'kml':
                sourceFormat = new ol.format.KML();
                break;
            case 'osm':
                sourceFormat = new ol.format.OSMXML();
                break;
            default:
                return false;
        }
        var dataProjection = form.projection.value || sourceFormat.readProjection(vectorData) || currentProj;
        source.addFeatures(sourceFormat.readFeatures(vectorData, {
            dataProjection: dataProjection,
            featureProjection: currentProj
        }));
    };
    fr.readAsText(file);
    var layer = new ol.layer.Vector({
        source: source,
        name: form.displayname.value
    });
    this.addBufferIcon(layer);
    this.map.addLayer(layer);
    this.messages.textContent = 'Vector layer added successfully.';
    return this;
};


layerTree.prototype.addSelectEvent = function (node, isChild) {
    var _this = this;
    node.addEventListener('click', function (evt) {
        var targetNode = evt.target;
        if (isChild) {
            evt.stopPropagation();
            targetNode = targetNode.parentNode;
        }
        if (_this.selectedLayer) {
            _this.selectedLayer.classList.remove('active');
        }
        _this.selectedLayer = targetNode;
        targetNode.classList.add('active');
    });
    return node;
};

layerTree.prototype.removeRegistry = function (layer) {
    var layerDiv = document.getElementById(layer.get('id'));
    this.layerContainer.removeChild(layerDiv);
    return this;
};

layerTree.prototype.getLayerById = function (id) {
    var layers = this.map.getLayers().getArray();
    for (var i = 0; i < layers.length; i += 1) {
        if (layers[i].get('id') === id) {
            return layers[i];
        }
    }
    return false;
};

ol.control.Cesium = function (opt_options) {
    var options = opt_options || {};
    var _this = this;
    var controlDiv = document.createElement('div');
    controlDiv.className = options.class || 'ol-cesium ol-unselectable ol-control';
    setTimeout(function () {
        var ol3d = new olcs.OLCesium({map: _this.getMap()});
        var scene = ol3d.getCesiumScene();
        scene.terrainProvider = Cesium.createWorldTerrain();

        _this.set('cesium', ol3d);
    }, 2000);
    var controlButton = document.createElement('button');
    controlButton.textContent = '3D';
    controlButton.title = 'Toggle 3D rendering';
    controlButton.addEventListener('click', function (evt) {
        var cesium = _this.get('cesium');
        if (cesium.getEnabled()) {
            cesium.setBlockCesiumRendering(true);
            cesium.setEnabled(false);
        } else {
            cesium.setBlockCesiumRendering(false);
            cesium.setEnabled(true);
        }
    });
    controlDiv.appendChild(controlButton);
    ol.control.Control.call(this, {
        element: controlDiv,
        target: options.target
    });
};
ol.inherits(ol.control.Cesium, ol.control.Control);
////////////////////////////

function init() {
    document.removeEventListener('DOMContentLoaded', init);
	
	//增加拖放交互
	var dragAndDrop = new ol.interaction.DragAndDrop({
        formatConstructors: [
            ol.format.GeoJSON,
            ol.format.TopoJSON,
            ol.format.KML,
            ol.format.OSMXML
        ]
    });
    dragAndDrop.on('addfeatures', function (evt) {
        var source = new ol.source.Vector()
        var layer = new ol.layer.Vector({
            source: source,
            name: 'Drag&Drop Layer'
        });
        tree.addBufferIcon(layer);
        map.addLayer(layer);
        source.addFeatures(evt.features);
    });
	
	
    var map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM(),
				name:'OpenStreetMap'
            }),
            new ol.layer.Vector({
                source: new ol.source.Vector({
                    format: new ol.format.GeoJSON({
                        defaultDataProjection: 'EPSG:4326'
                    }),
                    url: '../../res/world_capitals.geojson',
                    attributions: [
                        new ol.Attribution({
                            html: 'World Capitals © Natural Earth'
                        })
                    ],									
                }),
				name:'World Capitals',
				style: new ol.style.Style({
							image: new ol.style.RegularShape({
								stroke: new ol.style.Stroke({
									width: 2,
									color: [6, 125, 34, 1]
								}),
								fill: new ol.style.Fill({
									color: [255, 0, 0, 0.3]
								}),
								points: 5,
								radius1: 5,
								radius2: 8,
								rotation: Math.PI
							})
					})
            })
        ],
        controls: [
            //Define the default controls
            new ol.control.Zoom({
                target: 'toolbar'
            }),
            //Define some new controls
            new ol.control.MousePosition({
                coordinateFormat: function (coordinates) {
                    var coord_x = coordinates[0].toFixed(3);
                    var coord_y = coordinates[1].toFixed(3);
					
					var hdms = ol.coordinate.toStringHDMS(ol.proj.transform(
            coordinates, 'EPSG:3857', 'EPSG:4326'));
					return hdms;
                    //return coord_x + ', ' + coord_y;
                },
                target: 'coordinates'
            }),
            new ol.control.Cesium({
                target: 'toolbar'
            })
        ],
        view: new ol.View({
            center: [0, 0],
            zoom: 2
        }),
		interactions: ol.interaction.defaults().extend([
			dragAndDrop
		])
		
    });
	var tree = new layerTree({map: map, target: 'layertree', messages:
			'messageBar'}).createRegistry(map.getLayers().item(0)).createRegistry(map.getLayers().item(1));
			
			
	//增加本地图层关联
	document.getElementById('addvector_form').addEventListener('submit',
						function (evt) {
						evt.preventDefault();
						tree.addVectorLayer(this);
						this.parentNode.style.display = 'none';
					});
}
document.addEventListener('DOMContentLoaded', init);