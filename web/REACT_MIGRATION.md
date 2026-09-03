# Svelte → React migration plan

## Goal and non-negotiable contracts

React replaces the rendering layer only. The migration must preserve:

- current layout, dimensions, tokens, typography, SVG paths, icons, responsive breakpoints, and motion;
- all `data-testid` hooks and user-visible copy;
- URL, query-string, hash-share, embed, locale, blog, and GitHub Pages 404-routing behavior;
- keyboard, pointer, touch, drag, selection, camera, clipping, measuring, and zoom behavior;
- the Rust/WASM solver, Three.js scene code, model formats, reports, imports, exports, and persistence;
- the existing TypeScript domain and engineering modules unless a framework dependency prevents reuse.

No component library or replacement icon set is introduced during the parity migration.

## Architecture during migration

`src/main.tsx` is the only browser entry point. React owns routing and mounts route-sized React surfaces. A single compatibility boundary mounts the remaining editor shell while it is being converted. Inside that shell, temporary `display: contents` hosts let complete UI clusters move to React without changing their position in the DOM or their Three.js callbacks.

The existing stores remain the source of truth. `react-external-store.ts` exposes subscription revisions for React through `useSyncExternalStore`; it does not duplicate application state. Once the final Svelte consumer is removed, the rune-backed store files will be converted to framework-neutral TypeScript modules and the compatibility code will be deleted.

## Work phases

| Phase | Scope | Exit gate | Status |
| --- | --- | --- | --- |
| 1 | React/Vite entry, TypeScript JSX, compatibility boundary | production build boots public and editor routes | Done |
| 2 | Exact SVG icon component | every existing glyph keeps its original path, size, stroke, rotation, and `currentColor` behavior | Done |
| 3 | Public landing and blog | `/`, locale-prefixed routes, blog index/post/not-found, metadata, links, font preloads, and editor launch run without Svelte UI | Done |
| 4 | Shared state subscriptions | React surfaces update from the same UI/model/tab/locale state used by the solver and legacy shell | In progress |
| 5 | Editor chrome | header, mode switcher, tab bar, ribbon, option bars, sidebars, status bar, floating controls, menus, and dialogs are React | In progress |
| 6 | 2D viewport | React owns the canvas lifecycle; drawing, hit testing, snapping, drag/drop, zoom/pan, overlays, and event contracts remain unchanged | Pending |
| 7 | 3D viewport | React owns Three.js lifecycle; scene sync, selection, camera, clipping, measure, labels, animation invalidation, and disposal remain unchanged | Pending |
| 8 | Basic data/property/results panels | editors, tables, selection/property flows, imports, reports, and responsive drawers are React | Pending |
| 9 | Education and PRO workspaces | every exercise, design, detailing, generator, diagnostics, and verification workflow is React | Pending |
| 10 | Remove compatibility | zero `.svelte` UI files, zero rune stores, no Svelte plugin/runtime/compiler dependency | Pending |
| 11 | Parity verification | type/build gates, unit/E2E suites, route matrix, screenshot baselines, interaction matrix, memory/disposal checks | Pending |

## Current migrated surface

- React root and route switchboard.
- Complete landing page and all localized sections.
- Blog navigation, index, post renderer, tables, lazy embedded editor, and missing-post state.
- Exact ribbon icon set.
- 2D/3D floating viewport controls, including pointer mode, camera presets, clipping, measurement, and section rendering toggle.
- Selection-kind panel.
- Status bar and CAD provenance dialog.
- Project tab bar.
- Contextual tool-options bar and every node/element/support/load option control.
- Floating tool launcher, influence-line controls, help overlay, demo menu, and editor context menu.
- Global Basic keyboard shortcuts, including save/open, clipboard, delete, zoom, tool, diagram, grid/axes, and solve commands.
- Viewport-owned stress-pick hint and shared colour-scale overlay, mounted into the original positioned canvas container.
- Node, member, material, and section editors; steel-profile catalog selector; despiece force inspector.

The React root now places migrated chrome into the existing header, panel, viewport, and footer positions with portals. These portals replace nested React roots and keep the transitional Svelte shell from owning migrated component lifecycles.

The remaining Svelte files are editor compatibility code; public Svelte components have been removed.

## Verification matrix

Each migrated phase is checked at desktop and mobile widths in all three locales. The final gate covers:

1. Fresh `/app/basic`, `/app/education`, and `/app/pro` sessions.
2. Direct locale/blog URLs and `/?route=…` restoration.
3. Shared hash models and `?embed` URLs.
4. 2D creation, selection, editing, solving, diagrams, undo/redo, tabs, save/load, DXF, and reports.
5. 3D creation, orbit/pan/zoom, camera switching, selection, clipping, measuring, solving, diagrams, IFC, and scene cleanup.
6. Education handouts/tutorials and PRO design/detailing/document flows.
7. Keyboard-only and touch interaction, focus restoration, dialogs, and mobile drawers.
8. Pixel-level screenshots for the landing, blog, Basic 2D, Basic 3D, Education, and major PRO tabs.

The migration is complete only after Svelte is absent from the production dependency graph and the full parity matrix passes.
