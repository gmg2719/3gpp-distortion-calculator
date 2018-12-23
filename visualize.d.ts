import { Band, BandIdc } from './types';
export declare function drawBands(bands: Array<Band>, draw: any, height?: number, offset?: number): void;
export declare function drawIdcBands(bandsIdc: Array<BandIdc>, draw: any, yStart: number, fMax: number): number;
export declare function drawAxis(draw: any, y: number, orderCurr: number, fMax: number, fLow: Array<number>, fHigh: Array<number>): void;
export declare function draw(bandsUl: any, bandsDl: any, result: any, bandsDistortion: any, fMax: any, orderMax: any, file: any): void;
