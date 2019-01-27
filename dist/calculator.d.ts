import { IdcType, Band, BandIdc, Rats } from './types';
export { IdcType, Band, BandIdc, Rats };
export declare function calculateHarmonics(bandsUl: Array<Band>, bandsDl: Array<Band>, order?: number): Array<BandIdc>;
export declare function calculateIMD(bandsUl1: Array<Band>, bandsUl2: Array<Band>, bandsDl: Array<Band>, order?: number): Array<BandIdc>;
export declare function parseBands(configParse: any, sectionName: string): Array<Band>;
