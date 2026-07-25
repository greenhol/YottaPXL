import { Colour, RGB } from '../../shared/colour/colour';

export const Colours = {
    // Common Gradients
    BW: [Colour.BLACK, Colour.WHITE] as RGB[],
    WB: [Colour.WHITE, Colour.BLACK] as RGB[],
    RGB: [Colour.RED, Colour.GREEN, Colour.BLUE] as RGB[],
    HOT_METAL: [Colour.BLACK, Colour.DARKRED, Colour.RED, Colour.ORANGE, Colour.YELLOW, Colour.WHITE] as RGB[],
    RAINBOW: [Colour.PURPLE, Colour.BLUE, Colour.CYAN, Colour.GREEN, Colour.YELLOW, Colour.RED] as RGB[],
    OCEAN: [Colour.NAVY, Colour.TEAL, Colour.CORNFLOWERBLUE, Colour.LIGHTSEAGREEN, Colour.AQUA] as RGB[],
    FIRE: [Colour.BLACK, Colour.DARKRED, Colour.ORANGE, Colour.YELLOW, Colour.WHITE] as RGB[],
    PURPLE_HAZE: [Colour.INDIGO, Colour.PURPLE, Colour.DEEPPINK, Colour.LAVENDER, Colour.WHITE] as RGB[],
    GREYSCALE: [Colour.BLACK, Colour.DIMGRAY, Colour.GRAY, Colour.LIGHTGREY, Colour.WHITE] as RGB[],
    SUNSET: [Colour.DARKBLUE, Colour.ORANGE, Colour.SALMON, Colour.GOLD, Colour.YELLOW] as RGB[],
    ELECTRIC: [Colour.INDIGO, Colour.DODGERBLUE, Colour.CYAN, Colour.LIMEGREEN] as RGB[],
    PASTEL: [Colour.LAVENDER, Colour.MINTGREEN, Colour.SKYBLUE, Colour.THISTLE] as RGB[],
    CAPPUCCINO: [Colour.WARM_MILK, Colour.MILKY_COFFEE, Colour.COFFEE_BROWN, Colour.DARK_ESPRESSO, Colour.FOAM_WHITE] as RGB[],

    // C64 inspired
    C64_RAINBOW: [Colour.C64_BLUE, Colour.C64_PURPLE, Colour.C64_RED, Colour.C64_YELLOW, Colour.C64_GREEN] as RGB[],
    C64_MANDELBROT: [Colour.C64_BLACK, Colour.C64_BLUE, Colour.C64_LIGHT_BLUE, Colour.C64_PURPLE, Colour.C64_RED, Colour.C64_LIGHT_RED, Colour.C64_ORANGE, Colour.YELLOW, Colour.C64_WHITE] as RGB[],
    C64_ALL_COLOURS: [Colour.C64_BLACK, Colour.C64_RED, Colour.C64_CYAN, Colour.C64_PURPLE, Colour.C64_GREEN, Colour.C64_BLUE, Colour.C64_YELLOW, Colour.C64_ORANGE, Colour.C64_BROWN, Colour.C64_LIGHT_RED, Colour.C64_DARK_GREY, Colour.C64_GREY, Colour.C64_LIGHT_GREEN, Colour.C64_LIGHT_BLUE, Colour.C64_LIGHT_GREY, Colour.C64_WHITE] as RGB[],
};
