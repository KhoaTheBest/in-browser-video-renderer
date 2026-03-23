export type WebCodecsSupport = {
  supported: boolean;
  details: string;
};

export async function detectWebCodecsSupport(): Promise<WebCodecsSupport> {
  if (typeof window === 'undefined') {
    return { supported: false, details: 'Not in a browser environment' };
  }

  if (typeof VideoEncoder === 'undefined') {
    return {
      supported: false,
      details: 'VideoEncoder API is not available in this browser',
    };
  }

  try {
    const config: VideoEncoderConfig = {
      codec: 'vp8',
      width: 1080,
      height: 1080,
      bitrate: 2_000_000,
      framerate: 30,
    };

    const result = await VideoEncoder.isConfigSupported(config);
    if (result.supported) {
      return { supported: true, details: 'VP8 encoding supported via WebCodecs' };
    }

    return {
      supported: false,
      details: 'VP8 encoding not supported in this browser/configuration',
    };
  } catch (err) {
    return {
      supported: false,
      details: `WebCodecs check failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
