/**
 * A pseudo-random number generator based on the xoshiro128** algorithm.
 *
 * When instantiated with a seed, produces a fully deterministic and reproducible
 * sequence of random numbers. When instantiated without a seed, falls back to
 * Math.random() internally.
 */
export class XoRng {
    private _a: number = 0;
    private _b: number = 0;
    private _c: number = 0;
    private _d: number = 0;
    private readonly _seed: number | null;

    public next: () => number;
    public nextInt: () => number;

    constructor(seed: number | null) {
        this._seed = seed;
        if (seed !== null) {
            if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) {
                throw new Error(`XoRng: seed must be an integer between 0 and 2147483647, got ${seed}`);
            }
            this._a = this.splitmix32(seed);
            this._b = this.splitmix32(seed + 1);
            this._c = this.splitmix32(seed + 2);
            this._d = this.splitmix32(seed + 3);

            this.nextInt = () => {
                const b5 = this._b * 5 | 0;
                const rotated = (b5 << 7 | b5 >>> 25) >>> 0;
                const result = Math.imul(rotated, 9);
                const t = this._b << 9;
                this._c ^= this._a;
                this._d ^= this._b;
                this._b ^= this._c;
                this._a ^= this._d;
                this._c ^= t;
                this._d = this._d << 11 | this._d >>> 21;
                return result >>> 0;
            };
            this.next = () => this.nextInt() / 4294967296;
        } else {
            this.nextInt = () => Math.random() * 4294967296 >>> 0;
            this.next = () => Math.random();
        }
    }

    public nextInRange(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    public coordNoise(x: number, y: number): number {
        if (this._seed === null) {
            return Math.random();
        }
        let h = this.splitmix32(this._seed ^ x);
        h = this.splitmix32(h ^ y);
        return h / 4294967296;
    }

    private splitmix32(s: number): number {
        s = s + 0x9e3779b9 | 0;
        s = Math.imul(s ^ s >>> 16, 0x85ebca6b);
        s = Math.imul(s ^ s >>> 13, 0xc2b2ae35);
        return (s ^ s >>> 16) >>> 0;
    }
}
