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
}

export function calculate(bandsAll: Array<Band>,
                            numBands: number = 2,
                            order: number = 2) {
    let combsBands = Comb.combination(bandsAll, numBands).toArray();
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

export function parseBands(content: string): Array<Band> {
    let bands: Array<Band> = [];
    let lines = content.split('\n');
    for (let line of lines) {
        let tokens = line.split(' ');
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
        let idcResult = calculate(bands);
    } else {
    }
}
