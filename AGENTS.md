# AI Agent Development Guide (AGENTS.md)

Welcome to the Remotion Client-Side Rendering POC codebase. This document is written for AI coding agents to quickly understand the architecture, constraints, and development patterns of this project.

## Core Objective

This project demonstrates in-browser video rendering using `@remotion/web-renderer` and WebCodecs (`VP8`), avoiding server-side Remotion rendering. It imports the existing `Composition` component directly from the main Editor codebase (`@btg-pencil-ai/editor`) using a Vite alias plugin, avoiding the need to duplicate complex composition logic. The resulting `WebM` file is then converted into `MP4` using the `mediabunny` WebAssembly library.

---

## Key Architecture & Integration Points

### 1. Editor Integration via Vite Plugin

We do not copy the editor code. Instead, `vite.config.ts` uses `editorDevResolvePlugin()` to redirect imports like `@modules/*`, `@common/*`, and `@btg-pencil-ai/editor` to `../../editor.worktrees/mediabunny-video/src/`.

- **Constraint:** Do not add dependencies that conflict with the Editor.
- **Deduplication:** React, ReactDOM, Remotion, and Jotai are heavily deduplicated in `vite.config.ts` to avoid "Invalid Hook Call" errors when components from the Editor try to use this project's React instance.

### 2. Composition Wrapper & Props

The `CompositionWrapper.tsx` wraps the Editor's `Composition` in a Jotai `<Provider>`.

- **Important Props:**
  - `isMainPlayer={true}` during rendering to ensure audio tracks are included.
  - `isMainPlayer={isMainPlayer}` (toggled via debug UI) during preview. Setting this to `true` in preview causes a known Remotion audio scheduler crash (`hmm, should not render!`), so we allow toggling it for testing.
  - `isDisableTextBox={true}` prevents the Lexical text editor from mounting, avoiding dependencies on the Enterprise Editor Context.

### 3. Rendering Pipeline (`lib/renderVideo.ts`)

1. Uses `renderMediaOnWeb` from `@remotion/web-renderer`.
2. To prevent audio from playing out loud through the user's speakers during the render, the actual render elements are visually hidden off-screen using CSS targeting `[data-remotion-web-renderer]` in `src/index.css`.
3. The rendered `Blob` (WebM VP8) is passed into `mediabunny` (`Conversion.init`) to transcode to MP4 and AAC audio.

### 4. API Proxy (`vite.config.ts`)

To bypass CORS restrictions when fetching visual data from the `pro` or `stg-pro` environments, Vite runs an `apiProxyPlugin`.

- **Mapping:** `src/config/host-map.json` maps frontend hostnames (e.g., `stg-pro.trypencil.com`) to the correct backend API hostnames (`stg-api.trypencil.com`).

---

## Known Issues & Hacks (Agent Beware)

1. **Typescript Conflicts:** The Editor uses a different version of `@types/react` than this project. `tsc` typechecking is separate from the `vite build`. We use `tsconfig.app.json` with a specific `typeRoots` to avoid importing the Editor's types and throwing hundreds of errors. **Do not use `tsc -b` for building.**
2. **React StrictMode Double-Mount:** In `RenderBlock.tsx`, `isMountedRef` is used to cancel state updates if the component unmounts during an API fetch. React 18's StrictMode double-mounts the component, which initially broke `isMountedRef`. It is now fixed by setting `isMountedRef.current = true` _inside_ the `useEffect` body.
3. **Hooks Violations:** `AdPlayerPreview.tsx` originally had early returns before its React hooks (`useState`, `useMemo`). This caused the page to crash when data finished fetching. **Always place hooks before early returns.**

---

## Modifying or Extending the Code

- **Adding new Configs:** Use `src/config/`.
- **Modifying the Player:** Be careful modifying `AdPlayerPreview.tsx`. `@remotion/player` is sensitive to prop changes.
- **Styling:** We use Tailwind CSS.
- **State:** Component-local state (`useState`) is preferred over global Jotai atoms for the POC wrapper, except where the Editor specifically requires a Jotai Provider. LocalStorage is used to persist block inputs (`workUrl`, `jwt`) between reloads.

## Checklist for Agents Adding Features

- [ ] Did you check if your change breaks the Vite resolve alias for the Editor?
- [ ] Are you mutating the `visualJson` state? Ensure it matches the `VisualData` interface from `@btg-pencil-ai/editor`.
- [ ] Did you accidentally introduce an early return before a React Hook?
- [ ] If you need to debug audio crashes, check `isMainPlayer={true}` vs `false`.
