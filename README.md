# Remotion Client-Side Rendering POC

## Overview

This is a Proof of Concept for in-browser video rendering using `@remotion/web-renderer` and WebCodecs. It reuses the existing `Composition` component from `@btg-pencil-ai/editor` to render a visual project directly in the browser, converting the resulting WebM into an MP4 file using `mediabunny`.

## How It Works

1. **Fetch Data**: The user provides a Work URL and JWT token. The application fetches the visual data for that creative via a local proxy that bypasses CORS.
2. **Preview**: The fetched visual data is rendered using `@remotion/player` for preview.
3. **Render**: When the user clicks "Render", the visual is rendered in-browser using `renderMediaOnWeb` (VP8/WebM via WebCodecs).
4. **Convert**: The resulting WebM blob is converted to MP4 using `mediabunny` (with AAC audio encoding if needed).
5. **Download**: The user can download the final `.mp4` file directly.

## Project Structure

```text
remotion-client-render/
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite config with editor resolve plugin & COOP/CORP headers
├── src/
    ├── App.tsx               # Main application layout
    ├── components/
    │   ├── CompositionWrapper.tsx  # Wraps the editor Composition with Jotai Provider
    │   ├── CompositionPreview.tsx  # @remotion/player preview
    │   ├── RenderPanel.tsx         # Inline rendering logic and progress
    │   ├── RenderBlock.tsx         # Handles inputs, API fetching, and UI state
    │   └── BrowserSupport.tsx      # WebCodecs support banner
    └── lib/
        ├── fetchVisualData.ts      # API proxy fetching
        ├── renderVideo.ts          # Core renderMediaOnWeb and WebM->MP4 conversion logic
        └── detectWebCodecs.ts      # Verifies VP8 VideoEncoder support
```

## Prerequisites

- **Node.js**: v18+ recommended
- **Yarn**: package manager
- **Browser**: Google Chrome or a Chromium-based browser with WebCodecs support.
- **Editor Source**: The `@btg-pencil-ai/editor` source code must exist at `../../editor.worktrees/mediabunny-video` relative to this project root, as the Vite config resolves aliases into it.

## Setup & Running

1. **Install dependencies**:

   ```bash
   yarn install
   ```

2. **Start the development server**:

   ```bash
   yarn dev
   ```

   The dev server starts on `http://localhost:5173`.

3. **Build the project**:

   ```bash
   yarn build
   ```

4. **Typecheck**:
   ```bash
   yarn typecheck
   ```
   _Note: TypeScript typechecking is run separately from the Vite build because the editor's React types conflict with this project's React types. Vite transpiles everything fine._

## Key Architecture Decisions

- **Remotion Version**: `4.0.436` is used because `@remotion/web-renderer` does not exist in older versions like `4.0.295`.
- **Editor Integration**: `vite.config.ts` has a custom `editorDevResolvePlugin` to resolve editor aliases (`@modules`, `@common`, etc.) directly from the local editor source. React, Remotion, and Jotai are deduped to prevent invalid hook calls.
- **CORP/COOP Headers**: Added in Vite server config (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`) to enable `SharedArrayBuffer`, which is required by `@remotion/web-renderer`.
- **CompositionWrapper Props**: The `Composition` component is initialized with props like `isMainPlayer={false}` and `isDisableTextBox={true}` to prevent it from depending on `EnterpriseEditorContext` or the Lexical editor.
- **Jotai Provider**: A local Jotai `<Provider>` wraps the component to isolate its state, as inner layers (like `SceneItem`) depend on Jotai atoms.

## Browser Requirements

- WebCodecs (`VideoEncoder`) support with `vp8` profile.
- `SharedArrayBuffer` support (enabled via the COOP/CORP headers configured in Vite).
