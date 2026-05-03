export interface Resolution {
    width: number;
    height: number;
    description: string;
}

export interface ResolutionGroup {
    name: string,
    resolutions: Resolution[],
}

export const RESOLUTIONS: ResolutionGroup[] = [
    {
        name: '1:1',
        resolutions: [
            { width: 320, height: 320, description: 'Small preview' },
            { width: 640, height: 640, description: 'Medium preview' },
            { width: 960, height: 960, description: 'Large preview' },
            { width: 1920, height: 1920, description: 'High-res export' },
            { width: 4096, height: 4096, description: 'Ultra HD export' },
        ],
    }, {
        name: '3:2',
        resolutions: [
            { width: 480, height: 320, description: 'Small preview' },
            { width: 960, height: 640, description: 'Medium preview' },
            { width: 1440, height: 960, description: 'Large preview' },
            { width: 2880, height: 1920, description: 'High-res export' },
            { width: 5760, height: 3840, description: 'Ultra HD export' },
        ],
    }, {
        name: '4:3',
        resolutions: [
            { width: 320, height: 240, description: 'Small preview' },
            { width: 800, height: 600, description: 'Medium preview' },
            { width: 1024, height: 768, description: 'Large preview' },
            { width: 1920, height: 1440, description: 'High-res export' },
            { width: 4096, height: 3072, description: 'Ultra HD export' },
        ],
    }, {
        name: '16:9',
        resolutions: [
            { width: 640, height: 360, description: 'Small preview' },
            { width: 854, height: 480, description: 'Medium preview' },
            { width: 1280, height: 720, description: 'Large preview' },
            { width: 1920, height: 1080, description: 'Full HD standard' },
            { width: 2560, height: 1440, description: 'QHD desktop' },
            { width: 3840, height: 2160, description: '4K export' },
            { width: 7680, height: 4320, description: '8K export' },
        ],
    }, {
        name: '16:10',
        resolutions: [
            { width: 640, height: 400, description: 'Small preview' },
            { width: 1024, height: 640, description: 'Medium preview' },
            { width: 1280, height: 800, description: 'Large preview' },
            { width: 1920, height: 1200, description: 'High-res export' },
            { width: 2560, height: 1600, description: 'WQXGA desktop' },
            { width: 3840, height: 2400, description: '4K export' },
        ],
    }, {
        name: '43:18',
        resolutions: [
            { width: 688, height: 288, description: 'Small preview' },
            { width: 1000, height: 420, description: 'Medium preview' },
            { width: 2560, height: 1080, description: 'Ultrawide desktop' },
            { width: 3440, height: 1440, description: 'UWQHD desktop' },
            { width: 3840, height: 1620, description: 'High-res ultrawide' },
            { width: 5120, height: 2160, description: '5K ultrawide export' },
        ],
    }
];

export const FALLBACK_RESOLUTION = RESOLUTIONS[3].resolutions[0];

export function resolutionAsArray(resolution: Resolution): [number, number] {
    return [resolution.width, resolution.height];
}

export function resolutionAsString(resolution: Resolution): string {
    return `${resolution.width}x${resolution.height}`;
}
