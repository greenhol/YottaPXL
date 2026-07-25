export interface RGB {
    r: number; // 0-255
    g: number; // 0-255
    b: number; // 0-255
}

export interface LinearRGB {
    r: number; // 0-1
    g: number; // 0-1
    b: number; // 0-1
}

export interface HSL {
    h: number; // 0-360
    s: number; // 0-1
    l: number; // 0-1
}

export interface XYZ {
    X: number; // 0-1
    Y: number; // 0-1
    Z: number; // 0-1
}

export interface OkLab {
    L: number; // 0-1
    a: number; // -0.5 to 0.5
    b: number; // -0.5 to 0.5
}

export interface OkLch {
    L: number; // 0-1
    c: number; // 0-0.5
    h: number; // 0-360
}

export namespace Colour {
    // Basic Colours
    export const BLACK: RGB = { r: 0, g: 0, b: 0 }; // #000000
    export const WHITE: RGB = { r: 255, g: 255, b: 255 }; // #FFFFFF
    export const RED: RGB = { r: 255, g: 0, b: 0 }; // #FF0000
    export const GREEN: RGB = { r: 0, g: 255, b: 0 }; // #00FF00
    export const BLUE: RGB = { r: 0, g: 0, b: 255 }; // #0000FF
    export const CYAN: RGB = { r: 0, g: 255, b: 255 }; // #00FFFF
    export const MAGENTA: RGB = { r: 255, g: 0, b: 255 }; // #FF00FF
    export const YELLOW: RGB = { r: 255, g: 255, b: 0 }; // #FFFF00

    // Famous Named Colours
    export const ORANGE: RGB = { r: 255, g: 165, b: 0 }; // #FFA500
    export const DARKBLUE: RGB = { r: 0, g: 0, b: 139 }; // #00008B
    export const LIGHTGREY: RGB = { r: 211, g: 211, b: 211 }; // #D3D3D3
    export const MINTGREEN: RGB = { r: 189, g: 252, b: 201 }; // #BDFCC9
    export const BABYBLUE: RGB = { r: 137, g: 207, b: 240 }; // #89CFF0
    export const SOFTPINK: RGB = { r: 255, g: 182, b: 193 }; // #FFB6C1
    export const STEELBLUE: RGB = { r: 70, g: 130, b: 180 }; // #4682B4
    export const DARKRED: RGB = { r: 139, g: 0, b: 0 }; // #8B0000
    export const FORESTGREEN: RGB = { r: 34, g: 139, b: 34 }; // #228B22
    export const ROYALBLUE: RGB = { r: 65, g: 105, b: 225 }; // #4169E1
    export const GOLD: RGB = { r: 255, g: 215, b: 0 }; // #FFD700
    export const INDIGO: RGB = { r: 75, g: 0, b: 130 }; // #4B0082
    export const CORNFLOWERBLUE: RGB = { r: 100, g: 149, b: 237 }; // #6495ED
    export const CHOCOLATE: RGB = { r: 210, g: 105, b: 30 }; // #D2691E
    export const ORCHID: RGB = { r: 218, g: 112, b: 214 }; // #DA70D6
    export const TOMATO: RGB = { r: 255, g: 99, b: 71 }; // #FF6347
    export const SLATEGRAY: RGB = { r: 112, g: 128, b: 144 }; // #708090
    export const DARKORANGE: RGB = { r: 255, g: 140, b: 0 }; // #FF8C00
    export const MEDIUMPURPLE: RGB = { r: 147, g: 112, b: 219 }; // #9370DB
    export const LIMEGREEN: RGB = { r: 50, g: 205, b: 50 }; // #32CD32
    export const FIREBRICK: RGB = { r: 178, g: 34, b: 34 }; // #B22222
    export const DODGERBLUE: RGB = { r: 30, g: 144, b: 255 }; // #1E90FF
    export const DARKSLATEGRAY: RGB = { r: 47, g: 79, b: 79 }; // #2F4F4F
    export const SIENNA: RGB = { r: 160, g: 82, b: 45 }; // #A0522D
    export const DARKTURQUOISE: RGB = { r: 0, g: 206, b: 209 }; // #00CED1
    export const DEEPSKYBLUE: RGB = { r: 0, g: 191, b: 255 }; // #00BFFF
    export const DIMGRAY: RGB = { r: 105, g: 105, b: 105 }; // #696969
    export const TEAL: RGB = { r: 0, g: 128, b: 128 }; // #008080
    export const NAVY: RGB = { r: 0, g: 0, b: 128 }; // #000080
    export const OLIVE: RGB = { r: 128, g: 128, b: 0 }; // #808000
    export const MAROON: RGB = { r: 128, g: 0, b: 0 }; // #800000
    export const PURPLE: RGB = { r: 128, g: 0, b: 128 }; // #800080
    export const SILVER: RGB = { r: 192, g: 192, b: 192 }; // #C0C0C0
    export const GRAY: RGB = { r: 128, g: 128, b: 128 }; // #808080
    export const AQUA: RGB = { r: 0, g: 255, b: 255 }; // #00FFFF
    export const FUCHSIA: RGB = { r: 255, g: 0, b: 255 }; // #FF00FF
    export const LAVENDER: RGB = { r: 230, g: 230, b: 250 }; // #E6E6FA
    export const TURQUOISE: RGB = { r: 64, g: 224, b: 208 }; // #40E0D0
    export const CRIMSON: RGB = { r: 220, g: 20, b: 60 }; // #DC143C
    export const DARKGREEN: RGB = { r: 0, g: 100, b: 0 }; // #006400
    export const DARKVIOLET: RGB = { r: 148, g: 0, b: 211 }; // #9400D3
    export const DEEPPINK: RGB = { r: 255, g: 20, b: 147 }; // #FF1493
    export const LIGHTSEAGREEN: RGB = { r: 32, g: 178, b: 170 }; // #20B2AA
    export const PERU: RGB = { r: 205, g: 133, b: 63 }; // #CD853F
    export const ROSYBROWN: RGB = { r: 188, g: 143, b: 143 }; // #BC8F8F
    export const SADDLEBROWN: RGB = { r: 139, g: 69, b: 19 }; // #8B4513
    export const SALMON: RGB = { r: 250, g: 128, b: 114 }; // #FA8072
    export const SANDYBROWN: RGB = { r: 244, g: 164, b: 96 }; // #F4A460
    export const SEAGREEN: RGB = { r: 46, g: 139, b: 87 }; // #2E8B57
    export const SKYBLUE: RGB = { r: 135, g: 206, b: 235 }; // #87CEEB
    export const SLATEBLUE: RGB = { r: 106, g: 90, b: 205 }; // #6A5ACD
    export const SPRINGGREEN: RGB = { r: 0, g: 255, b: 127 }; // #00FF7F
    export const TAN: RGB = { r: 210, g: 180, b: 140 }; // #D2B48C
    export const THISTLE: RGB = { r: 216, g: 191, b: 216 }; // #D8BFD8
    export const VIOLET: RGB = { r: 238, g: 130, b: 238 }; // #EE82EE

