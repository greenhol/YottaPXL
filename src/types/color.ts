export interface Color {
    r: number;
    g: number;
    b: number;
}

export const COLOR = {
    // Basic Colors
    BLACK: { r: 0, g: 0, b: 0 } as Color, // #000000
    WHITE: { r: 255, g: 255, b: 255 } as Color, // #FFFFFF
    RED: { r: 255, g: 0, b: 0 } as Color, // #FF0000
    GREEN: { r: 0, g: 255, b: 0 } as Color, // #00FF00
    BLUE: { r: 0, g: 0, b: 255 } as Color, // #0000FF
    CYAN: { r: 0, g: 255, b: 255 } as Color, // #00FFFF
    MAGENTA: { r: 255, g: 0, b: 255 } as Color, // #FF00FF
    YELLOW: { r: 255, g: 255, b: 0 } as Color, // #FFFF00

    // Famous Named Colors
    ORANGE: { r: 255, g: 165, b: 0 } as Color, // #FFA500
    DARKBLUE: { r: 0, g: 0, b: 139 } as Color, // #00008B
    LIGHTGREY: { r: 211, g: 211, b: 211 } as Color, // #D3D3D3
    MINTGREEN: { r: 189, g: 252, b: 201 } as Color, // #BDFCC9
    BABYBLUE: { r: 137, g: 207, b: 240 } as Color, // #89CFF0
    SOFTPINK: { r: 255, g: 182, b: 193 } as Color, // #FFB6C1
    STEELBLUE: { r: 70, g: 130, b: 180 } as Color, // #4682B4
    DARKRED: { r: 139, g: 0, b: 0 } as Color, // #8B0000
    FORESTGREEN: { r: 34, g: 139, b: 34 } as Color, // #228B22
    ROYALBLUE: { r: 65, g: 105, b: 225 } as Color, // #4169E1
    GOLD: { r: 255, g: 215, b: 0 } as Color, // #FFD700
    INDIGO: { r: 75, g: 0, b: 130 } as Color, // #4B0082
    CORNFLOWERBLUE: { r: 100, g: 149, b: 237 } as Color, // #6495ED
    CHOCOLATE: { r: 210, g: 105, b: 30 } as Color, // #D2691E
    ORCHID: { r: 218, g: 112, b: 214 } as Color, // #DA70D6
    TOMATO: { r: 255, g: 99, b: 71 } as Color, // #FF6347
    SLATEGRAY: { r: 112, g: 128, b: 144 } as Color, // #708090
    DARKORANGE: { r: 255, g: 140, b: 0 } as Color, // #FF8C00
    MEDIUMPURPLE: { r: 147, g: 112, b: 219 } as Color, // #9370DB
    LIMEGREEN: { r: 50, g: 205, b: 50 } as Color, // #32CD32
    FIREBRICK: { r: 178, g: 34, b: 34 } as Color, // #B22222
    DODGERBLUE: { r: 30, g: 144, b: 255 } as Color, // #1E90FF
    DARKSLATEGRAY: { r: 47, g: 79, b: 79 } as Color, // #2F4F4F
    SIENNA: { r: 160, g: 82, b: 45 } as Color, // #A0522D
    DARKTURQUOISE: { r: 0, g: 206, b: 209 } as Color, // #00CED1
    DEEPSKYBLUE: { r: 0, g: 191, b: 255 } as Color, // #00BFFF
    DIMGRAY: { r: 105, g: 105, b: 105 } as Color, // #696969
    TEAL: { r: 0, g: 128, b: 128 } as Color, // #008080
    NAVY: { r: 0, g: 0, b: 128 } as Color, // #000080
    OLIVE: { r: 128, g: 128, b: 0 } as Color, // #808000
    MAROON: { r: 128, g: 0, b: 0 } as Color, // #800000
    PURPLE: { r: 128, g: 0, b: 128 } as Color, // #800080
    SILVER: { r: 192, g: 192, b: 192 } as Color, // #C0C0C0
    GRAY: { r: 128, g: 128, b: 128 } as Color, // #808080
    AQUA: { r: 0, g: 255, b: 255 } as Color, // #00FFFF
    FUCHSIA: { r: 255, g: 0, b: 255 } as Color, // #FF00FF
    LAVENDER: { r: 230, g: 230, b: 250 } as Color, // #E6E6FA
    TURQUOISE: { r: 64, g: 224, b: 208 } as Color, // #40E0D0
    CRIMSON: { r: 220, g: 20, b: 60 } as Color, // #DC143C
    DARKGREEN: { r: 0, g: 100, b: 0 } as Color, // #006400
    DARKVIOLET: { r: 148, g: 0, b: 211 } as Color, // #9400D3
    DEEPPINK: { r: 255, g: 20, b: 147 } as Color, // #FF1493
    LIGHTSEAGREEN: { r: 32, g: 178, b: 170 } as Color, // #20B2AA
    PERU: { r: 205, g: 133, b: 63 } as Color, // #CD853F
    ROSYBROWN: { r: 188, g: 143, b: 143 } as Color, // #BC8F8F
    SADDLEBROWN: { r: 139, g: 69, b: 19 } as Color, // #8B4513
    SALMON: { r: 250, g: 128, b: 114 } as Color, // #FA8072
    SANDYBROWN: { r: 244, g: 164, b: 96 } as Color, // #F4A460
    SEAGREEN: { r: 46, g: 139, b: 87 } as Color, // #2E8B57
    SKYBLUE: { r: 135, g: 206, b: 235 } as Color, // #87CEEB
    SLATEBLUE: { r: 106, g: 90, b: 205 } as Color, // #6A5ACD
    SPRINGGREEN: { r: 0, g: 255, b: 127 } as Color, // #00FF7F
    TAN: { r: 210, g: 180, b: 140 } as Color, // #D2B48C
    THISTLE: { r: 216, g: 191, b: 216 } as Color, // #D8BFD8
    VIOLET: { r: 238, g: 130, b: 238 } as Color, // #EE82EE
    
    // Coffee
    WARM_MILK: { r: 242, g: 235, b: 220 },  // #F2EBDC
    MILKY_COFFEE: { r: 210, g: 170, b: 120 },  // #D2AA78
    COFFEE_BROWN: { r: 130, g: 74, b: 37 },  // #824A25
    DARK_ESPRESSO: { r: 65, g: 35, b: 19 },  // #412313
    FOAM_WHITE: { r: 250, g: 245, b: 237 },  // #FAF5ED

    // C64 Colors
    C64_BLACK: { r: 0, g: 0, b: 0 } as Color, // #000000
    C64_WHITE: { r: 255, g: 255, b: 255 } as Color, // #FFFFFF
    C64_RED: { r: 129, g: 51, b: 56 } as Color, // #813338
    C64_CYAN: { r: 117, g: 206, b: 200 } as Color, // #75CEC8
    C64_PURPLE: { r: 142, g: 60, b: 151 } as Color, // #8E3C97
    C64_GREEN: { r: 86, g: 172, b: 77 } as Color, // #56AC4D
    C64_BLUE: { r: 46, g: 44, b: 155 } as Color, // #2E2C9B
    C64_YELLOW: { r: 237, g: 241, b: 113 } as Color, // #EDF171
    C64_ORANGE: { r: 142, g: 80, b: 41 } as Color, // #8E5029
    C64_BROWN: { r: 85, g: 56, b: 0 } as Color, // #553800
    C64_LIGHT_RED: { r: 196, g: 108, b: 113 } as Color, // #C46C71
    C64_DARK_GREY: { r: 74, g: 74, b: 74 } as Color, // #4A4A4A
    C64_GREY: { r: 123, g: 123, b: 123 } as Color, // #7B7B7B
    C64_LIGHT_GREEN: { r: 169, g: 255, b: 159 } as Color, // #A9FF9F
    C64_LIGHT_BLUE: { r: 112, g: 109, b: 235 } as Color, // #706DEB
    C64_LIGHT_GREY: { r: 178, g: 178, b: 178 } as Color, // #B2B2B2
}

export function createGrey(intensity: number): Color {
    const value = Math.round(intensity * 255);
    return { r: value, g: value, b: value };
}

export function createColor(r: number, g: number, b: number): Color {
    return { r: r, g: g, b: b };
}
