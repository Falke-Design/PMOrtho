import shiftUtils from "./shiftUtils";
import get from 'lodash/get';


L.PMOrtho = L.Class.extend({
    includes: [shiftUtils],
    options: {
        allowOrtho: true,
        customKey: null,
        snapAngle: 45,
        baseAngleOfLastSegment: false
    },
    cssadded: false,
    initialize(map, options) {
        this.map = map;
        L.setOptions(this, options);
        if(this.map && this.map.pm){
            this.map.pm.pmOrtho = this;
        }

        this._overwriteFunctions();
    },
    setOptions(options){
        L.setOptions(this, options);
    },
    _overwriteFunctions: function() {
        let that = this;
        this._extendedEnable();
        this._extendedDisable();
        L.PM.Draw.Line.prototype._syncHintMarker = this._syncHintMarker(this);

        L.PM.Draw.Rectangle.prototype._finishShapeOrg = L.PM.Draw.Rectangle.prototype._finishShape;
        L.PM.Draw.Rectangle.prototype._finishShape = function (e) {
            e.latlng = this._cornerPoint || e.latlng;
            this._hintMarker._snapped = this._cornerPoint ? false : this._hintMarker._snapped;
            this._finishShapeOrg(e);
        }



        //Edit
        this.map.on('pm:globaleditmodetoggled',function (e) {
            if(e.enabled) {
                e.map.pm.pmOrtho._enableShiftListener();
                let layers = e.map.pm.pmOrtho._findLayers(e.map);

                //Rectangle
                let rectLayers = layers.filter(layer => layer instanceof L.Rectangle);
                rectLayers.forEach(function (layer) {
                    if (!(layer.pm.pmOrtho && layer.pm.pmOrtho.fncoverwritten)) {
                        layer.pm.pmOrtho = {fncoverwritten: true};
                        layer.pm._adjustRectangleForMarkerMoveOrg = layer.pm._adjustRectangleForMarkerMove;
                        layer.pm._adjustRectangleForMarkerMove = function (movedMarker) {
                            if (this._map.pm.pmOrtho._shiftpressed && this._map.pm.pmOrtho.options.allowOrtho) {
                                let newlatlng = this._map.pm.pmOrtho._getRectanglePoint(movedMarker._oppositeCornerLatLng, movedMarker.getLatLng());
                                movedMarker.setLatLng(newlatlng);
                            }
                            layer.pm._adjustRectangleForMarkerMoveOrg(movedMarker);
                        }
                    }
                });

                //Line
                let lineLayers = layers.filter(layer => !(layer instanceof L.Rectangle) && (layer instanceof L.Polyline));
                lineLayers.forEach(function (layer) {
                    if (!(layer.pm.pmOrtho && layer.pm.pmOrtho.fncoverwritten)) {
                        layer.pm.pmOrtho = {fncoverwritten: true};
                        layer.pm._onMarkerDragOrg = layer.pm._onMarkerDrag;
                        layer.pm._onMarkerDrag = function (e) {
                            if (this._map.pm.pmOrtho._shiftpressed && this._map.pm.pmOrtho.options.allowOrtho) {
                                const marker = e.target;

                                const { indexPath, index, parentPath } = this.findDeepMarkerIndex(
                                    this._markers,
                                    marker
                                );
                                // only continue if this is NOT a middle marker
                                if (!indexPath) {
                                    return;
                                }
                                // the dragged markers neighbors
                                const markerArr = indexPath.length > 1 ? get(this._markers, parentPath) : this._markers;
                                // find the indizes of next and previous markers
                                const prevMarkerIndex = (index + (markerArr.length - 1)) % markerArr.length;
                                // get latlng of prev and next marker
                                const prevMarkerLatLng = markerArr[prevMarkerIndex].getLatLng();

                                let startAngle = 0;

                                if(this._map.pm.pmOrtho.options.baseAngleOfLastSegment && markerArr.length > 1){
                                    const prevPrevMarkerIndex = (index + (markerArr.length - 2)) % markerArr.length;
                                    const prevPrevMarkerLatLng = markerArr[prevPrevMarkerIndex].getLatLng();
                                    const lastPolygonPoint = this._map.latLngToContainerPoint(prevMarkerLatLng);
                                    const secondLastPolygonPoint = this._map.latLngToContainerPoint(prevPrevMarkerLatLng);
                                    startAngle = this._map.pm.pmOrtho._getAngle(secondLastPolygonPoint,lastPolygonPoint)+90;
                                    startAngle = startAngle > 180 ? startAngle - 180 : startAngle;
                                }

                                let newlatlng = this._map.pm.pmOrtho._getPointofAngle(prevMarkerLatLng, marker.getLatLng(),startAngle);
                                e.target._latlng = newlatlng;
                                e.target.update();
                            }
                            layer.pm._onMarkerDragOrg(e);
                        }
                        layer.pm.disable();
                        layer.pm.enable();
                    }
                });
            }else{
                e.map.pm.pmOrtho._disableShiftListener();
            }
        });


    },
    _findLayers(map) {
        let layers = [];
        map.eachLayer(layer => {
            if (
                layer instanceof L.Polyline ||
                layer instanceof L.Marker ||
                layer instanceof L.Circle ||
                layer instanceof L.CircleMarker
            ) {
                layers.push(layer);
            }
        });

        // filter out layers that don't have the leaflet-geoman instance
        layers = layers.filter(layer => !!layer.pm);

        // filter out everything that's leaflet-geoman specific temporary stuff
        layers = layers.filter(layer => !layer._pmTempLayer);

        return layers;
    },
    _extendedEnable(){
        let that = this;
        L.PM.Draw.Line.prototype.enableOrg = L.PM.Draw.Line.prototype.enable;
        L.PM.Draw.Line.prototype.enable = function (options) {
            this.enableOrg(options);
            that._enableShiftListener();
            this._map.off('click', this._createVertex, this);
            this._map.on('click', that._createVertexNew, this);
        };

        L.PM.Draw.Rectangle.prototype.enableOrg = L.PM.Draw.Rectangle.prototype.enable;
        L.PM.Draw.Rectangle.prototype.enable = function (options) {
            this.enableOrg(options);
            that._enableShiftListener();

            if (this.options.cursorMarker) {
                L.DomUtil.addClass(this._hintMarker._icon, 'visible');
                // Add two more matching style markers, if cursor marker is rendered
                this._styleMarkers = [];
                for (let i = 0; i < 4; i += 1) {
                    const styleMarker = L.marker([0, 0], {
                        icon: L.divIcon({
                            className: 'marker-icon rect-style-marker',
                        }),
                        draggable: false,
                        zIndexOffset: 100,
                    });
                    styleMarker._pmTempLayer = true;
                    this._layerGroup.addLayer(styleMarker);
                    this._styleMarkers.push(styleMarker);
                }
            }
        };
    },
    _extendedDisable(){
        let that = this;
        L.PM.Draw.Line.prototype.disableOrg = L.PM.Draw.Line.prototype.disable;
        L.PM.Draw.Line.prototype.disable = function () {
            this.disableOrg();
            that._disableShiftListener();
            this._map.off('click', that._createVertexNew, this);

        };

        L.PM.Draw.Rectangle.prototype.disableOrg = L.PM.Draw.Rectangle.prototype.disable;
        L.PM.Draw.Rectangle.prototype.disable = function () {
            this.disableOrg();
            that._disableShiftListener();
        };
        L.PM.Draw.Rectangle.include({_syncRectangleSize: this._syncRectangleSize});
    },
    _enableShiftListener(){
        if(this.map.pm.pmOrtho.options.allowOrtho) {
            this.map.pm.pmOrtho._shiftpressed = false;
            this.map.pm.pmOrtho._defaultBox =this.map.boxZoom.enabled();
            this.map.pm.pmOrtho._enableKeyListener();
        }
    },
    _disableShiftListener(){
        if(this.map.pm.pmOrtho.options.allowOrtho) {
            this.map.pm.pmOrtho._disableKeyListener();
        }
    },
    _syncHintMarker(that) {
        return function (e){
            const polyPoints = this._layer.getLatLngs();
            if (polyPoints.length > 0 && this._map.pm.pmOrtho._shiftpressed && this._map.pm.pmOrtho.options.allowOrtho) {
                const lastPolygonLatLng = polyPoints[polyPoints.length - 1];
                let latlng_mouse = e.latlng;

                let startAngle = 0;

                if(this._map.pm.pmOrtho.options.baseAngleOfLastSegment && polyPoints.length > 1){
                    const secondLastPolygonLatLng = polyPoints[polyPoints.length - 2];
                    const lastPolygonPoint = this._map.latLngToContainerPoint(lastPolygonLatLng);
                    const secondLastPolygonPoint = this._map.latLngToContainerPoint(secondLastPolygonLatLng);
                    startAngle = that._getAngle(secondLastPolygonPoint,lastPolygonPoint)+90;
                    startAngle = startAngle > 180 ? startAngle - 180 : startAngle;
                }

                let pt = that._getPointofAngle(lastPolygonLatLng, latlng_mouse,startAngle);
                this._hintMarker.setLatLng(pt);
                e.latlng = pt; //Because of intersection
            } else {
                // move the cursor marker
                this._hintMarker.setLatLng(e.latlng);
            }

            // if snapping is enabled, do it
            if (this.options.snappable) {
                const fakeDragEvent = e;
                fakeDragEvent.target = this._hintMarker;
                this._handleSnapping(fakeDragEvent);
            }

            // if self-intersection is forbidden, handle it
            if (!this.options.allowSelfIntersection) {
                this._handleSelfIntersection(true, this._hintMarker.getLatLng());
            }
        }
    },
    _createVertexNew(e){
        const polyPoints = this._layer.getLatLngs();
        if (polyPoints.length > 0 &&  this._map.pm.pmOrtho._shiftpressed &&  this._map.pm.pmOrtho.options.allowOrtho) {
            const lastPolygonLatLng = polyPoints[polyPoints.length - 1];
            let latlng_mouse = e.latlng;
            let startAngle = 0;

            if(this._map.pm.pmOrtho.options.baseAngleOfLastSegment && polyPoints.length > 1){
                const secondLastPolygonLatLng = polyPoints[polyPoints.length - 2];
                const lastPolygonPoint = this._map.latLngToContainerPoint(lastPolygonLatLng);
                const secondLastPolygonPoint = this._map.latLngToContainerPoint(secondLastPolygonLatLng);
                startAngle = this._map.pm.pmOrtho._getAngle(secondLastPolygonPoint,lastPolygonPoint)+90;
                startAngle = startAngle > 180 ? startAngle - 180 : startAngle;
            }

            let pt = this._map.pm.pmOrtho._getPointofAngle(lastPolygonLatLng,latlng_mouse,startAngle);
            e.latlng = pt; //Because of intersection
        }
        this._createVertex(e);
    },
    _syncRectangleSize() {
        // Create a box using corners A & B (A = Starting Position, B = Current Mouse Position)
        const A = this._startMarker.getLatLng();
        const B = this._hintMarker.getLatLng();

        this._layer.setBounds([A, B]);

        if(this._map.pm.pmOrtho.options.allowOrtho && this._map.pm.pmOrtho._shiftpressed) {
            this._cornerPoint = this._map.pm.pmOrtho._getRectanglePoint(A,B);
            this._layer.setBounds([A, this._cornerPoint]);
        }else{
            this._cornerPoint = null;
        }

        // Add matching style markers, if cursor marker is shown
        if (this.options.cursorMarker && this._styleMarkers) {
            const corners = this._findCorners();
            // Reposition style markers
            corners.forEach((unmarkedCorner, index) => {
                this._styleMarkers[index].setLatLng(unmarkedCorner);
            });
        }
    },
});




