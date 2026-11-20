# Monetization audit and plan

Repo state audited: `main` @ 1a74e5a. Date: 2026-11-20.

## 1. Current state (verified)

| Check | Result |
| --- | --- |
| `yarn install --frozen-lockfile` | OK (yarn was not installed; I used `npx yarn@1.22.22`, nothing installed globally) |
| `yarn build` (vite) | OK, 4s. Warning: JS chunks > 500 kB (main 648 kB, plus lazy mediabunny encoders from `@remotion/web-renderer`) |
| `yarn typecheck` | OK |
| Tests | **None exist.** No test runner configured |
| App run in a browser | Not done yet (no browser on the VPS). Dev server starts fine (`vite` ready). Needs a real Chromium for render checks |

Already broken or wrong, before any change:

1. **The live site cannot do anything useful.** The only data source is `fetchVisualData`, which calls `/api-proxy?url=...`. That proxy exists only as a Vite dev middleware (`vite.config.ts`). On Cloudflare Pages `/api-proxy` returns the SPA fallback, so "fetch from a work URL" fails in production. Also it needs a JWT for a private API (`/api/work-proxy/v1/visual_data`). `src/data/mock-visual.json` exists but **no component imports it**, so there is no demo path.
2. **Leftover employer references.** The editor *code* is gone (no `@btg-pencil-ai`, no `editor.worktrees`, no alias plugin in `vite.config.ts`; the standalone `Composition.tsx` is ~160 lines and `types/editor.ts` is local). Confirmed. But these remain:
   - `src/config/host-map.json` maps `*.trypencil.com` to employer API hosts. Used by the dev proxy.
   - `src/data/mock-visual.json` points at 13 assets on `cms.trypncl.com` plus `stg.trypncl.com`, and contains `pencil-editor-paragraph` class names. These are employer-hosted assets and likely not yours to ship in a commercial product.
   - `fetchVisualData.ts` is hard-wired to the employer's `/api/work-proxy/v1/visual_data` API shape.
   - `AGENTS.md` and `docs/session-handoff.md` still describe the editor alias setup, and `docs/session-handoff.md` contains a local path from a Mac.
3. **Docs are stale.** README says transcoding uses `mediabunny` (code uses FFmpeg.wasm since dd04825) and the mermaid diagram says "Mediabunny Transcoder". AGENTS.md says the same plus describes the removed Vite plugin.
4. **Repo hygiene.** `server.log`, `tsconfig.app.tsbuildinfo`, `tsconfig.node.tsbuildinfo` are tracked in git. `index.html` still has the Vite favicon and title "Remotion Client Render POC".
5. **Runtime CDN dependency.** `renderVideo.ts` loads `@ffmpeg/core` from `unpkg.com` at render time (a ~30 MB wasm). If unpkg is slow or down, MP4 export fails; there is no error handling or progress for this load. `COEP: credentialless` is set, which is why this works.
6. **Secrets handling.** The JWT is typed into the page and stored in `localStorage` in plaintext, and sent through the proxy. Fine for a POC, not for a product.
7. **No tests, no CI, no error reporting.**

## 2. Audit as a paid product

### 2.1 What it actually is
A zero-server-cost video renderer: JSON scene template → preview (Remotion Player) → WebM (WebCodecs) → MP4 (FFmpeg.wasm), all in the user's browser. The valuable property is **near-zero marginal cost per render**, so free tiers are cheap and margins on paid tiers are very high. The weak point is **input**: today only an employer's private editor can produce the JSON. A product needs its own way to create content.

### 2.2 Monetization model (recommendation)
**Freemium with a Pro tier, subscription plus a one-off lifetime option.**

- **Free:** up to 720p, up to 15 s, small corner watermark, 3 exports/day (soft limit).
- **Pro (~$9/mo or $79/yr, optional ~$149 lifetime):** 1080p, up to 3 min, no watermark, unlimited exports, batch queue (multiple blocks already exist in the UI, so batch is a natural paid feature), saved templates.
- Why not usage credits: cost per render to you is ~0, so metering by credit just adds friction. Why not sponsorship: tiny audience. Why not pure one-off: recurring revenue is better for a tool that needs ongoing browser-compat maintenance, but a lifetime deal helps early cash and fits solo users.
- Honest caveat: rendering happens on the client, so any limit is enforceable only by a server-issued entitlement that the client respects (watermark, resolution caps). A determined user can patch the JS. That is acceptable for this price point; do not over-invest in anti-tamper.

### 2.3 What is missing to charge
Ordered by dependency:

