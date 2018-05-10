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

        containerDiv.appendChild(controlDiv);
        this.layerContainer = document.createElement('div');
        this.layerContainer.className = 'layercontainer';
        containerDiv.appendChild(this.layerContainer);
        var idCounter = 0;
        this.createRegistry = function (layer, buffer) {
            layer.set('id', 'layer_' + idCounter);
            idCounter += 1;
            var layerDiv = document.createElement('div');
            layerDiv.className = buffer ? 'layer ol-unselectable buffering' : 'layer ol-unselectable';
            layerDiv.title = layer.get('name') || 'Unnamed Layer';
            layerDiv.id = layer.get('id');
            var layerSpan = document.createElement('span');
            layerSpan.textContent = layerDiv.title;
            layerDiv.appendChild(layerSpan);
            this.layerContainer.insertBefore(layerDiv, this.layerContainer.firstChild);
            return this;
        };
        this.map.getLayers().on('add', function (evt) {
            if (evt.element instanceof ol.layer.Vector) {
                this.createRegistry(evt.element, true);
            } else {
                this.createRegistry(evt.element);
            }
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
                source: new ol.source.OSM()
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