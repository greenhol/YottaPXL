import { HSL, LAB, RGB, XYZ } from '../../types';

class ColorConverter {

    private readonly refWhiteD65 = {
        x: 95.047,
        y: 100.000,
        z: 108.883,
    };


    public getBritghtness(color: RGB): number {
        return (color.r + color.g + color.b) / 765;
    }

    public rgbToHsl(rgbColor: RGB): HSL {
        const [r, g, b] = [rgbColor.r / 255, rgbColor.g / 255, rgbColor.b / 255];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let [h, s, l] = [0, 0, (max + min) / 2];

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h, s, l };
    }

    public hslToRgb(hslColor: HSL): RGB {
        const [h, s, l] = [hslColor.h, hslColor.s, hslColor.l];
        let r, g, b;

        if (hslColor.s === 0) {
            r = g = b = hslColor.l; // achromatic
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = this.hueToRgb(p, q, h + 1 / 3);
            g = this.hueToRgb(p, q, h);
            b = this.hueToRgb(p, q, h - 1 / 3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    public rgbToLab(color: RGB): LAB {
        return this.xyzToLab(this.rgbToXyz(color));
    }

    public labToRgb(color: LAB): RGB {
        return this.xyzToRgb(this.labToXyz(color));
    }

    private rgbToXyz(color: RGB): XYZ {
        let [sr, sg, sb] = [color.r / 255, color.g / 255, color.b / 255];

        // Apply gamma correction
        sr = sr > 0.04045 ? Math.pow((sr + 0.055) / 1.055, 2.4) : sr / 12.92;
        sg = sg > 0.04045 ? Math.pow((sg + 0.055) / 1.055, 2.4) : sg / 12.92;
        sb = sb > 0.04045 ? Math.pow((sb + 0.055) / 1.055, 2.4) : sb / 12.92;

        // Convert to XYZ using D65 illuminant
        const x = sr * 0.4124564 + sg * 0.3575761 + sb * 0.1804375;
        const y = sr * 0.2126729 + sg * 0.7151522 + sb * 0.0721750;
        const z = sr * 0.0193339 + sg * 0.1191920 + sb * 0.9503041;

        return { x: x * 100, y: y * 100, z: z * 100 };
    }

    private xyzToRgb(xyz: XYZ): RGB {
        // Normalize XYZ
        const [x, y, z] = [xyz.x /= 100, xyz.y /= 100, xyz.z /= 100];

        // Convert to linear RGB
        const r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
        const g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
        const b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

        return {
            r: Math.round(this.linearToGamma(r) * 255),
            g: Math.round(this.linearToGamma(g) * 255),
            b: Math.round(this.linearToGamma(b) * 255),
        };
    }

    private xyzToLab(xyz: XYZ): LAB {
        const [nx, ny, nz] = [xyz.x / this.refWhiteD65.x, xyz.y / this.refWhiteD65.y, xyz.z / this.refWhiteD65.z];

        // Apply nonlinear transform
        const fx = nx > 0.008856 ? Math.pow(nx, 1 / 3) : (7.787 * nx) + (16 / 116);
        const fy = ny > 0.008856 ? Math.pow(ny, 1 / 3) : (7.787 * ny) + (16 / 116);
        const fz = nz > 0.008856 ? Math.pow(nz, 1 / 3) : (7.787 * nz) + (16 / 116);

        // Calculate L*, a*, b*
        const L = (116 * fy) - 16;
        const a = 500 * (fx - fy);
        const b = 200 * (fy - fz);

        return { L, a, b };
    }

    private labToXyz(lab: LAB): XYZ {
        // Calculate intermediate values
        const fy = (lab.L + 16) / 116;
        const fx = fy + (lab.a / 500);
        const fz = fy - (lab.b / 200);

        // Convert to XYZ
        const x = this.refWhiteD65.x * (fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16 / 116) / 7.787);
        const y = this.refWhiteD65.y * (fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16 / 116) / 7.787);
        const z = this.refWhiteD65.z * (fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16 / 116) / 7.787);

        return { x, y, z };
    }

    private hueToRgb(p: number, q: number, t: number): number {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    private linearToGamma(channel: number): number {
        return channel <= 0.0031308 ? 12.92 * channel : (1 + 0.055) * Math.pow(channel, 1 / 2.4) - 0.055;
    }

}

export const converter = new ColorConverter();
