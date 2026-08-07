export interface BokehConfig {
    /** Blur radius in pixels at maximum |z|. Also acts as a hard clamp. */
    maxBlurRadius: number;

    /** Pixels of blur radius per unit of |z|. Determines how quickly things go out of focus. */
    pixelsPerZUnit: number;

    /** z value that is considered "in focus". Defaults to 0 conceptually, but explicit here for flexibility. */
    focusZ: number;
}
