"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const types_1 = require("./types");
let ConfigParser = require('configparser');
let Comb = require('js-combinatorics');
function calculateHarmonics(bandsUl, bandsDl, order = 2) {
    let bandsHarmonics = [];
    for (let bandUl of bandsUl) {
        let centerFrequency = order * bandUl.centerFrequency();
        let bandwidth = order * bandUl.bandwidth();
        let fLow = centerFrequency - bandwidth / 2;
        let fHigh = fLow + bandwidth;
        let bandHarmonics = new types_1.BandIdc(`${bandUl.name}`, fLow, fHigh, types_1.IdcType.Harmonics, order);
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
exports.calculateHarmonics = calculateHarmonics;
function calculateIMD(bandsUl1, bandsUl2, bandsDl, order = 2) {
    let combsBands = [];
    for (let bandUl1 of bandsUl1) {
        for (let bandUl2 of bandsUl2) {
            combsBands.push([bandUl1, bandUl2]);
        }
    }
    let combsCoeffs = combinatorialSum(order, 2);
    let combsSigns = Comb.baseN([1, -1], 2).toArray();
    let combsCoeffsWithSigns = [];
    for (let coeffs of combsCoeffs) {
        for (let signs of combsSigns) {
            let coeffsWithSigns = [];
            for (let i = 0; i < coeffs.length; i++) {
                coeffsWithSigns.push(coeffs[i] * signs[i]);
            }
            combsCoeffsWithSigns.push(coeffsWithSigns);
        }
    }
    let bandsImd = [];
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
            let bandImd = new types_1.BandIdc(bandCombName, fLow, fHigh, types_1.IdcType.IMD, order);
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
exports.calculateIMD = calculateIMD;
function combinatorialSum(targetSum, numPartitions) {
    if (targetSum < numPartitions) {
        return null;
    }
    if (numPartitions == 1) {
        return [[targetSum]];
    }
    let combs = [];
    for (let i = 1; i <= targetSum - (numPartitions - 1); i++) {
        let combsSub = combinatorialSum(targetSum - i, numPartitions - 1);
        for (let comb of combsSub) {
            combs.push(Array.prototype.concat(i, comb));
        }
    }
    return combs;
}
function doesOverlap(band1, band2) {
    return band1.fLow <= band2.fHigh && band2.fLow <= band1.fHigh;
}
function parseBands(configParse, sectionName) {
    let bands = [];
    for (let bandName in configParse.items(sectionName)) {
        let frequencies = configParse.get(sectionName, bandName).split(' ');
        if (frequencies.length != 2) {
            continue;
        }
        bands.push(new types_1.Band(bandName, Number(frequencies[0]), Number(frequencies[1])));
    }
    return bands;
}
exports.parseBands = parseBands;
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
        let file = path_1.parse(process.argv[2]);
        let config = new ConfigParser();
        config.read(process.argv[2]);
        let rats = new types_1.Rats();
        rats.rat1.dl = parseBands(config, 'RAT1 DL');
        rats.rat1.ul = parseBands(config, 'RAT1 UL');
        rats.rat2.dl = parseBands(config, 'RAT2 DL');
        rats.rat2.ul = parseBands(config, 'RAT2 UL');
        let bandsDistortion = [];
        let bandsHarmonics = [];
        let bandsImd = [];
        let orderMax = 4;
        for (let order = 2; order <= orderMax; order++) {
            bandsHarmonics = bandsHarmonics.concat(calculateHarmonics(rats.rat1.ul, rats.rat2.dl, order));
            bandsHarmonics = bandsHarmonics.concat(calculateHarmonics(rats.rat2.ul, rats.rat1.dl, order));
            for (let nBands = 2; nBands <= order; nBands++) {
                bandsImd = bandsImd.concat(calculateIMD(rats.rat1.ul, rats.rat2.ul, rats.rat1.dl, order));
                bandsImd = bandsImd.concat(calculateIMD(rats.rat1.ul, rats.rat2.ul, rats.rat2.dl, order));
            }
        }
        bandsDistortion = bandsHarmonics.concat(bandsImd).sort(function (a, b) {
            return a.idcOrder - b.idcOrder;
        });
        let fMax = Math.max(getFreqMax(rats.rat1.dl), getFreqMax(rats.rat1.ul), getFreqMax(rats.rat2.dl), getFreqMax(rats.rat2.ul), getFreqMax(bandsHarmonics), getFreqMax(bandsImd));
        orderMax = Math.max(getOrderMax(bandsHarmonics), getOrderMax(bandsImd));
        let result = { rats: rats,
            idc: { IMD: bandsImd, Harmonics: bandsHarmonics } };
        console.log(JSON.stringify(result, null, 2));
        // TODO: draw
    }
    else {
    }
}
