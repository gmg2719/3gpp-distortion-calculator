import { readFileSync, writeFileSync } from 'fs';
import { parse, resolve } from 'path';
import { IdcType, Band, BandIdc } from './types';

let ConfigParser = require('configparser');
let Comb = require('js-combinatorics');

export function calculateHarmonics(bandsUl: Array<Band>, bandsDl: Array<Band>,
                                    order: number = 2): Array<BandIdc> {
    let bandsHarmonics: Array<BandIdc> = [];
    for (let bandUl of bandsUl) {
        let centerFrequency = order * bandUl.centerFrequency();
        let bandwidth = order * bandUl.bandwidth();
        let fLow = centerFrequency - bandwidth / 2;
        let fHigh = fLow + bandwidth;
        let bandHarmonics = new BandIdc(`${bandUl.name}`,
                                        fLow, fHigh, IdcType.Harmonics, order);
        for (let bandDl of bandsDl) {
            if (doesOverlap(bandDl, bandHarmonics)) {
                bandHarmonics.victims.push(bandDl);
            }
        }
        if (bandHarmonics.victims.length) {
            bandsHarmonics.push(bandHarmonics);
        }
    }
    return bandsHarmonics;
}

export function calculateIMD(bandsUl: Array<Band>, bandsDl: Array<Band>,
                            numBands: number = 2,
                            order: number = 2): Array<BandIdc> {
    let combsBands: Array<Array<Band>> = Comb.combination(bandsUl, numBands)
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
    let bandsImd: Array<BandIdc> = [];
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
            let bandImd = new BandIdc(bandCombName, fLow, fHigh,
                                    IdcType.IMD, order);
            for (let bandDl of bandsDl) {
                if (doesOverlap(bandDl, bandImd)) {
                    bandImd.victims.push(bandDl);
                }
            }
            if (bandImd.victims.length) {
                bandsImd.push(bandImd);
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

export function parseBands(configParse, sectionName: string): Array<Band> {
    let bands: Array<Band> = [];
    for (let bandName in configParse.items(sectionName)) {
        let frequencies = configParse.get(sectionName, bandName).split(' ');
        if (frequencies.length != 2) {
            continue;
        }
        bands.push(new Band(bandName,
            Number(frequencies[0]), Number(frequencies[1])));
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

if (require.main == module) {
    if (process.argv.length >= 3) {
        let file = parse(process.argv[2]);
        let config = new ConfigParser();
        config.read(process.argv[2]);
        let bandsUl = parseBands(config, 'UL');
        let bandsDl = parseBands(config, 'DL');
        let bandsDistortion: Array<BandIdc> = [];
        let bandsHarmonics: Array<BandIdc> = [];
        let bandsImd: Array<BandIdc> = [];
        let orderMax = 9;
        for (let order = 2; order <= orderMax; order++) {
            bandsHarmonics = bandsHarmonics.concat(calculateHarmonics(bandsUl,
                                                                        bandsDl,
                                                                        order));
            for (let nBands = 2; nBands <= order; nBands++) {
                bandsImd = bandsImd.concat(calculateIMD(bandsUl, bandsDl,
                                                        nBands, order));
            }
        }
        bandsDistortion = bandsHarmonics.concat(bandsImd).sort(function (a, b) {
            return a.idcOrder - b.idcOrder;
        });
        let fMax = Math.max(getFreqMax(bandsUl), getFreqMax(bandsDl),
                            getFreqMax(bandsHarmonics), getFreqMax(bandsImd));
        orderMax = Math.max(getOrderMax(bandsHarmonics),
                                getOrderMax(bandsImd));
        let result = {'UL bands': bandsUl, 'DL bands': bandsDl,
                     'IMD': bandsImd, 'Harmonics': bandsHarmonics};
        console.log(JSON.stringify(result, null, 2));
        // TODO: draw
    } else {
    }
}
