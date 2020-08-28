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

const m1 = L.circleMarker([51.50313, -0.091223], { radius: 10 });
const m2 = L.marker([51.50614, -0.0989]);
const m3 = L.marker([51.50915, -0.096112]);
const poly = L.polygon([[51.50915, -0.096112],[51.50614, -0.0989],[51.50313, -0.091223]]);
const circle = L.circle([ 51.50227810647,-0.0993],100);

const mGroup = L.layerGroup([m1,m2,m3,poly,circle]).addTo(map);

mGroup.on('layeradd',function (e) {
  console.log(e);
});
