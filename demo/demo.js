/* eslint-disable */
// Provide your access token
const accessToken =
  'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

// set mapbox tile layer
const mapboxTiles1 = L.tileLayer(
  `https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/{z}/{x}/{y}?access_token=${accessToken}`,
  {
    attribution:
      '&copy; <a href="https://www.mapbox.com/feedback/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }
);

const map = L.map('example2')
  .setView([51.504789, -0.091624], 15)
  .addLayer(mapboxTiles1);

map.pm.addControls();

let pmOrtho = new L.PMOrtho(map);

const poly = L.polyline([[51.50915, -0.096112],[51.50614, -0.0989],[51.50313, -0.091223]]).addTo(map);


pmOrtho.setOptions({baseAngleOfLastSegment: true, snapAngle: 45});