1. **A generic input path** (blocker). Without it there is no product. Options, cheapest first: (a) a JSON template gallery with ~5 built-in templates using licensed or own assets; (b) a simple form editor (text, image/video upload, colours, duration) that produces the scene JSON; (c) keep the "import from URL" connector as a hidden advanced/dev feature, and remove the employer defaults.
2. **Payments.** Recommend **Lemon Squeezy** (merchant of record: handles VAT/sales tax, which matters for a solo engineer selling globally; supports license keys and subscriptions) in test mode. Stripe is the alternative if you want lower fees and will handle tax yourself (Stripe Tax plus registration). Decision needed from you.
3. **Entitlements without full accounts.** Smallest viable: customer buys → gets a license key by email → pastes it in the app → a Cloudflare Pages Function validates it against the provider API and returns a short-lived signed token (JWT, HMAC secret in env) cached in `localStorage`. No user database, no passwords, no auth UI. Add real accounts only if you later want cloud-saved projects.
4. **Paywall/limits UI:** usage meter, upgrade prompts at the limit, watermark overlay in `Composition` when no valid token, resolution/duration caps in `renderVideo`.
5. **Pricing page**, **checkout redirect**, **success/license-activation page**, **customer portal link** (provider-hosted).
6. **Backend surface:** Cloudflare Pages Functions for `/api/license/verify` and a webhook endpoint (optional for v1 if verifying against the provider live). Env vars only; nothing committed.

### 2.4 Landing page, onboarding, empty/error states
- No landing page: `/` is the raw tool with inputs for a work URL and JWT. Needs a hero with a demo video, "renders in your browser, files never leave your device" (a real privacy selling point), feature list, pricing, FAQ.
- Onboarding: none. Add a one-click "Try with a sample" using a bundled template.
- Empty state: the first thing a visitor sees is empty inputs. Replace with sample + upload.
- Error states: errors are raw API JSON strings. Needs friendly messages for: unsupported browser (BrowserSupport exists but is a bare banner), FFmpeg load failure, out-of-memory on long renders, aborted renders, asset CORS failures.

### 2.5 Reliability, performance, accessibility, SEO, analytics
- **Reliability:** self-host the ffmpeg core (it is ~30 MB; Cloudflare Pages has a 25 MiB per-file limit, so it would need R2 or a split build, flag for later) or at least pin with integrity and add retry/fallback. Add `ErrorBoundary` reporting (Sentry free tier or console-to-endpoint). Add a render cancel button (AbortSignal is already plumbed through `renderVideo`). Browser matrix: WebCodecs VP8 needs Chromium/Safari 16.4+/Firefox 130+; test and publish support matrix. Large renders risk tab OOM.
- **Performance:** code-split the app (render path lazily imported), the ffmpeg load is the slow part; show progress for it. Consider H.264 via WebCodecs directly (`@remotion/web-renderer` can do it) and skip FFmpeg for the common case, which would cut ~30 MB of download and remove the GPL/x264 concern below. This is the single best technical upgrade and I would test it early; fallback to FFmpeg only for AAC edge cases.
- **Accessibility:** current UI is low-contrast slate on dark, no labels verified, no focus styles audit, video controls unlabelled. Astryx components should fix most of this; I will verify keyboard flow and contrast.
- **SEO:** a single-page app with title "Remotion Client Render POC", no meta description, no OG tags, no sitemap/robots. Need static landing content, OG image, `robots.txt`, `sitemap.xml`, structured data. Because COOP/COEP headers are required for the tool, landing and tool can still share a build; keep marketing pages statically prerendered.
- **Analytics:** none. Recommend Cloudflare Web Analytics or Plausible (cookieless, avoids a cookie banner). Track: render started/completed/failed, upgrade click, checkout started. No PII.

### 2.6 Legal
- **Terms of Service, Privacy Policy, refund policy:** none exist. Needed before taking money (and the MoR requires them). I can draft templates, but you should have them reviewed; I am not a lawyer.
- **Cookie notice:** if analytics is cookieless and the only storage is `localStorage` for functional state (license token, inputs), a consent banner is generally not required in the EU, but the privacy policy must disclose it. If you pick GA, a banner is needed.
- **Dependency licences (important):**
  - `remotion`, `@remotion/player`, `@remotion/gif` are **"SEE LICENSE IN LICENSE.md"**, i.e. the Remotion License, not MIT. It is free for individuals and small companies (historically up to 3 people) but **requires a paid Company License above that**, and the terms around SaaS/products that let end users render have specific clauses. `@remotion/web-renderer` shows **UNLICENSED** in `package.json`, and `@remotion/media` has no licence field. **You must read the current Remotion licence and, ideally, email Remotion before charging.** This is the biggest legal risk to the whole plan and I could not resolve it from the repo (LICENSE.md is not shipped in node_modules).
  - `@ffmpeg/ffmpeg`, `@ffmpeg/util`: MIT. But the **`@ffmpeg/core` wasm** loaded from unpkg is built with **libx264 (GPL-2.0)**; shipping or distributing it to users carries GPL obligations (source offer, notices). Plus **H.264/AAC patent licensing** (MPEG LA/Via LA) is a grey area for commercial distribution of an encoder. Switching to browser-native WebCodecs H.264 encoding (see performance) sidesteps both.
  - `jotai`, `nanoid`, `lodash`, `react`: MIT. Tailwind, Vite: MIT.
  - Add a `THIRD_PARTY_LICENSES` page (generated) and keep Astryx's licence in that list.
