# Leaflet PMOrtho: Adds Ortho mode (45° steps) to Polyline, Polygon and Rectangle while shift holding
This is a [Leaflet Geoman](https://github.com/geoman-io/leaflet-geoman) Subplugin 

Demo: [PMOrtho](https://falke-design.github.io/PMOrtho/)

### Installation
Download [pmOrtho.js](https://raw.githubusercontent.com/Falke-Design/PMOrtho/master/dist/pmOrtho.js) and include them in your project.

`<script src="./dist/pmOrtho.js"></script>`

or use the script over cdn:

`<script src="https://cdn.jsdelivr.net/gh/Falke-Design/PMOrtho/dist/pmOrtho.js"></script>`

### Init PMOrtho
Add PMOrtho after Leaflet Geoman

`pmOrtho = new L.PMOrtho(map)`

You can set a custom key to enable ortho mode. The custom key can be event.key, event.which, event.code (https://keycode.info/) 

`pmOrtho = new L.PMOrtho(map, {customKey: 'b'})`

### Functions
##### Options
`pmOrtho.setOptions(options)`
```
allowOrtho: true | false
customKey: event.key | event.which | event.code
snapAngle: 45
baseAngleOfLastSegment: false
```
