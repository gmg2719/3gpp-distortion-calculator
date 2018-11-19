export enum IdcType { Harmonics, IMD }

export class Band {
    name: string;
    fLow: number;
    fHigh: number;

    constructor(name, fLow, fHigh,) {
        this.name = name;
        this.fLow = fLow;
        this.fHigh = fHigh;
    }

    centerFrequency(): number {
        return (this.fHigh + this.fLow) / 2;
    }

    bandwidth(): number {
        return this.fHigh - this.fLow;
    }
}

export class BandIdc extends Band {
    idcType: IdcType;
    idcOrder: number;
    victims: Array<Band>;

    constructor(name, fLow, fHigh, idcType: IdcType = null,
                                   idcOrder: number = null) {
        super(name, fLow, fHigh);
        this.idcType = idcType;
        this.idcOrder = idcOrder;
        this.victims = [];
    }
}
