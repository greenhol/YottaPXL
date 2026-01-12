export interface Resolution {
    width: number;
    height: number;
    description: string;
}

export function resolutionWithBuffer(resolution: Resolution, buffer: number): Resolution {
    return {
        width: resolution.width + 2 * buffer,
        height: resolution.height + 2 * buffer,
        description: `${resolution.description} + buffer:${buffer}`,
    }
}

export const RESOLUTIONS: Resolution[] = [
    { width: 320, height: 320, description: '1:1 - Small preview' },
    { width: 640, height: 640, description: '1:1 - Medium preview' },
    { width: 960, height: 960, description: '1:1 - Large preview' },
    { width: 1920, height: 1920, description: '1:1 - High-res export' },
    { width: 4096, height: 4096, description: '1:1 - Ultra HD export' },
    { width: 480, height: 320, description: '3:2 - Small preview' },
    { width: 960, height: 640, description: '3:2 - Medium preview' },
    { width: 1440, height: 960, description: '3:2 - Large preview' },
    { width: 2880, height: 1920, description: '3:2 - High-res export' },
    { width: 5760, height: 3840, description: '3:2 - Ultra HD export' },
    { width: 320, height: 240, description: '4:3 - Small preview' },
    { width: 800, height: 600, description: '4:3 - Medium preview' },
    { width: 1024, height: 768, description: '4:3 - Large preview' },
    { width: 1920, height: 1440, description: '4:3 - High-res export' },
    { width: 4096, height: 3072, description: '4:3 - Ultra HD export' },
    { width: 640, height: 360, description: '16:9 - Small preview' },
    { width: 854, height: 480, description: '16:9 - Medium preview' },
    { width: 1280, height: 720, description: '16:9 - Large preview' },
    { width: 1920, height: 1080, description: '16:9 - Full HD standard' },
    { width: 3840, height: 2160, description: '16:9 - 4K export' },
    { width: 7680, height: 4320, description: '16:9 - 8K export' },
    { width: 640, height: 400, description: '16:10 - Small preview' },
    { width: 1024, height: 640, description: '16:10 - Medium preview' },
    { width: 1280, height: 800, description: '16:10 - Large preview' },
    { width: 1920, height: 1200, description: '16:10 - High-res export' },
    { width: 3840, height: 2400, description: '16:10 - 4K export' },
    { width: 688, height: 288, description: '43:18 - Small preview' },
    { width: 1000, height: 420, description: '43:18 - Medium preview' },
    { width: 2560, height: 1080, description: '43:18 - Ultrawide desktop' },
    { width: 3840, height: 1620, description: '43:18 - High-res ultrawide' },
    { width: 5120, height: 2160, description: '43:18 - 5K ultrawide export' },
];

export function resolutionAsArray(resolution: Resolution): [number, number] {
    return [resolution.width, resolution.height];
}

export function resolutionAsString(resolution: Resolution): string {
    return `${resolution.width}x${resolution.height}`;
}
