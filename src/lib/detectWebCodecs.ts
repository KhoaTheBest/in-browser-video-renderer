export type WebCodecsSupport = { supported: boolean; details: string };

const CANDIDATES = [
  { codec: 'avc1.640028', label: 'H.264' },
  { codec: 'vp09.00.10.08', label: 'VP9' },
  { codec: 'vp8', label: 'VP8' },
];

export async function detectWebCodecsSupport(): Promise<WebCodecsSupport> {
  if (typeof VideoEncoder === 'undefined') {
    return { supported: false, details: 'This browser has no WebCodecs video encoder.' };
  }
  for (const { codec, label } of CANDIDATES) {
    try {
      const r = await VideoEncoder.isConfigSupported({ codec, width: 1280, height: 720, bitrate: 2_000_000, framerate: 30 });
      if (r.supported) return { supported: true, details: `${label} encoding available` };
    } catch {
      /* try next */
    }
  }
  return { supported: false, details: 'No supported video encoder (H.264, VP9 or VP8) was found.' };
}
