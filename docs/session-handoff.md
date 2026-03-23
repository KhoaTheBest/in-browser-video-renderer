# Session Handoff: Remotion Client-Side Rendering POC

## Plan Location

`/Users/kayel/.claude/plans/starry-orbiting-rossum.md`

## What This POC Does

In-browser video rendering using `@remotion/web-renderer` + WebCodecs. Uses the existing `Composition` component from `@btg-pencil-ai/editor` (resolved from local source at `../../editor`).

---

## Current State: Rendering POC Functional with UI Refinements

The project can now successfully fetch visual data, preview it, render it using WebCodecs/VP8, convert it to MP4 via `mediabunny`, and download the result.

### Recent Updates & Fixes (Session 2)

1. **API Hostname Mapping:** Added `src/config/host-map.json` and updated `vite.config.ts`'s proxy plugin to map hostnames (e.g. `stg-pro.trypencil.com` -> `stg-api.trypencil.com`) to bypass CORS for specific environments.
2. **State Persistence:** `App.tsx` and `RenderBlock.tsx` now use `localStorage` to save the active blocks, `workUrl`, and `jwt` token across browser reloads.
3. **UI Improvements:** Fixed an issue where input fields had white text on a white background. Enforced side-by-side layout for the Preview and Video Playback panels.
4. **Remotion Media Crash Fix:** Changed `isMainPlayer={true}` to `isMainPlayer={false}` in `CompositionWrapper.tsx`. This fixed a `"hmm, should not render!"` crash coming from `@remotion/media`'s internal audio scheduler when previewing the video. However, this fix **muted the audio** in the preview player.

### Files Created (complete)

```
remotion-client-render/
├── package.json              # ✅ Dependencies installed (yarn.lock exists)
├── tsconfig.json             # ✅
├── tsconfig.app.json         # ✅ Has typeRoots fix for editor type conflicts
├── tsconfig.node.json        # ✅
├── vite.config.ts            # ✅ Editor resolve plugin + API proxy + CORP/COOP headers
├── index.html                # ✅
├── postcss.config.js         # ✅
├── tailwind.config.js        # ✅
└── src/
    ├── main.tsx              # ✅
    ├── App.tsx               # ✅ Handles rendering blocks and persists state
    ├── index.css             # ✅ Tailwind + dark theme
    ├── config/
    │   └── host-map.json     # ✅ Maps frontend hostnames to API hostnames
    ├── data/
    │   └── mock-visual.ts    # ✅ Two text layers, 1080x1080, 3s @ 30fps
    ├── components/
    │   ├── RenderBlock.tsx         # ✅ Main block containing inputs, fetch logic, and preview/render panels
    │   ├── CompositionWrapper.tsx  # ✅ Jotai Provider + Composition (isMainPlayer={false})
    │   ├── CompositionPreview.tsx  # ✅ @remotion/player preview
    │   ├── RenderPanel.tsx         # ✅ Render trigger + progress + download
    │   └── BrowserSupport.tsx      # ✅ WebCodecs support banner
    └── lib/
        ├── fetchVisualData.ts      # ✅ Proxies visual data fetching
        ├── renderVideo.ts          # ✅ renderMediaOnWeb wrapper and mediabunny MP4 conversion
        └── detectWebCodecs.ts      # ✅ VP8 VideoEncoder.isConfigSupported check
```

---

## Deviations from Original Plan

### 1. Remotion version: 4.0.436 (not 4.0.295)

**Why:** `@remotion/web-renderer` doesn't exist at `4.0.295`. Earliest available version is `4.0.341`. All remotion packages upgraded to `4.0.436` (latest at time of implementation). `resolutions` field in package.json forces the editor's remotion deps to resolve to `4.0.436` too.

### 2. `@types/react` pinned to `~18.2.0` (not `^18.3.0`)

**Why:** The editor's `node_modules` has `@types/react@18.2.8`. React 18.3 types removed `children` from `ReactPortal`, causing type errors in editor source files. Resolution `"@types/react": "18.2.79"` forces all packages to share the same version.

### 3. Build script: `vite build` only (no `tsc -b`)

**Why:** TypeScript follows imports into `../../editor/src/` and type-checks the entire editor codebase. The editor has its own `@types/react` in its `node_modules` which conflicts with ours (two different React type declarations). This causes ~100+ type errors in editor files (not our code). Solution: `tsc` removed from build, added as separate `typecheck` script. Vite handles transpilation fine without `tsc`.

### 4. `tsconfig.app.json` has `typeRoots: ["./node_modules/@types"]`

**Why:** Prevents TypeScript from traversing `../../editor/node_modules/@types/` and picking up conflicting type definitions.

---

## What Needs To Be Done (Next Steps for Next Agent)

### 1. Restore Audio Playback in the Preview Player

Currently, `isMainPlayer` in `CompositionWrapper.tsx` is set to `false` to prevent the `"hmm, should not render!"` crash in `@remotion/media`. This bypasses the crash by muting the video (`<Video muted />` in the editor's `VideoLayerV2.tsx`).

**The goal is to restore audio playback without triggering the crash.**

- **Option A:** Re-enable `isMainPlayer={true}` and investigate the root cause of the `@remotion/media` audio scheduler crash. It may be related to audio context creation, `SharedArrayBuffer`, or how Remotion 4.0.436 handles `<Video>` tags when audio is present.
- **Option B:** Modify the editor's `VideoLayerV2.tsx` to not forcefully mute the video when `isMainPlayer` is false, assuming the crash only happens when the main player UI audio scheduler is active.
- **Option C:** Implement a standalone Remotion `<Audio>` track mapping for `multiAudio` tracks so audio plays independently of the `@remotion/media` video component.

### 2. General Cleanup & Hardening

- Ensure memory leaks don't occur when removing or adding multiple `RenderBlock` components.
- Check error states for bad API requests or corrupted `visualJson` data.

---

## Key Architecture Decisions

### CompositionWrapper props prevent EnterpriseEditorContext dependency

- `isMainPlayer={false}` → skips AudioItem and GridLayout
- `isDisableTextBox={true}` → prevents Lexical editor mounting
- `isMainSequence={true}`, `isAnimationEnabled={true}`, `hasInteractive={false}`
- These ensure no code path reaches `useEnterpriseEditorContext()`

### Jotai Provider is required

`SceneItem` calls `useAtomValue()` for layer state atoms. Without `<Provider>`, jotai uses the global default store which may not exist in the renderer's context.

### RenderPanel uses inline render logic

The `src/lib/renderVideo.ts` utility was created but `RenderPanel.tsx` has its own inline `renderMediaOnWeb` call with the `RenderComposition` component defined locally. This is intentional — the render component must be a standalone function component for `renderMediaOnWeb`.

---

## Editor Integration Details

The `vite.config.ts` has a custom `editorDevResolvePlugin()` that:

1. Resolves `@btg-pencil-ai/editor` → `../../editor/src/index.ts`
2. Resolves `@modules/*` imports from anywhere (needed by our code)
3. Resolves `@common/*`, `@store/*`, `@editor/*`, etc. only from within editor source files
4. Uses `resolve.dedupe` to prevent duplicate React/Remotion/Jotai instances

The `server.fs.allow` includes the editor root so Vite can serve files from outside the project directory.
