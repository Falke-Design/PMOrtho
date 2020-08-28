let shiftUtils = {
    _enableKeyListener(){
        console.log('enabled')
        L.DomEvent.on(this.map.getContainer(),'keydown', this._keyDownFunction,this);
        L.DomEvent.on(this.map.getContainer(),'keyup', this._keyDownFunction,this);
        L.DomEvent.on(this.map.getContainer(), 'mouseover', this._keyDownFunction, this);
        this.map.boxZoom.disable();
    },
    _disableKeyListener(){
        console.log('disabled')
        L.DomEvent.off(this.map.getContainer(),'keydown', this._keyDownFunction,this);
        L.DomEvent.off(this.map.getContainer(),'keyup', this._keyDownFunction,this);
        L.DomEvent.off(this.map.getContainer(), 'mouseover', this._keyDownFunction, this);

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
            let customKey = this.map.pm.pmOrtho.options.customKey;
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
    _getPointofAngle(latlng_p1,latlng_p2,startAngle=0) {
        let p1 = this.map.latLngToContainerPoint(latlng_p1);
        let p2 = this.map.latLngToContainerPoint(latlng_p2);

        let distance = this._getDistance(p1, p2);
        //Get the angle between the two points
        let pointAngle = this._getAngle(p1, p2);

        let angle = 0;
        let angles = [];
        if(this.options.snapAngle){
            angles = [-180];
            let current = -180;
            let i = 0;
            while(i < (360/this.options.snapAngle)){
                current = current+this.options.snapAngle;
                angles.push(current);
                i++;
            }
        } else {
            angles = [-180, -135, -90, -45, 0, 45, 90, 135, 180];
        }

        angle = angles.reduce(function(prev, curr) {
            return (Math.abs(curr - pointAngle+startAngle) < Math.abs(prev - pointAngle+startAngle) ? curr : prev);
        });

        let point_result2 = this._findDestinationPoint(p1, distance, angle+startAngle);
        return this.map.containerPointToLatLng(point_result2);
    },

    _findDestinationPoint(point, distance, angle) {
        angle = angle - 90;
        let x = Math.round(Math.cos(angle * Math.PI / 180) * distance + point.x);
        let y = Math.round(Math.sin(angle * Math.PI / 180) * distance + point.y);
        return {x: x, y:y};
    },
    _getDistance(p1,p2){
        let x = p1.x - p2.x;
        let y = p1.y - p2.y;
        return Math.sqrt( x*x + y*y );
    },
    _getAngle(p1,p2){
        let x = p1.x - p2.x;
        let y = p1.y - p2.y;
        let _angle = ((Math.atan2(y, x) * 180 / Math.PI) * (-1) - 90)* (-1);
        return _angle < 0 ? _angle + 180 : _angle - 180;
    },
    _getRectanglePoint(A,B){
        let rect = L.rectangle([A,B]);

        let rectangleWidth = this.map.latLngToContainerPoint(A).x - this.map.latLngToContainerPoint(B).x;
        let rectangleHeight = this.map.latLngToContainerPoint(A).y - this.map.latLngToContainerPoint(B).y;
        let w = this.map.pm.pmOrtho._getDistance(this.map.latLngToContainerPoint(rect.getBounds().getNorthEast()), this.map.latLngToContainerPoint(rect.getBounds().getNorthWest()));
        let h = this.map.pm.pmOrtho._getDistance(this.map.latLngToContainerPoint(rect.getBounds().getNorthEast()), this.map.latLngToContainerPoint(rect.getBounds().getSouthEast()));

        let pt_A = this.map.latLngToContainerPoint(A);
        let pt_B = this.map.latLngToContainerPoint(B);

        let d;
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
    //
};

export default shiftUtils
