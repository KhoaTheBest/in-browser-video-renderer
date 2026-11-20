# Agent guide

Render in Browser: compose scenes, preview and export MP4 entirely in the browser. React 19, Vite, TypeScript, Astryx UI, mediabunny (WebCodecs).

## Commands
Node via nvm (`. ~/.nvm/nvm.sh`). Yarn 1 (`npx yarn@1.22.22` if `yarn` is missing).
- `yarn dev` / `yarn build` / `yarn preview`
- `yarn typecheck` (tsc, covers `src` and `functions`) and `yarn test` (vitest)
- `yarn astryx doctor --built .` before delivering UI changes

## Layout
- `src/engine/` renderer. `timeline.ts` (pure), `drawFrame.ts` (canvas), `assets.ts`, `audio.ts`, `exportVideo.ts` (mediabunny MP4), `usePreviewPlayer.ts`.
- `src/billing/` plan limits (`plans.ts`), soft daily usage, license client. Limits are client-side by design; they are a convenience, not security.
- `functions/api/license.ts` Cloudflare Pages Function validating Lemon Squeezy keys.
- `src/pages/`, `src/layout/`, `src/components/` UI. `src/data/templates.ts` built-in templates. `src/config/pricing.ts` display prices and checkout URLs from env.
- Visual JSON schema: `src/types/visual.ts` (fps, durationInFrames, dimensions, scenes, layers, audio).

## Rules
- No private or employer code, hosts or assets. There is no Remotion, FFmpeg or editor dependency; do not reintroduce them (Remotion's licence was the reason).
- Never commit secrets or live keys. Add new env vars to `.env.example`. Use Lemon Squeezy test mode.
- UI uses Astryx components and tokens, not raw `div` or Tailwind. Native `canvas`/`video` may take an inline style.
- Pure logic gets a unit test. The browser export path has no automated test yet (see README, Testing).
- Do not `yarn add` anything that needs React 18.

<!-- ASTRYX:START -->
Astryx v0.7.16 · 174 components
CLI: run every command as `yarn astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then Tailwind utilities backed by tokens. No raw hex/px.
- THEMES: palettes and custom colors go through the theme, never :root overrides. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` and open the PNGs it writes (changes nothing in the app); a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any style={{…}}, raw <div>/<span>, imported .css/@apply, or hardcoded/arbitrary value (bg-[#fff], p-[13px]) with the component or a token-backed utility.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->
