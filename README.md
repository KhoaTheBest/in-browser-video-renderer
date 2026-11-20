# Render in Browser

Compose scenes, preview instantly and export MP4 on your own device. Rendering uses canvas and WebCodecs, so there is no render server and no upload. Live site: https://video-renderer.khoalt.dev

## How it works

```
visual JSON -> canvas scene renderer -> WebCodecs encoder -> mediabunny MP4 mux (+ mixed audio) -> download
```

- **Scene model:** `fps`, `durationInFrames`, `dimensions`, `scenes[]` with `video | image | shape | text` layers, plus global and multi-track audio (`src/types/visual.ts`).
- **Preview:** `usePreviewPlayer` draws frames to a canvas and plays the mixed audio with Web Audio.
- **Export:** `exportVideo` draws each frame, encodes it with the best available codec (H.264, else VP9/VP8) and the best audio codec (AAC, else Opus), and muxes MP4 with [mediabunny](https://mediabunny.dev) (MPL-2.0).
- **Plans:** Free (720p-class, 15 s, 3 exports/day, watermark) and Pro (1080p, 3 min, unlimited, no watermark). Limits are enforced in the client; a Pro license key is validated by `functions/api/license.ts` against Lemon Squeezy.

## Develop

```bash
. ~/.nvm/nvm.sh        # if Node is under nvm
yarn install
cp .env.example .env   # optional; checkout links, support email, analytics token
yarn dev
yarn typecheck && yarn test && yarn build
```

To try the license function locally, run the built site with Wrangler (`wrangler pages dev dist`) and put `LS_STORE_ID` / `LS_PRODUCT_ID` in `.dev.vars` (git-ignored).

## Configuration

See `.env.example`. Frontend variables are `VITE_*` (public). `LS_STORE_ID` and `LS_PRODUCT_ID` are Pages Function variables.

## Deploy (Cloudflare Pages)

Build command `yarn build`, output `dist`. `public/_redirects` provides the SPA fallback and `public/_headers` sets security headers. Set the variables above in Pages settings.

## Testing

`yarn test` covers the timeline, import parsing, plan limits and the license function. The export pipeline needs a real browser with WebCodecs and has been type-checked and built but not yet exercised end to end in CI; run a manual export of both templates in Chrome before releasing.

## Browser support

Desktop Chrome, Edge and Safari with WebCodecs. Firefox depends on its encoder support. The Studio shows a warning when exporting is not possible.

## Licences

Application code: see repository owner. Key dependencies: React (MIT), Astryx (MIT), mediabunny (MPL-2.0), Vite (MIT). Review `yarn licenses list` before releases.
