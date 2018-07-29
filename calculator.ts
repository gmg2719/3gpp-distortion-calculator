import { readFileSync, writeFileSync } from 'fs';
import { parse, resolve } from 'path';

let Comb = require('js-combinatorics');
let window = require('svgdom');
let SVG = require('svg.js')(window);
let rectHeight = 50;
let yMargin = 50;
let yStep = rectHeight + yMargin;
let yOffset = 5;

enum IdcType { Harmonics, IMD }

class Band {
    name: string;
    fLow: number;
    fHigh: number;
    idcType: IdcType;
    idcOrder: number;

    constructor(name, fLow, fHigh,
                idcType: IdcType = null, idcOrder: number = null) {
        this.name = name;
        this.fLow = fLow;
        this.fHigh = fHigh;
        this.idcType = idcType;
        this.idcOrder = idcOrder;
    }

    centerFrequency(): number {
        return (this.fHigh + this.fLow) / 2;
    }

    bandwidth(): number {
        return this.fHigh - this.fLow;
    }
}

export function calculateHarmonics(bandsAll: Array<Band>,
                                    order: number = 2): Array<Band> {
    let bandsHarmonics: Array<Band> = [];
    for (let band of bandsAll) {
        let centerFrequency = order * band.centerFrequency();
        let bandwidth = order * band.bandwidth();
        let fLow = centerFrequency - bandwidth / 2;
        let fHigh = fLow + bandwidth;
        let bandHarmonics = new Band(`${band.name} order: ${order}`,
                                        fLow, fHigh, IdcType.Harmonics, order);
        for (let bandVictim of bandsAll) {
            if (!doesOverlap(bandVictim, bandHarmonics)) {
                continue;
            }
            bandsHarmonics.push(bandHarmonics);
        }
    }
    return bandsHarmonics;
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
                bandCombName += `${coeffString}${bands[i].name}`;
                centerFrequency += coeffsWithSings[i] * bands[i].centerFrequency();
                bandwidth += Math.abs(coeffsWithSings[i]) * bands[i].bandwidth();
            }
            if (bandCombName[0] == '+') {
                bandCombName = bandCombName.substring(1);
            }
            let fLow = centerFrequency - bandwidth / 2;
            let fHigh = fLow + bandwidth;
            let bandImd = new Band(bandCombName, fLow, fHigh,
                                    IdcType.IMD, order);
            for (let band of bandsAll) {
                if (doesOverlap(band, bandImd)) {
                    bandsImd.push(bandImd);
                    break;
                }
            }
        }
    }
    return bandsImd;
}

function combinatorialSum(targetSum: number,
                            numPartitions: number):Array<Array<number>> {
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

function getFreqMax(bands) {
    let fMax = 0;
    for (let band of bands) {
        fMax = Math.max(fMax, band.fHigh);
    }
    return fMax;
}

function getOrderMax(bands) {
    let orderMax = 0;
    for (let band of bands) {
        orderMax = Math.max(orderMax, band.idcOrder);
    }
    return orderMax;
}

function drawIdcBands(bands: Array<Band>, draw, yStart: number, color: string) {
    let y: number;
    let offset: number;
    let orderCurr: number = null;
    for (let band of bands) {
        if (!orderCurr) {
            y = yStart;
            offset = 0;
            orderCurr = band.idcOrder;
        } else if (orderCurr != band.idcOrder) {
            y += yStep;
            offset = 0;
            orderCurr = band.idcOrder;
        } else {
            offset -= yOffset;
        }
        draw.rect((band.fHigh - band.fLow), rectHeight)
                .move(band.fLow, yStep * band.idcOrder + yMargin + offset)
                .stroke({color: color}).fill({opacity: 0});
        draw.plain(band.name).move(band.fLow,
                                    yStep * band.idcOrder + yMargin + offset);
        draw.plain(`${band.fLow}`).move(band.fLow,
                                        yStep * band.idcOrder + yStep);
        draw.plain(`${band.fHigh}`).move(band.fHigh,
                                            yStep * band.idcOrder + yStep + 10);
    }
    return y;
}

if (require.main == module) {
    if (process.argv.length >= 3) {
        let file = parse(process.argv[2]);
        let content = readFileSync(resolve(process.cwd(), file.dir, file.base),
                                    'utf8')
        let bands = parseBands(content);
        let fMax = getFreqMax(bands);
        console.log('===== Bands =====');
        console.log(bands);
        let bandsHarmonics: Array<Band> = [];
        let bandsImd: Array<Band> = [];
        for (let order = 2; order < 9; order++) {
            bandsHarmonics = bandsHarmonics.concat(calculateHarmonics(bands,
                                                                        order));
            bandsImd = bandsImd.concat(calculateIMD(bands, 2, order));
        }
        fMax = Math.max(getFreqMax(bands),
                        getFreqMax(bandsHarmonics),
                        getFreqMax(bandsImd));
        let orderMax = Math.max(getOrderMax(bandsHarmonics),
                                getOrderMax(bandsImd));
        console.log('===== Harmonics =====');
        console.log(bandsHarmonics);
        console.log('===== IMD =====');
        console.log(bandsImd);
        let document = window.document;
        let draw = SVG(document.documentElement).size(fMax + 100, 1000);
        for (let order = 2; order <= orderMax; order++) {
            let y = yStep * order;
            draw.plain(`Order: ${order}`).move(0, y + yStep);
            draw.line(0, y + yStep, fMax + 100, y + yStep)
                .stroke({color: '#000', width: 1});
        }
        // Given bands
        for (let band of bands) {
            draw.rect((band.fHigh - band.fLow), rectHeight)
                .move(band.fLow, yMargin)
                .stroke({color: '#000'}).fill({opacity: 0});
            draw.plain(band.name).move(band.fLow, yMargin);
            draw.plain(`${band.fLow}`).move(band.fLow, yStep);
            draw.plain(`${band.fHigh}`).move(band.fHigh, yStep + 10);
        }
        draw.line(0, yStep, fMax + 100, yStep)
            .stroke({color: '#000', width: 1});
        // Harmonics
        let y = drawIdcBands(bandsHarmonics, draw, yStep, '#00f');
        // IMD
        drawIdcBands(bandsImd, draw, y, '#f00');
        writeFileSync('test.svg', draw.svg());
    } else {
    }
}