- **Content rights:** remove `cms.trypncl.com` assets and employer API hostnames; ship only assets you own or properly licence. Also confirm with your employer that the employer-originated template schema (scene/element JSON from their editor) is yours to use commercially. The standalone Composition is a reimplementation, but the data model came from there.

### 2.7 UI/UX review
I will run the design skills (`design-taste-frontend`, `ui-ux-pro-max`, `high-end-visual-design`) during implementation. From reading the code now:
- Single dark page, hand-rolled Tailwind, a `+ ADD NEW` button as the main action, "debug" toggles (`isMainPlayer`) exposed to users, console debug text rendered in the UI (`main-player` / `thumbnail-path` labels in `AdPlayerPreview`).
- Should become: header with brand and Pricing/Sign-in-to-license, a hero, a workspace (templates → preview → export), a usage meter, a settings drawer for advanced/debug options.
- Migrating to Astryx: `astryx` CLI is **not installed** on this machine, and `npm` is present, so the skill's instruction is `npm i -g @astryxdesign/cli` (it resolves to 0.7.16 on the registry). Because global installs touch the machine, I would rather add `@astryxdesign/core` and `@astryxdesign/cli` as project dependencies and run via `npx`, and tell you. React 18.2 compatibility is something I must verify with `astryx docs` before committing to it. Tailwind would be removed gradually rather than all at once, to keep features working.

## 3. Prioritized plan

**P0, blockers (must land before any charging):**
1. Resolve the Remotion licence question (your action: read licence/email Remotion). Also decide on H.264 path (WebCodecs native vs FFmpeg).
2. Remove employer-specific content: `host-map.json`, `cms.trypncl.com` assets, employer API references; make the URL import a generic, optional "advanced" connector or move it behind a flag. Do **not** delete it without your OK (it is an existing feature).
3. Replace the proxy dependency in production, or hide the feature there (prod has no `/api-proxy`).
4. Generic input: sample templates plus a basic editor form.
5. Legal pages: Terms, Privacy, Refund, third-party licences.

**P1, product:**
6. Astryx migration of the UI (app shell, forms, buttons, progress, banners), landing page, pricing page.
7. Entitlements: license-key flow, Cloudflare Pages Function for verification, `.env.example`, limits (resolution, duration, watermark, daily count).
8. Lemon Squeezy (or Stripe) in **test mode**: checkout links, activation page.
9. Error/empty/loading states; cancel button; ffmpeg load progress.

**P2, polish:**
10. SEO (meta, OG, robots, sitemap), analytics (cookieless), error reporting.
11. Code splitting, remove tracked artefacts (`server.log`, `*.tsbuildinfo`), refresh README, AGENTS.md, delete `docs/session-handoff.md` (stale).
12. Add Vitest for pure logic (entitlement token, limits, URL parsing) and a Playwright smoke test later if a browser can be installed here.
13. Host the ffmpeg core on R2 if still needed.

## 4. Decisions I need from you (before step 4)
1. **Payment provider:** Lemon Squeezy (recommended) or Stripe?
2. **Pricing:** OK with Free / Pro $9 mo or $79 yr / optional lifetime $149? (placeholders will be env vars either way.)
3. **Employer-linked pieces:** OK to remove `host-map.json` and the `trypncl.com` mock assets, and demote the URL importer to an "Advanced" section? (Features stay; defaults go.)
4. **Transcoding:** OK to try native WebCodecs H.264 first and keep FFmpeg only as fallback?
5. **Astryx install:** OK to add `@astryxdesign/core` and `@astryxdesign/cli` as project dependencies (no global install)?
6. **Remotion licence:** do you already hold or plan a licence? This gates whether charging is viable.

## 5. What you will have to set up (summary; full checklist goes in the PR)
Lemon Squeezy/Stripe test account and product/variant IDs, API key and webhook secret (env vars, never committed), a signing secret for entitlement tokens, Cloudflare Pages env vars, analytics site ID, legal pages reviewed, a support email address, and later: live-mode keys, DNS/email for transactional mail. I will not touch DNS, the live site, or the Cloudflare token.

## 6. Decisions (2026-11-20)
1. Payments: **Lemon Squeezy** (test mode only).
2. Pricing placeholders approved: Free / Pro $9 mo or $79 yr / optional lifetime $149 (final prices are env/config, not code).
3. Employer-linked pieces removed (`host-map.json`, `trypncl.com` mock assets, dev proxy, Tailwind config with the editor's colour tokens). The URL importer stays as an "advanced" generic import (file / paste / URL).
4. Transcoding: browser-native WebCodecs through **mediabunny** (MPL-2.0). FFmpeg.wasm is removed (also removes the GPL/x264 and unpkg runtime concerns).
5. Astryx added as project dependencies (`@astryxdesign/core`, `cli`, `theme-neutral`). It requires React 19, so React was upgraded.
6. **Remotion removed.** HyperFrames (Apache 2.0) renders server-side with Puppeteer + FFmpeg, which would end the zero-cost model, so I built a small own renderer instead (canvas + WebCodecs + mediabunny). This resolves the Remotion licence risk (P0 item 1).
