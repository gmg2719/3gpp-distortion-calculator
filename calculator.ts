import { readFileSync, writeFileSync } from 'fs';
import { parse, resolve } from 'path';

let Comb = require('js-combinatorics');

export class Band {
    name: string;
    fLow: number;
    fHigh: number;

    constructor(name, fLow, fHigh) {
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

export function calculateIMD(bandsAll: Array<Band>,
                            numBands: number = 2,
                            order: number = 2): Array<Band> {
    let combsBands: Array<Array<Band>> = Comb.combination(bandsAll, numBands)
                                            .toArray();
    let combsCoeffs = combinatorialSum(order, numBands);
    let combsSigns = Comb.baseN([1, -1], numBands).toArray();
    let combsCoeffsWithSigns: Array<Array<number>> = [];
    for (let coeffs of combsCoeffs) {
        for (let signs of combsSigns) {
            let coeffsWithSigns: Array<number> = [];
            for (let i = 0; i < coeffs.length; i++) {
                coeffsWithSigns.push(coeffs[i] * signs[i]);
            }
            combsCoeffsWithSigns.push(coeffsWithSigns);
        }
    }
    let bandsImd: Array<Band> = [];
    for (let bands of combsBands) {
        for (let coeffsWithSings of combsCoeffsWithSigns) {
            let bandCombName = '';
            let centerFrequency = 0;
            let bandwidth = 0;
            for (let i = 0; i < coeffsWithSings.length; i++) {
                let coeffString = `${coeffsWithSings[i] > 0 ? '+' : '-'}${Math.abs(coeffsWithSings[i]) == 1 ? '' : Math.abs(coeffsWithSings[i])}`;
                bandCombName += `${coeffString}${bands[i].name} `;
                centerFrequency += coeffsWithSings[i] * bands[i].centerFrequency();
                bandwidth += Math.abs(coeffsWithSings[i]) * bands[i].bandwidth();
            }
            let fLow = centerFrequency - bandwidth / 2;
            let fHigh = fLow + bandwidth;
            let bandImd = new Band(bandCombName, fLow, fHigh);
            for (let band of bandsAll) {
                if (!doesOverlap(band, bandImd)) {
                    continue;
                }
                bandsImd.push(band);
            }
        }
    }
    return bandsImd;
}

function combinatorialSum(targetSum: number, numPartitions: number): Array<Array<number>> {
    if (targetSum < numPartitions) {
        return null;
    }
    if (numPartitions == 1) {
        return [[targetSum]];
    }
    let combs: Array<Array<number>> = [];
    for (let i = 1; i <= targetSum - (numPartitions - 1); i++) {
        let combsSub = combinatorialSum(targetSum - i, numPartitions - 1);
        for (let comb of combsSub) {
            combs.push(Array.prototype.concat(i, comb));
        }
    }
    return combs;
}

function doesOverlap(band1: Band, band2: Band) {
    return band1.fLow <= band2.fHigh && band2.fLow <= band1.fHigh;
}

export function parseBands(content: string): Array<Band> {
    let bands: Array<Band> = [];
    let lines = content.split('\n');
    for (let line of lines) {
        let tokens = line.split(' ');
        if (tokens.length != 3) {
            continue;
        }
        bands.push(new Band(tokens[0], Number(tokens[1]), Number(tokens[2])));
    }
    return bands;
}

if (require.main == module) {
    if (process.argv.length >= 3) {
        let file = parse(process.argv[2]);
        let content = readFileSync(resolve(process.cwd(), file.dir, file.base),
                                    'utf8')
        let bands = parseBands(content);
        let idcResult = calculateIMD(bands, 2, 3);
    } else {
    }
}
