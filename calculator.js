"use strict";
exports.__esModule = true;
var fs_1 = require("fs");
var path_1 = require("path");
var ConfigParser = require('configparser');
var Comb = require('js-combinatorics');
var window = require('svgdom');
var SVG = require('svg.js')(window);
var rectHeight = 50;
var yMargin = 50;
var yStep = rectHeight + yMargin;
var yOffset = 5;
var IdcType;
(function (IdcType) {
    IdcType[IdcType["Harmonics"] = 0] = "Harmonics";
    IdcType[IdcType["IMD"] = 1] = "IMD";
})(IdcType || (IdcType = {}));
var Band = /** @class */ (function () {
    function Band(name, fLow, fHigh, idcType, idcOrder) {
        if (idcType === void 0) { idcType = null; }
        if (idcOrder === void 0) { idcOrder = null; }
        this.name = name;
        this.fLow = fLow;
        this.fHigh = fHigh;
        this.idcType = idcType;
        this.idcOrder = idcOrder;
    }
    Band.prototype.centerFrequency = function () {
        return (this.fHigh + this.fLow) / 2;
    };
    Band.prototype.bandwidth = function () {
        return this.fHigh - this.fLow;
    };
    return Band;
}());
function calculateHarmonics(bandsUl, bandsDl, order) {
    if (order === void 0) { order = 2; }
    var bandsHarmonics = [];
    for (var _i = 0, bandsUl_1 = bandsUl; _i < bandsUl_1.length; _i++) {
        var bandUl = bandsUl_1[_i];
        var centerFrequency = order * bandUl.centerFrequency();
        var bandwidth = order * bandUl.bandwidth();
        var fLow = centerFrequency - bandwidth / 2;
        var fHigh = fLow + bandwidth;
        var bandHarmonics = new Band("" + bandUl.name, fLow, fHigh, IdcType.Harmonics, order);
        for (var _a = 0, bandsDl_1 = bandsDl; _a < bandsDl_1.length; _a++) {
            var bandDl = bandsDl_1[_a];
            if (!doesOverlap(bandDl, bandHarmonics)) {
                continue;
            }
            bandsHarmonics.push(bandHarmonics);
        }
    }
    return bandsHarmonics;
}
exports.calculateHarmonics = calculateHarmonics;
function calculateIMD(bandsAll, numBands, order) {
    if (numBands === void 0) { numBands = 2; }
    if (order === void 0) { order = 2; }
    var combsBands = Comb.combination(bandsAll, numBands)
        .toArray();
    var combsCoeffs = combinatorialSum(order, numBands);
    var combsSigns = Comb.baseN([1, -1], numBands).toArray();
    var combsCoeffsWithSigns = [];
    for (var _i = 0, combsCoeffs_1 = combsCoeffs; _i < combsCoeffs_1.length; _i++) {
        var coeffs = combsCoeffs_1[_i];
        for (var _a = 0, combsSigns_1 = combsSigns; _a < combsSigns_1.length; _a++) {
            var signs = combsSigns_1[_a];
            var coeffsWithSigns = [];
            for (var i = 0; i < coeffs.length; i++) {
                coeffsWithSigns.push(coeffs[i] * signs[i]);
            }
            combsCoeffsWithSigns.push(coeffsWithSigns);
        }
    }
    var bandsImd = [];
    for (var _b = 0, combsBands_1 = combsBands; _b < combsBands_1.length; _b++) {
        var bands = combsBands_1[_b];
        for (var _c = 0, combsCoeffsWithSigns_1 = combsCoeffsWithSigns; _c < combsCoeffsWithSigns_1.length; _c++) {
            var coeffsWithSings = combsCoeffsWithSigns_1[_c];
            var bandCombName = '';
            var centerFrequency = 0;
            var bandwidth = 0;
            for (var i = 0; i < coeffsWithSings.length; i++) {
                var coeffString = "" + (coeffsWithSings[i] > 0 ? '+' : '-') + (Math.abs(coeffsWithSings[i]) == 1 ? '' : Math.abs(coeffsWithSings[i]));
                bandCombName += "" + coeffString + bands[i].name;
                centerFrequency += coeffsWithSings[i] * bands[i].centerFrequency();
                bandwidth += Math.abs(coeffsWithSings[i]) * bands[i].bandwidth();
            }
            if (bandCombName[0] == '+') {
                bandCombName = bandCombName.substring(1);
            }
            var fLow = centerFrequency - bandwidth / 2;
            var fHigh = fLow + bandwidth;
            var bandImd = new Band(bandCombName, fLow, fHigh, IdcType.IMD, order);
            for (var _d = 0, bandsAll_1 = bandsAll; _d < bandsAll_1.length; _d++) {
                var band = bandsAll_1[_d];
                if (doesOverlap(band, bandImd) &&
                    bandImd.name.indexOf(band.name) != -1) {
                    bandsImd.push(bandImd);
                    break;
                }
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
    var combs = [];
    for (var i = 1; i <= targetSum - (numPartitions - 1); i++) {
        var combsSub = combinatorialSum(targetSum - i, numPartitions - 1);
        for (var _i = 0, combsSub_1 = combsSub; _i < combsSub_1.length; _i++) {
            var comb = combsSub_1[_i];
            combs.push(Array.prototype.concat(i, comb));
        }
    }
    return combs;
}
function doesOverlap(band1, band2) {
    return band1.fLow <= band2.fHigh && band2.fLow <= band1.fHigh;
}
function parseBands(configParse, sectionName) {
    var bands = [];
    for (var bandName in configParse.items(sectionName)) {
        var frequencies = configParse.get(sectionName, bandName).split(' ');
        if (frequencies.length != 2) {
            continue;
        }
        bands.push(new Band(bandName, Number(frequencies[0]), Number(frequencies[1])));
    }
    return bands;
}
exports.parseBands = parseBands;
function getFreqMax(bands) {
    var fMax = 0;
    for (var _i = 0, bands_1 = bands; _i < bands_1.length; _i++) {
        var band = bands_1[_i];
        fMax = Math.max(fMax, band.fHigh);
    }
    return fMax;
}
function getOrderMax(bands) {
    var orderMax = 0;
    for (var _i = 0, bands_2 = bands; _i < bands_2.length; _i++) {
        var band = bands_2[_i];
        orderMax = Math.max(orderMax, band.idcOrder);
    }
    return orderMax;
}
function drawBands(bands, draw, height, offset) {
    if (height === void 0) { height = rectHeight; }
    if (offset === void 0) { offset = 0; }
    for (var _i = 0, bands_3 = bands; _i < bands_3.length; _i++) {
        var band = bands_3[_i];
        draw.rect((band.fHigh - band.fLow), height)
            .move(band.fLow, yMargin + offset)
            .stroke({ color: '#000' }).fill({ opacity: 0 });
        draw.plain(band.name).move(band.fLow, yMargin);
        draw.plain("" + band.fLow).move(band.fLow, yStep);
        draw.plain("" + band.fHigh).move(band.fHigh, yStep + 10);
    }
}
function drawIdcBands(bands, draw, yStart, color) {
    var y;
    var offset;
    var orderCurr = null;
    for (var _i = 0, bands_4 = bands; _i < bands_4.length; _i++) {
        var band = bands_4[_i];
        if (!orderCurr) {
            y = yStart;
            offset = 0;
            orderCurr = band.idcOrder;
        }
        else if (orderCurr != band.idcOrder) {
            y += yStep;
            offset = 0;
            orderCurr = band.idcOrder;
        }
        else {
            offset -= yOffset;
        }
        draw.rect((band.fHigh - band.fLow), rectHeight)
            .move(band.fLow, yStep * band.idcOrder + yMargin + offset)
            .stroke({ color: color }).fill({ opacity: 0 });
        draw.plain(band.name).move(band.fLow, yStep * band.idcOrder + yMargin + offset);
        draw.plain("" + band.fLow).move(band.fLow, yStep * band.idcOrder + yStep);
        draw.plain("" + band.fHigh).move(band.fHigh, yStep * band.idcOrder + yStep + 10);
    }
    return y;
}
if (require.main == module) {
    if (process.argv.length >= 3) {
        var file = path_1.parse(process.argv[2]);
        var config = new ConfigParser();
        config.read(process.argv[2]);
        var bandsUl = parseBands(config, 'UL');
        var bandsDl = parseBands(config, 'DL');
        console.log('===== Bands (UL) =====');
        console.log(bandsUl);
        console.log('===== Bands (DL) =====');
        console.log(bandsDl);
        var bandsHarmonics = [];
        var bandsImd = [];
        for (var order = 2; order < 9; order++) {
            bandsHarmonics = bandsHarmonics.concat(calculateHarmonics(bandsUl, bandsDl, order));
            bandsImd = bandsImd.concat(calculateIMD(bandsUl, 2, order));
        }
        var fMax = Math.max(getFreqMax(bandsUl), getFreqMax(bandsDl), getFreqMax(bandsHarmonics), getFreqMax(bandsImd));
        var orderMax = Math.max(getOrderMax(bandsHarmonics), getOrderMax(bandsImd));
        console.log('===== Harmonics =====');
        console.log(bandsHarmonics);
        console.log('===== IMD =====');
        console.log(bandsImd);
        var document_1 = window.document;
        var draw = SVG(document_1.documentElement).size(fMax + 100, 1000);
        for (var order = 2; order <= orderMax; order++) {
            var y_1 = yStep * order;
            draw.plain("Order: " + order).move(0, y_1 + yStep);
            draw.line(0, y_1 + yStep, fMax + 100, y_1 + yStep)
                .stroke({ color: '#000', width: 1 });
        }
        // Given bands
        drawBands(bandsUl, draw, 25);
        drawBands(bandsDl, draw, 25, 25);
        draw.line(0, yStep, fMax + 100, yStep)
            .stroke({ color: '#000', width: 1 });
        // Harmonics
        var y = drawIdcBands(bandsHarmonics, draw, yStep, '#00f');
        // IMD
        drawIdcBands(bandsImd, draw, y, '#f00');
        fs_1.writeFileSync(file.name + ".svg", draw.svg());
    }
    else {
    }
}
