var shiftUtils = {
    _enableKeyListener(){
        console.log('enabled')
        L.DomEvent.on(document,'keydown', this._keyDownFunction,this)
        L.DomEvent.on(document,'keyup', this._keyDownFunction,this)
        this.map.boxZoom.disable();
    },
    _disableKeyListener(){
        console.log('disabled')
        L.DomEvent.off(document,'keydown', this._keyDownFunction,this)
        L.DomEvent.off(document,'keyup', this._keyDownFunction,this)

        //Reset to default boxZoom
        if(this.map.pm.pmOrtho._defaultBox) {
            this.map.boxZoom.enable();
        }
    },
    _keyDownFunction(e) {
        if(e.type == "keyup"){
            this.map.pm.pmOrtho._shiftpressed = false;
            return;
        }
        if(this.map.pm.pmOrtho.options.customKey && this.map.pm.pmOrtho.options.customKey !== "shift"){
            var customKey = this.map.pm.pmOrtho.options.customKey;
            if(e.key == customKey){
                this.map.pm.pmOrtho._shiftpressed = true;
            }else if(e.code == customKey){
                this.map.pm.pmOrtho._shiftpressed = true;
            }else if (e.which == customKey){
                this.map.pm.pmOrtho._shiftpressed = true;
            }else if(e.keyCode == customKey){
                this.map.pm.pmOrtho._shiftpressed = true;
            }else if(customKey == "alt" && e.altKey){
                this.map.pm.pmOrtho._shiftpressed = true;
            }else if((customKey == "strg" || customKey == "ctrl") && e.ctrlKey){
                this.map.pm.pmOrtho._shiftpressed = true;
            }else{
                this.map.pm.pmOrtho._shiftpressed = false;
            }
        }else {
            this.map.pm.pmOrtho._shiftpressed = e.shiftKey;
        }
    },
    _getPointofAngle(latlng_p1,latlng_p2) {
        var p1 = this.map.latLngToContainerPoint(latlng_p1);
        var p2 = this.map.latLngToContainerPoint(latlng_p2);

        var distance = this._getDistance(p1, p2);

        //Get the angle between the two points
        var pointAngle = this._getAngle(p1, p2);

        var angle = 0;
        //45° steps
        if(pointAngle <= 22.5 && pointAngle > -22.5){
            angle = 0;
        }else if(pointAngle <= 67.5 && pointAngle > 22.5){
            angle = 45;
            return this._getRectanglePoint(latlng_p1,latlng_p2);
        }else if(pointAngle <= 112.5 && pointAngle > 67.5){
            angle = 90;
        }else if(pointAngle <= 157.5 && pointAngle > 112.5){
            angle = 135;
            return this._getRectanglePoint(latlng_p1,latlng_p2);
        }else if(pointAngle <= 180 && pointAngle > 157.5){
            angle = 180;
        }else if(pointAngle <= -157.5 && pointAngle > -180){
            angle = -180;
        }else if(pointAngle <= -112.5 && pointAngle > -157.5 ){
            angle = -135;
            return this._getRectanglePoint(latlng_p1,latlng_p2);
        }else if(pointAngle <= -67.5 && pointAngle > -112.5 ){
            angle = -90;
        }else if(pointAngle <= -22.5 && pointAngle > -67.5 ){
            angle = -45;
            return this._getRectanglePoint(latlng_p1,latlng_p2);
        }

        var point_result2 = this._findDestinationPoint(p1, distance, angle);
        return this.map.containerPointToLatLng(point_result2);
    },

    _findDestinationPoint(point, distance, angle) {
        angle = angle - 90;
        var x = Math.round(Math.cos(angle * Math.PI / 180) * distance + point.x);
        var y = Math.round(Math.sin(angle * Math.PI / 180) * distance + point.y);
        return {x: x, y:y};
    },
    _getDistance(p1,p2){
        var x = p1.x - p2.x;
        var y = p1.y - p2.y;
        return Math.sqrt( x*x + y*y );
    },
    _getAngle(p1,p2){
        var x = p1.x - p2.x;
        var y = p1.y - p2.y;
        var _angle = ((Math.atan2(y, x) * 180 / Math.PI) * (-1) - 90)* (-1);
        return _angle < 0 ? _angle + 180 : _angle - 180;
    },
    _getRectanglePoint(A,B){
        var rect = L.rectangle([A,B]);

        var rectangleWidth = this.map.latLngToContainerPoint(A).x - this.map.latLngToContainerPoint(B).x;
        var rectangleHeight = this.map.latLngToContainerPoint(A).y - this.map.latLngToContainerPoint(B).y;
        var w = this.map.pm.pmOrtho._getDistance(this.map.latLngToContainerPoint(rect.getBounds().getNorthEast()), this.map.latLngToContainerPoint(rect.getBounds().getNorthWest()));
        var h = this.map.pm.pmOrtho._getDistance(this.map.latLngToContainerPoint(rect.getBounds().getNorthEast()), this.map.latLngToContainerPoint(rect.getBounds().getSouthEast()));

        var pt_A = this.map.latLngToContainerPoint(A);
        var pt_B = this.map.latLngToContainerPoint(B);

        var d;
        if (w > h) {
            const p = {x: pt_B.x, y: pt_A.y};
            const angle = rectangleHeight < 0 ? 180 : 0;
            d = this.map.pm.pmOrtho._findDestinationPoint(p, w , angle);
        } else {
            const p = {x: pt_A.x, y: pt_B.y};
            const angle = rectangleWidth < 0 ? 90 : -90;
            d = this.map.pm.pmOrtho._findDestinationPoint(p, h, angle);
        }
        return this.map.containerPointToLatLng(d);
    }
};

export default shiftUtils