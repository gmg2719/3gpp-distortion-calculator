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

export function calculate(bands: Array<Band>,
                            numBands: Number = 2,
                            order: Number = 2) {
    let combs = Comb.combination(bands, numBands);
    let comb;
    // TODO: combinational sum
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
