"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var IdcType;
(function (IdcType) {
    IdcType[IdcType["Harmonics"] = 0] = "Harmonics";
    IdcType[IdcType["IMD"] = 1] = "IMD";
})(IdcType = exports.IdcType || (exports.IdcType = {}));
class Band {
    constructor(name, fLow, fHigh) {
        this.name = name;
        this.fLow = fLow;
        this.fHigh = fHigh;
    }
    centerFrequency() {
        return (this.fHigh + this.fLow) / 2;
    }
    bandwidth() {
        return this.fHigh - this.fLow;
    }
}
exports.Band = Band;
class BandIdc extends Band {
    constructor(name, fLow, fHigh, idcType = null, idcOrder = null) {
        super(name, fLow, fHigh);
        this.idcType = idcType;
        this.idcOrder = idcOrder;
        this.victims = [];
    }
}
exports.BandIdc = BandIdc;
