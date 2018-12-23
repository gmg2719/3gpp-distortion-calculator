export declare enum IdcType {
    Harmonics = 0,
    IMD = 1
}
export declare class Band {
    name: string;
    fLow: number;
    fHigh: number;
    constructor(name: any, fLow: any, fHigh: any);
    centerFrequency(): number;
    bandwidth(): number;
}
export declare class BandIdc extends Band {
    idcType: IdcType;
    idcOrder: number;
    victims: Array<Band>;
    constructor(name: any, fLow: any, fHigh: any, idcType?: IdcType, idcOrder?: number);
}
export declare class Rat {
    dl: Array<Band>;
    ul: Array<Band>;
    constructor();
}
export declare class Rats {
    rat1: Rat;
    rat2: Rat;
    constructor();
}
