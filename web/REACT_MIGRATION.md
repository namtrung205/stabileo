# React-only frontend status

## Decision

The editor is now a Basic-only product. PRO and Education UI/workspaces were removed instead of being migrated further. React is the only frontend framework.

## Current architecture

- `src/main.tsx` is the only browser entry point and mounts `src/react/App.tsx`.
- Every editor URL (`/app`, `/app/basic`, and legacy `/app/pro` or `/app/education` links) opens the Basic React editor.
- `BasicEditorApp.tsx` directly owns the header, tabs, ribbon, tool options, 2D/3D workspace, panels, dialogs, mobile shell, notifications, and lifecycle.
- The 2D and 3D controllers remain framework-neutral TypeScript. React owns their canvas/WebGL DOM lifecycle.
- Shared model, result, history, tab, tour, and UI stores are framework-neutral `.ts` modules observed from React with `useSyncExternalStore`.
- No `.svelte` or `.svelte.ts` files remain under `src`.
- The Svelte runtime, compiler, checker, and Vite plugin are absent from `package.json` and the lockfile.

## Removed product surfaces

- PRO editor shell, ribbon, tabs, design/detailing UI, generators, steel UI, reports, and dialogs.
- Education editor shell, exercise/authoring/review UI, diagram sketch UI, and its Education-only domain helpers/tests.
- React-to-Svelte compatibility hosts, portals, legacy entrypoints, and Svelte-owned editor leaves.

Pure TypeScript engineering modules shared with Basic calculations, imports, exports, reports, or file compatibility are retained where removing them could alter Basic behavior. They are not frontend framework code and do not expose a PRO/Education route.

## Verification gates

Run from `web`:

```powershell
npm run check
npm run test:unit
npm run build
```

`src/react/__tests__/react-only-architecture.test.ts` guards the React-only boundary and fails if a Svelte source/dependency or PRO/Education UI tree is reintroduced.

## Preserved Basic contracts

- UI layout, SVG icons, test IDs, keyboard/pointer/touch controls, responsive drawers, and persistence.
- 2D draw/select/snap/pan/zoom and result diagrams.
- 3D orbit/pan/zoom, picking, creation, clipping, measuring, overlays, and cleanup.
- Data tables, property editing, material/section selection, DSM, kinematic/what-if/section-stress tools.
- DXF, CAD-to-RC, IFC, calculation reports, autosave, tabs, model sharing, and Rust/WASM solving.

No code is committed automatically as part of this migration.
