import { HSL, LinearRGB, OKLab, OKLCH, RGB, XYZ } from '../../types';

interface ColorConverterApi {
    // Brightness
    getBrightness(color: RGB): number;

    // sRGB <-> HSL
    rgbToHsl(rgb: RGB): HSL;
    hslToRgb(hsl: HSL): RGB;

    // sRGB <-> OKLab
    rgbToOklab(rgb: RGB): OKLab;
    oklabToRgb(oklab: OKLab): RGB;

    // sRGB <-> OKLCH
    rgbToOklch(rgb: RGB): OKLCH;
    oklchToRgb(oklch: OKLCH): RGB;
}

export class ColorConverter implements ColorConverterApi {
    // D65 reference white (normalized so Y = 1)
    private readonly d65: XYZ = { X: 0.95047, Y: 1.0, Z: 1.08883 };

    // Linear sRGB -> XYZ (D65)
    private readonly mRgbToXyz: number[][] = [
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041],
    ];

    // XYZ (D65) -> Linear sRGB
    private readonly mXyzToRgb: number[][] = [
        [3.2404542, -1.5371385, -0.4985314],
        [-0.9692660, 1.8760108, 0.0415560],
        [0.0556434, -0.2040259, 1.0572252],
    ];

    // XYZ (D65) -> LMS (OKLab, Björn Ottosson)
    private readonly mXyzToLms: number[][] = [
        [0.8189330101, 0.3618667424, -0.1288597137],
        [0.0329845436, 0.9293118715, 0.0361456387],
        [0.0482003018, 0.2643662691, 0.6338517070],
    ];

    // LMS -> XYZ (inverse of mXyzToLms)
    private readonly mLmsToXyz: number[][] = [
        [1.2270138511, -0.5577999807, 0.2812561490],
        [-0.0405801784, 1.1122568696, -0.0716766787],
        [-0.0763812845, -0.4214819784, 1.5861632204],
    ];

    // LMS' (nonlinear) -> OKLab
    private readonly mLmsToOklab: number[][] = [
        [0.2104542553, 0.7936177850, -0.0040720468],
        [1.9779984951, -2.4285922050, 0.4505937099],
        [0.0259040371, 0.7827717662, -0.8086757660],
    ];

    // OKLab -> LMS' (inverse of mLmsToOklab)
    private readonly mOklabToLms: number[][] = [
        [1.0, 0.3963377774, 0.2158037573],
        [1.0, -0.1055613458, -0.0638541728],
        [1.0, -0.0894841775, -1.2914855480],
    ];

    public getBrightness(color: RGB): number {
        return (color.r + color.g + color.b) / 765;
    }

    // --- RGB <-> HSL --------------------------------------------------------
    public rgbToHsl(rgb: RGB): HSL {
        const r = this.clamp(rgb.r, 0, 255) / 255;
        const g = this.clamp(rgb.g, 0, 255) / 255;
        const b = this.clamp(rgb.b, 0, 255) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        let h = 0, s = 0;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
                case g: h = ((b - r) / d + 2); break;
                case b: h = ((r - g) / d + 4); break;
            }
            h *= 60;
        }
        return { h, s, l };
    }

    public hslToRgb(hsl: HSL): RGB {
        let h = hsl.h % 360; if (h < 0) h += 360;
        const s = this.clamp(hsl.s, 0, 1);
        const l = this.clamp(hsl.l, 0, 1);

        if (s === 0) {
            const v = Math.round(l * 255);
            return { r: v, g: v, b: v };
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hk = h / 360;
        const hue2rgb = (t: number): number => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        return this.clampRgb({
            r: hue2rgb(hk + 1 / 3) * 255,
            g: hue2rgb(hk) * 255,
            b: hue2rgb(hk - 1 / 3) * 255,
        });
    }

    // --- RGB <-> OKLab ------------------------------------------------------
    public rgbToOklab(rgb: RGB): OKLab {
        const lin = this.rgbToLinearRgb(rgb);
        const xyz = this.linearRgbToXyz(lin);
        const lab = this.xyzToOklab(xyz);
        return {
            L: this.clamp(lab.L, 0, 1),
            a: this.clamp(lab.a, -0.5, 0.5),
            b: this.clamp(lab.b, -0.5, 0.5),
        };
    }

    public oklabToRgb(oklab: OKLab): RGB {
        const clamped: OKLab = {
            L: this.clamp(oklab.L, 0, 1),
            a: this.clamp(oklab.a, -0.5, 0.5),
            b: this.clamp(oklab.b, -0.5, 0.5),
        };
        const xyz = this.oklabToXyz(clamped);
        const lin = this.xyzToLinearRgb(xyz);
        return this.linearRgbToRgb(lin);
    }

    // --- RGB <-> OKLCH ------------------------------------------------------
    public rgbToOklch(rgb: RGB): OKLCH {
        const lab = this.rgbToOklab(rgb);
        const lch = this.oklabToOklch(lab);
        return {
            L: this.clamp(lch.L, 0, 1),
            c: this.clamp(lch.c, 0, 0.5),
            h: ((lch.h % 360) + 360) % 360,
        };
    }

    public oklchToRgb(oklch: OKLCH): RGB {
        const clamped: OKLCH = {
            L: this.clamp(oklch.L, 0, 1),
            c: this.clamp(oklch.c, 0, 0.5),
            h: ((oklch.h % 360) + 360) % 360,
        };
        return this.oklabToRgb(this.oklchToOklab(clamped));
    }

    // --- sRGB <-> Linear RGB -----------------------------------------------
    private rgbToLinearRgb(rgb: RGB): LinearRGB {
        const toLinear = (c: number): number => {
            const n = this.clamp(c, 0, 255) / 255;
            return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
        };
        return { r: toLinear(rgb.r), g: toLinear(rgb.g), b: toLinear(rgb.b) };
    }

    private linearRgbToRgb(lin: LinearRGB): RGB {
        const toSrgb = (c: number): number => {
            const n = this.clamp(c, 0, 1);
            const s = n <= 0.0031308 ? 12.92 * n : 1.055 * Math.pow(n, 1 / 2.4) - 0.055;
            return s * 255;
        };
        return this.clampRgb({ r: toSrgb(lin.r), g: toSrgb(lin.g), b: toSrgb(lin.b) });
    }

    // --- Linear RGB <-> XYZ -------------------------------------------------
    private linearRgbToXyz(lin: LinearRGB): XYZ {
        const [X, Y, Z] = this.mul3(this.mRgbToXyz, [lin.r, lin.g, lin.b]);
        return { X, Y, Z };
    }

    private xyzToLinearRgb(xyz: XYZ): LinearRGB {
        const [r, g, b] = this.mul3(this.mXyzToRgb, [xyz.X, xyz.Y, xyz.Z]);
        return { r, g, b };
    }

    // --- XYZ <-> OKLab ------------------------------------------------------
    private xyzToOklab(xyz: XYZ): OKLab {
        const [l, m, s] = this.mul3(this.mXyzToLms, [xyz.X, xyz.Y, xyz.Z]);
        const l_ = Math.cbrt(l);
        const m_ = Math.cbrt(m);
        const s_ = Math.cbrt(s);
        const [L, a, b] = this.mul3(this.mLmsToOklab, [l_, m_, s_]);
        return { L, a, b };
    }

    private oklabToXyz(oklab: OKLab): XYZ {
        const [l_, m_, s_] = this.mul3(this.mOklabToLms, [oklab.L, oklab.a, oklab.b]);
        const l = l_ * l_ * l_;
        const m = m_ * m_ * m_;
        const s = s_ * s_ * s_;
        const [X, Y, Z] = this.mul3(this.mLmsToXyz, [l, m, s]);
        return { X, Y, Z };
    }

    // --- OKLab <-> OKLCH ----------------------------------------------------
    private oklabToOklch(oklab: OKLab): OKLCH {
        const c = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b);
        let h = Math.atan2(oklab.b, oklab.a) * 180 / Math.PI;
        if (h < 0) h += 360;
        return { L: oklab.L, c, h };
    }

    private oklchToOklab(oklch: OKLCH): OKLab {
        const hRad = oklch.h * Math.PI / 180;
        return {
            L: oklch.L,
            a: oklch.c * Math.cos(hRad),
            b: oklch.c * Math.sin(hRad),
        };
    }

    private mul3(m: number[][], v: [number, number, number]): [number, number, number] {
        return [
            m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
            m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
            m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
        ];
    }

    private clamp(v: number, lo: number, hi: number): number {
        return v < lo ? lo : v > hi ? hi : v;
    }

    private clampRgb(rgb: RGB): RGB {
        return {
            r: Math.round(this.clamp(rgb.r, 0, 255)),
            g: Math.round(this.clamp(rgb.g, 0, 255)),
            b: Math.round(this.clamp(rgb.b, 0, 255)),
        };
    }
}

export const converter = new ColorConverter();