    // Coffee
    export const WARM_MILK: RGB = { r: 242, g: 235, b: 220 };  // #F2EBDC
    export const MILKY_COFFEE: RGB = { r: 210, g: 170, b: 120 };  // #D2AA78
    export const COFFEE_BROWN: RGB = { r: 130, g: 74, b: 37 };  // #824A25
    export const DARK_ESPRESSO: RGB = { r: 65, g: 35, b: 19 };  // #412313
    export const FOAM_WHITE: RGB = { r: 250, g: 245, b: 237 };  // #FAF5ED

    // C64 Colours
    export const C64_BLACK: RGB = { r: 0, g: 0, b: 0 }; // #000000
    export const C64_WHITE: RGB = { r: 255, g: 255, b: 255 }; // #FFFFFF
    export const C64_RED: RGB = { r: 129, g: 51, b: 56 }; // #813338
    export const C64_CYAN: RGB = { r: 117, g: 206, b: 200 }; // #75CEC8
    export const C64_PURPLE: RGB = { r: 142, g: 60, b: 151 }; // #8E3C97
    export const C64_GREEN: RGB = { r: 86, g: 172, b: 77 }; // #56AC4D
    export const C64_BLUE: RGB = { r: 46, g: 44, b: 155 }; // #2E2C9B
    export const C64_YELLOW: RGB = { r: 237, g: 241, b: 113 }; // #EDF171
    export const C64_ORANGE: RGB = { r: 142, g: 80, b: 41 }; // #8E5029
    export const C64_BROWN: RGB = { r: 85, g: 56, b: 0 }; // #553800
    export const C64_LIGHT_RED: RGB = { r: 196, g: 108, b: 113 }; // #C46C71
    export const C64_DARK_GREY: RGB = { r: 74, g: 74, b: 74 }; // #4A4A4A
    export const C64_GREY: RGB = { r: 123, g: 123, b: 123 }; // #7B7B7B
    export const C64_LIGHT_GREEN: RGB = { r: 169, g: 255, b: 159 }; // #A9FF9F
    export const C64_LIGHT_BLUE: RGB = { r: 112, g: 109, b: 235 }; // #706DEB
    export const C64_LIGHT_GREY: RGB = { r: 178, g: 178, b: 178 }; // #B2B2B2

    export function stringToRgb(colour: string): RGB {
        const hex6 = colour.trim().replace(/^#/, '');

        if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex6)) {
            console.error('#stringToRgb - Invalid hex colour string. Expected format: #rgb or #rrggbb, returning DARKRED.');
            return Colour.DARKRED;
        }

        const hex = hex6.length === 3 ?
            hex6.split('').map(c => c + c).join('') :
            hex6;

        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16),
        };
    }

    export function rgbToString(colour: RGB): string {
        const { r, g, b } = colour;
        if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
            console.error('#rgbToString - Invalid RGB values. Each component must be between 0 and 255, returning DARKRED.');
            return '#8B0000';
        }
        return `#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(Math.round(b))}`;
    }

    /** Create a grey colour by given intensity value between 0 and 1 */
    export function createGreyByIntensity(intensity: number): RGB {
        const value = Math.round(intensity * 255);
        return { r: value, g: value, b: value };
    }

    function toHex(c: number): string {
        return c.toString(16).padStart(2, '0').toLowerCase();
    }
};
