function init() {
    document.removeEventListener('DOMContentLoaded', init);
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
        })
    });
}
document.addEventListener('DOMContentLoaded', init);