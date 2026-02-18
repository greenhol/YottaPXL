import { GridWithMargin } from '../../grid/grid-with-margin';
import { VectorField } from './vector-field';

export class FluidFlowField extends VectorField {

    constructor(grid: GridWithMargin) {
        super(grid);
        this.precomputeVectors();
    }

    override computeVector(x: number, y: number): [number, number, number] {
        let vX: number = 0;
        let vY: number = 0;
        let magnitude: number = 0;

        const centerObstacleX1 = 7;
        const centerObstacleY1 = 1;
        const radiusObstacle1 = .5;

        // const centerObstacleX2 = 1.25;
        // const centerObstacleY2 = 0;
        // const radiusObstacle2 = 1;


        if (!this.isInsideObstacle(x, y, centerObstacleX1, centerObstacleY1, radiusObstacle1) //&&
            // !this.isInsideObstacle(x, y, centerObstacleX2, centerObstacleY2, radiusObstacle2)
        ) {
            const shear = this.horizontalShearField(x, y, 2);
            vX += shear[0];
            vY += shear[1];

            // const vortex = this.vortexField(x, y, 7.5, 2, 2);
            // vX += vortex[0];
            // vY += vortex[1];

            let sink = this.sinkField(x, y, 7, -1, 5);
            vX += sink[0];
            vY += sink[1];

            let source = this.sourceField(x, y, 3, -1.5, 3);
            vX += source[0];
            vY += source[1];
            source = this.sourceField(x, y, 4, 1.75, 2);
            vX += source[0];
            vY += source[1];

            const turbulence = this.turbulence(x, y, .1);
            vX += turbulence[0];
            vY += turbulence[1];

            // const noise = this.noisePerturbation(x, y, 1);
            // vX += noise[0];
            // vY += noise[1];

            magnitude = vX * vX + vY * vY;
            let perturbation = this.obstaclePerturbation(x, y, centerObstacleX1, centerObstacleY1, radiusObstacle1, magnitude);
            vX += perturbation[0];
            vY += perturbation[1];
            // magnitude = Math.sqrt(vX * vX + vY * vY);
            // perturbation = this.obstaclePerturbation(x, y, centerObstacleX2, centerObstacleY2, radiusObstacle2, magnitude);
            // vX += perturbation[0];
            // vY += perturbation[1];

            magnitude = Math.sqrt(vX * vX + vY * vY);
            return [
                vX / magnitude,
                vY / magnitude,
                magnitude,
            ];
        } else {
            return [0, 0, 0];
        }
    }

    private horizontalShearField(x: number, y: number, k: number): [number, number] {
        return [k, 0];
    }

    private verticalShearField(x: number, y: number, k: number): [number, number] {
        return [0, k];
    }

    private vortexField(x: number, y: number, x0: number, y0: number, k: number): [number, number] {
        const dx = x - x0;
        const dy = y - y0;
        return [-k * dy, k * dx];
    }

    private sourceField(x: number, y: number, x0: number, y0: number, k: number): [number, number] {
        const dx = x - x0;
        const dy = y - y0;
        const r = Math.sqrt(dx * dx + dy * dy);
        const falloff = r > 0 ? k / (r * r) : 0;
        return [falloff * dx, falloff * dy];
    }

    private sinkField(x: number, y: number, x0: number, y0: number, k: number): [number, number] {
        const dx = x - x0;
        const dy = y - y0;
        const r = Math.sqrt(dx * dx + dy * dy);
        const falloff = r > 0 ? -k / (r * r) : 0;
        return [falloff * dx, falloff * dy];
    }

    private turbulence(x: number, y: number, strength: number): [number, number] {
        return [
            Math.sin(5 * (x + y)) * strength,
            Math.cos(5 * (x + y)) * strength,
        ]
    }

    private noisePerturbation(x: number, y: number, strength: number): [number, number] {
        // Use a pseudo-random function or Perlin noise library for smoother results
        const noiseX = (Math.random() - 0.5) * strength; // Replace with Perlin noise for coherence
        const noiseY = (Math.random() - 0.5) * strength;
        return [noiseX, noiseY];
    }

    private isInsideObstacle(x: number, y: number, xc: number, yc: number, r: number): boolean {
        return Math.sqrt((x - xc) ** 2 + (y - yc) ** 2) < r;
    }

    private obstaclePerturbation(x: number, y: number, xc: number, yc: number, r: number, strength: number): [number, number] {
        const xDiff = x - xc;
        const yDiff = y - yc;
        const rSquared = r * r;
        const distanceSquared = xDiff * xDiff + yDiff * yDiff;

        if (distanceSquared > rSquared) {
            return [
                strength * (1 + rSquared * (yDiff * yDiff - xDiff * xDiff) / (distanceSquared * distanceSquared)),
                -strength * (2 * rSquared * xDiff * yDiff / (distanceSquared * distanceSquared)),
            ];
        }
        return [0, 0];
    }
}