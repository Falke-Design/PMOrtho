import Utils from "./Utils";
import get from 'lodash/get';
import sector from '@turf/sector';
import bearing from '@turf/bearing';


L.PMOrtho = L.Class.extend({
    includes: [Utils],
    options: {
        allowOrtho: true,
        customKey: null,
        snapAngle: 45,
        baseAngleOfLastSegment: false,
        showAngleTooltip: true,
        angleText: "Angle: "
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
        if(!L.PM.PMOrthoFunctionAdded) {
            L.PM.PMOrthoFunctionAdded = true;
            this._extendedEnable();
            this._extendedDisable();
            L.PM.Draw.Line.prototype._syncHintMarker = this._syncHintMarker(this);

            L.PM.Draw.Rectangle.prototype._finishShapeOrg = L.PM.Draw.Rectangle.prototype._finishShape;
            L.PM.Draw.Rectangle.prototype._finishShape = function (e) {
                e.latlng = this._cornerPoint || e.latlng;
                this._hintMarker._snapped = this._cornerPoint ? false : this._hintMarker._snapped;
                this._finishShapeOrg(e);
            };

            L.PM.Draw.prototype._addDrawnLayerPropOrg = L.PM.Draw.prototype._addDrawnLayerProp;
            L.PM.Draw.prototype._addDrawnLayerProp = function (layer) {
                this._addDrawnLayerPropOrg(layer);

                if (layer instanceof L.Rectangle) {
                    layer.pm._adjustRectangleForMarkerMoveOrg = layer.pm._adjustRectangleForMarkerMove;
                    layer.pm._adjustRectangleForMarkerMove = function (movedMarker) {
                        if (this._map.pm.pmOrtho._shiftpressed && this._map.pm.pmOrtho.options.allowOrtho) {
                            let newlatlng = this._map.pm.pmOrtho._getRectanglePoint(movedMarker._oppositeCornerLatLng, movedMarker.getLatLng());
                            movedMarker.setLatLng(newlatlng);
                        }
                        layer.pm._adjustRectangleForMarkerMoveOrg(movedMarker);
                    }
                } else if (layer instanceof L.Polyline) {
                    layer.pm._onMarkerDragOrg = layer.pm._onMarkerDrag;
                    layer.pm._onMarkerDrag = function (e) {
                        const marker = e.target;

                        const {indexPath, index, parentPath} = this.findDeepMarkerIndex(
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
                        const nextMarkerIndex = (index + (markerArr.length + 1)) % markerArr.length;
                        // get latlng of prev and next marker
                        const prevMarkerLatLng = markerArr[prevMarkerIndex].getLatLng();
                        const nextMarkerLatLng = markerArr[nextMarkerIndex].getLatLng();

                        if (this._map.pm.pmOrtho._shiftpressed && this._map.pm.pmOrtho.options.allowOrtho) {
                            let startAngle = 0;

                            if (this._map.pm.pmOrtho.options.baseAngleOfLastSegment && markerArr.length > 1) {
                                const prevPrevMarkerIndex = (index + (markerArr.length - 2)) % markerArr.length;
                                const prevPrevMarkerLatLng = markerArr[prevPrevMarkerIndex].getLatLng();
                                const lastPolygonPoint = this._map.latLngToContainerPoint(prevMarkerLatLng);
                                const secondLastPolygonPoint = this._map.latLngToContainerPoint(prevPrevMarkerLatLng);
                                startAngle = this._map.pm.pmOrtho._getAngle(secondLastPolygonPoint, lastPolygonPoint) + 90;
                                startAngle = startAngle > 180 ? startAngle - 180 : startAngle;
                            }

                            let newlatlng = this._map.pm.pmOrtho._getPointofAngle(prevMarkerLatLng, marker.getLatLng(), startAngle);
                            e.target._latlng = newlatlng;
                            e.target.update();
                        }

                        if (markerArr.length > 1) {
                            if (!this._map.pm.pmOrtho._angleLine) {
                                this._map.pm.pmOrtho._angleLine = L.polyline([], {smoothFactor: 0}).addTo(this._map);
                            }

                            const centerPoint = this._map.latLngToContainerPoint(marker.getLatLng());
                            const lastPolygonPoint = this._map.latLngToContainerPoint(prevMarkerLatLng);
                            const nextPolygonPoint = this._map.latLngToContainerPoint(nextMarkerLatLng);

                            let angle = this._map.pm.pmOrtho._getAngle(centerPoint, nextPolygonPoint);
                            angle = this._map.pm.pmOrtho._formatAngle(angle - this._map.pm.pmOrtho._getAngle(centerPoint, lastPolygonPoint));

                            if (this._map.pm.pmOrtho.options.showAngleTooltip) {
                                const coords = this._map.pm.pmOrtho._addAngleLine(prevMarkerLatLng, marker.getLatLng(), nextMarkerLatLng).getLatLngs();

                                if (coords.length === 0) {
                                    this._map.pm.pmOrtho._angleLine.remove();
                                    this._map.pm.pmOrtho._angleLine = null;
                                } else {
                                    this._map.pm.pmOrtho._angleLine.setLatLngs(coords);
                                }


                                if (!this._map.pm.pmOrtho.tooltip) {
                                    this._map.pm.pmOrtho.tooltip = L.tooltip({
                                        permanent: true,
                                        offset: L.point(0, 10),
                                        direction: 'bottom',
                                        opacity: 0.8,
                                    }).setContent(this._map.pm.pmOrtho.options.angleText + angle).setLatLng(marker.getLatLng()).addTo(this._map);
                                } else {
                                    this._map.pm.pmOrtho.tooltip.setLatLng(marker.getLatLng()).setContent(this._map.pm.pmOrtho.options.angleText + angle);
                                }
                            } else {
                                this._map.pm.pmOrtho._angleLine.remove();
                                this._map.pm.pmOrtho._angleLine = null;
                                if (this._map.pm.pmOrtho.tooltip) {
                                    this._map.pm.pmOrtho.tooltip.remove();
                                    this._map.pm.pmOrtho.tooltip = null;
                                }
                            }
                        }

                        layer.pm._onMarkerDragOrg(e);
                    };
                    layer.pm._onMarkerDragEndOrg = layer.pm._onMarkerDragEnd;
                    layer.pm._onMarkerDragEnd = function (e) {
                        if (this._map.pm.pmOrtho._angleLine) {
                            this._map.pm.pmOrtho._angleLine.removeFrom(this._map.pm.pmOrtho.map);
                            this._map.pm.pmOrtho._angleLine = null;
                        }
                        if (this._map.pm.pmOrtho.tooltip) {
                            this._map.pm.pmOrtho.tooltip.removeFrom(this._map.pm.pmOrtho.map);
                            this._map.pm.pmOrtho.tooltip = null;
                        }

                        layer.pm._onMarkerDragEndOrg(e);
                    };
                }
            };
        }

        this.map.on('pm:create',(e)=>{
            var map = e.target;
            if(map._angleLine){
                map._angleLine.removeFrom(map);
                map._angleLine = null;
            }
            if(map.tooltip){
                map.tooltip.removeFrom(map);
                map.tooltip = null;
            }
        });

        //Edit
        this.map.on('pm:globaleditmodetoggled',function (e) {
            if(e.enabled) {
                e.map.pm.pmOrtho._enableShiftListener();
            }else{
                e.map.pm.pmOrtho._disableShiftListener();
            }
        });


    },
    _extendedEnable(){
        L.PM.Draw.Line.prototype.enableOrg = L.PM.Draw.Line.prototype.enable;
        L.PM.Draw.Line.prototype.enable = function (options) {
            this.enableOrg(options);
            this._map.pm.pmOrtho._enableShiftListener();
            this._map.off('click', this._createVertex, this);
            this._map.on('click', this._map.pm.pmOrtho._createVertexNew, this);
        };

        L.PM.Draw.Rectangle.prototype.enableOrg = L.PM.Draw.Rectangle.prototype.enable;
        L.PM.Draw.Rectangle.prototype.enable = function (options) {
            this.enableOrg(options);
            this._map.pm.pmOrtho._enableShiftListener();

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
        L.PM.Draw.Line.prototype.disableOrg = L.PM.Draw.Line.prototype.disable;
        L.PM.Draw.Line.prototype.disable = function () {
            this.disableOrg();
            this._map.pm.pmOrtho._disableShiftListener();
            this._map.off('click', this._map.pm.pmOrtho._createVertexNew, this);

            if (this._map.pm.pmOrtho._angleLine) {
                this._map.pm.pmOrtho._angleLine.remove();
                this._map.pm.pmOrtho._angleLine = null;
            }
            if (this._map.pm.pmOrtho.tooltip) {
                this._map.pm.pmOrtho.tooltip.remove();
                this._map.pm.pmOrtho.tooltip = null;
            }
        };

        L.PM.Draw.Rectangle.prototype.disableOrg = L.PM.Draw.Rectangle.prototype.disable;
        L.PM.Draw.Rectangle.prototype.disable = function () {
            this.disableOrg();
            this._map.pm.pmOrtho._disableShiftListener();
            if (this._map.pm.pmOrtho._angleLine) {
                this._map.pm.pmOrtho._angleLine.remove();
                this._map.pm.pmOrtho._angleLine = null;
            }
            if (this._map.pm.pmOrtho.tooltip) {
                this._map.pm.pmOrtho.tooltip.remove();
                this._map.pm.pmOrtho.tooltip = null;
            }
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
    _syncHintMarker() {
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
                    startAngle = this._map.pm.pmOrtho._getAngle(secondLastPolygonPoint,lastPolygonPoint);
                }

                let pt = this._map.pm.pmOrtho._getPointofAngle(lastPolygonLatLng, latlng_mouse,startAngle);
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

            if(polyPoints.length > 1) {
                if (!this._map.pm.pmOrtho._angleLine) {
                    this._map.pm.pmOrtho._angleLine = L.polyline([], {smoothFactor: 0}).addTo(this._map);
                    this._map.pm.pmOrtho._angleLine.setStyle(this._layer.options);
                }

                let startAngle = 0;

                const secondLastPolygonLatLng = polyPoints[polyPoints.length - 2];
                const lastPolygonLatLng = polyPoints[polyPoints.length - 1];
                const lastPolygonPoint = this._map.latLngToContainerPoint(lastPolygonLatLng);
                if(this._map.pm.pmOrtho.options.baseAngleOfLastSegment && polyPoints.length > 1){
                    const secondLastPolygonPoint = this._map.latLngToContainerPoint(secondLastPolygonLatLng);
                    startAngle = this._map.pm.pmOrtho._getAngle(secondLastPolygonPoint,lastPolygonPoint);
                }

                let latlng_mouse = this._hintMarker.getLatLng(); // because of snapping the hintmarker change position
                const mousePoint = this._map.latLngToContainerPoint(latlng_mouse);
                let angle = this._map.pm.pmOrtho._formatAngle(this._map.pm.pmOrtho._getAngle(mousePoint,lastPolygonPoint) -startAngle);


                if(this._map.pm.pmOrtho.options.showAngleTooltip) {
                    const coords = this._map.pm.pmOrtho._addAngleLine(secondLastPolygonLatLng, lastPolygonLatLng, latlng_mouse).getLatLngs();

                    if(coords.length === 0){
                        this._map.pm.pmOrtho._angleLine.remove();
                        this._map.pm.pmOrtho._angleLine = null;
                    }else{
                        this._map.pm.pmOrtho._angleLine.setLatLngs(coords);
                    }


                    if (!this._map.pm.pmOrtho.tooltip) {
                        this._map.pm.pmOrtho.tooltip = L.tooltip({
                            permanent: true,
                            offset: L.point(0, 10),
                            direction: 'bottom',
                            opacity: 0.8,
                        }).setContent(this._map.pm.pmOrtho.options.angleText + angle).setLatLng(lastPolygonLatLng).addTo(this._map);
                    } else {
                        this._map.pm.pmOrtho.tooltip.setLatLng(lastPolygonLatLng).setContent(this._map.pm.pmOrtho.options.angleText + angle);
                    }
                }else{
                    this._map.pm.pmOrtho._angleLine.remove();
                    this._map.pm.pmOrtho._angleLine = null;
                    if(this._map.pm.pmOrtho.tooltip){
                        this._map.pm.pmOrtho.tooltip.remove();
                        this._map.pm.pmOrtho.tooltip = null;
                    }
                }
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

            if(this._map.pm.pmOrtho._angleLine){
                this._map.pm.pmOrtho._angleLine.removeFrom(this._map);
                this._map.pm.pmOrtho._angleLine = null;
            }
            if(this._map.pm.pmOrtho.tooltip){
                this._map.pm.pmOrtho.tooltip.removeFrom(this._map);
                this._map.pm.pmOrtho.tooltip = null;
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
    _addAngleLine(p1,center,p2){
        let b1 = bearing(this._toLngLat(center), this._toLngLat(p1));
        let b2 = bearing(this._toLngLat(center), this._toLngLat(p2));
        b1 = b1 < 0 ? b1 +360 : b1; // bearing is by default between -180 and 180
        b2 = b2 < 0 ? b2 +360 : b2;

        let dis1 = p1.distanceTo(center);
        let dis2 = p2.distanceTo(center);

        // set the smallest distance as radius
        let radius = dis1;
        if(dis2 < radius){
            radius = dis2;
        }

        if(dis1/dis2 < 0.4){// smooth increasing of the circle, because the difference between the to lines is greater then 40%
            radius = dis1 * (1-(dis1/dis2));
        } else if( dis2/dis1 < 0.4){ // smooth increasing of the circle, because the difference between the to lines is greater then 40%
            radius = dis2 * (1-(dis2/dis1));
        } else{ // minimum circle-radius
            radius = radius * 0.4;
        }

        if(radius === 0){
            return L.polyline([]);
        }

        // crete the sector (circle part) with 360 latlng points
        let x = sector(this._toLngLat(center), radius / 1000, b1, b2, {steps: 360});
        let polygon = L.geoJson(x).getLayers()[0]; // get the polygon from the geojson
        let polyline = L.polyline(polygon.getLatLngs()); // we want to return a polyline no polygon
        return polyline;
    },
    _toLngLat(latlng){
        return [latlng.lng,latlng.lat];
    },
    _formatAngle(_angle){
        let angle = (_angle < 0 ? _angle + 360 : _angle) % 360;
        var angleold = angle;
        if(this._shiftpressed ){
            const val = (angle % 5);
            if( val < 2.5 && val > 1) {
                angle = parseInt(angle) - parseInt(Math.ceil(val));
            }else if( val > 2.5){
                angle = parseInt(angle)+parseInt(Math.ceil(5-val));
            }else{
                angle = parseInt(angle);
            }
        }
        return angle.toFixed(2);
    }
});




