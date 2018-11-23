"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const types_1 = require("./types");
let ConfigParser = require('configparser');
let Comb = require('js-combinatorics');
let window = require('svgdom');
let SVG = require('svg.js')(window);
let rectHeight = 50;
let yMargin = 50;
let yStep = rectHeight + yMargin;
let yOffsetText = 15;
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
function calculateIMD(bandsUl, bandsDl, numBands = 2, order = 2) {
    let combsBands = Comb.combination(bandsUl, numBands)
        .toArray();
    let combsCoeffs = combinatorialSum(order, numBands);
    let combsSigns = Comb.baseN([1, -1], numBands).toArray();
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
function drawBands(bands, draw, height = rectHeight, offset = 0) {
    for (let band of bands) {
        draw.rect((band.fHigh - band.fLow), height)
            .move(band.fLow, offset)
            .stroke({ color: '#000' }).fill({ opacity: 0 });
        draw.plain(band.name).move(band.fLow, offset);
        draw.plain(`${band.fLow}`).move(band.fLow, rectHeight);
        draw.plain(`${band.fHigh}`).move(band.fHigh, rectHeight + yOffsetText);
    }
}
function drawIdcBands(bandsIdc, draw, yStart, fMax) {
    let y;
    let orderCurr = null;
    let fLow = [];
    let fHigh = [];
    for (let band of bandsIdc) {
        if (!orderCurr) {
            y = yStart;
            orderCurr = band.idcOrder;
        }
        else if (orderCurr == band.idcOrder) {
            y += rectHeight;
        }
        else {
            y += rectHeight;
            drawAxis(draw, y, orderCurr, fMax, fLow, fHigh);
            fLow = [];
            fHigh = [];
            y += yMargin;
            orderCurr = band.idcOrder;
        }
        draw.rect((band.fHigh - band.fLow), rectHeight)
            .move(band.fLow, y)
            .stroke({ color: band.idcType == types_1.IdcType.Harmonics ? '#00f' : '#f00' })
            .fill({ opacity: 0 });
        draw.plain(band.name).move(band.fLow, y);
        draw.plain(band.fLow.toFixed(1)).move(band.fLow, y + yOffsetText);
        draw.plain(band.fHigh.toFixed(1)).move(band.fHigh, y + 2 * yOffsetText);
    }
    y += rectHeight;
    drawAxis(draw, y, orderCurr, fMax, fLow, fHigh);
    return y;
}
function drawAxis(draw, y, orderCurr, fMax, fLow, fHigh) {
    draw.plain(`Order: ${orderCurr}`).move(0, y);
    draw.line(0, y, fMax + 100, y)
        .stroke({ color: '#000', width: 1 });
    for (let f of fLow) {
        draw.plain(`${f.toFixed(1)}`).move(f, y);
    }
    for (let f of fHigh) {
        draw.plain(`${f.toFixed(1)}`).move(f, y + yOffsetText);
    }
}
if (require.main == module) {
    if (process.argv.length >= 3) {
        let file = path_1.parse(process.argv[2]);
        let config = new ConfigParser();
        config.read(process.argv[2]);
        let bandsUl = parseBands(config, 'UL');
        let bandsDl = parseBands(config, 'DL');
        let bandsDistortion = [];
        let bandsHarmonics = [];
        let bandsImd = [];
        let orderMax = 9;
        for (let order = 2; order <= orderMax; order++) {
            bandsHarmonics = bandsHarmonics.concat(calculateHarmonics(bandsUl, bandsDl, order));
            for (let nBands = 2; nBands <= order; nBands++) {
                bandsImd = bandsImd.concat(calculateIMD(bandsUl, bandsDl, nBands, order));
            }
        }
        bandsDistortion = bandsHarmonics.concat(bandsImd).sort(function (a, b) {
            return a.idcOrder - b.idcOrder;
        });
        let fMax = Math.max(getFreqMax(bandsUl), getFreqMax(bandsDl), getFreqMax(bandsHarmonics), getFreqMax(bandsImd));
        orderMax = Math.max(getOrderMax(bandsHarmonics), getOrderMax(bandsImd));
        let result = { 'UL bands': bandsUl, 'DL bands': bandsDl,
            'IMD': bandsImd, 'Harmonics': bandsHarmonics };
        console.log(JSON.stringify(result, null, 2));
        let document = window.document;
        let draw = SVG(document.documentElement).size(fMax + 100, (result.IMD.length + result.Harmonics.length) * rectHeight +
            (orderMax * (yMargin + rectHeight)));
        // Given bands
        drawBands(bandsUl, draw, rectHeight / 2);
        drawBands(bandsDl, draw, rectHeight / 2, rectHeight / 2);
        draw.line(0, rectHeight, fMax + 100, rectHeight)
            .stroke({ color: '#000', width: 1 });
        let y = drawIdcBands(bandsDistortion, draw, rectHeight + yOffsetText + yMargin, fMax);
        fs_1.writeFileSync(`${file.name}.svg`, draw.svg());
    }
    else {
    }
}
