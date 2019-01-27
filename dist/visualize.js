"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const types_1 = require("./types");
let window = require('svgdom');
let SVG = require('svg.js')(window);
let rectHeight = 50;
let yMargin = 50;
let yStep = rectHeight + yMargin;
let yOffsetText = 15;
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
exports.drawBands = drawBands;
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
exports.drawIdcBands = drawIdcBands;
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
exports.drawAxis = drawAxis;
function draw(bandsUl, bandsDl, result, bandsDistortion, fMax, orderMax, file) {
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
exports.draw = draw;
