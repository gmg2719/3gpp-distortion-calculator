# 3GPP Distortion Calculator

- Calculates harmonic and intermodulated bands from given uplink bands
- Figures out whether each of them distorts a signal on given downlink bands
- Draws problematic bands in an SVG format.


## Installation

```sh
npm i third-gen-distortion-calculator
```

## Usage

```sh
node calculator <band_configuration_file>
# node calculator example.bands
# it will generates example.svg
```

### Configuration File for Bands

`example.bands`

```txt
[UL]
B1U=1920 1980
B2U=1850 1910
[DL]
B1D=2110 2170
B2D=1930 1990
```
