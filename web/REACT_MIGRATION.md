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
| 6 | 2D viewport | React owns the canvas lifecycle; drawing, hit testing, snapping, drag/drop, zoom/pan, overlays, and event contracts remain unchanged | Done |
| 7 | 3D viewport | React owns Three.js lifecycle; scene sync, selection, camera, clipping, measure, labels, animation invalidation, and disposal remain unchanged | Done |
| 8 | Basic data/property/results panels | editors, tables, selection/property flows, imports, reports, and responsive drawers are React | In progress — G4 core complete; IFC remains deferred under G3 |
| 9 | Education and PRO workspaces | every exercise, design, detailing, generator, diagnostics, and verification workflow is React | In progress |
| 10 | Remove compatibility | zero `.svelte` UI files, zero rune stores, no Svelte plugin/runtime/compiler dependency | Pending |
| 11 | Parity verification | type/build gates, unit/E2E suites, route matrix, screenshot baselines, interaction matrix, memory/disposal checks | Pending |

## Executable migration goals

The project-wide migration remains the umbrella goal. Work is delivered in small gates below so each change can be reviewed and verified independently.

| Goal | Deliverable | Verification gate | Status |
| --- | --- | --- | --- |
| G1 | React entry, public routes, landing, and blog | typecheck, production build, public route smoke matrix | Done |
| G2 | Shared editor chrome and isolated editors | preserved test IDs plus typecheck/build | Done |
| G3 | Independent editor dialogs and overlays | component contract checks, relevant domain tests, typecheck/build | In progress — 3D→2D, mobile results, 2D DXF import, calculation report, and material presets done |
| G4 | Basic ribbon and right-side data/result panels | Basic workflow contract suite, typecheck, and production bundle | Done |
| G5 | 2D viewport ownership | drawing, selection, snapping, drag, zoom/pan, and disposal tests | Done |
| G6 | 3D viewport ownership | camera, selection, clipping, measuring, rendering, and disposal tests | Done |
| G7 | Education and PRO workspaces | mode-specific workflow suites and responsive checks | In progress — G7.2 geometry/properties underway |
| G8 | Remove compatibility layer and Svelte | zero `.svelte` files/dependencies and full parity matrix | Pending |

### G4 Basic editor breakdown

| Gate | Scope | Verification | Status |
| --- | --- | --- | --- |
| G4.1 | Desktop Basic ribbon and its panel-state bridge | command/test-id contract, result/view-mode tests, typecheck, production bundle | Done |
| G4.2 | Remaining Basic toolbar shells and selected-entity strip | tool/keyboard state tests, responsive DOM contract, typecheck/build | Done |
| G4.3 | Basic right-panel shell plus project/config/advanced/results controls | panel routing and solve/result workflow tests | Done |
| G4.4 | Data-table shell and nodes/elements/supports/loads/materials/sections/results tables | CRUD, tab, import/export, undo/redo tests | Done |
| G4.5 | Property panel and remaining entity detail editors | selection/edit/history tests | Done |
| G4.6 | Basic automated closeout | Basic ownership/contracts, typecheck, targeted workflows, production bundle | Done |
| G4.7 | Section-stress analysis closeout | React root/details/model, then native cross-section SVG and removal of the last Basic UI bridge | In progress — root/details/model done; SVG leaf remains |

G4.3 was implemented as four reviewable sub-gates: Project/examples, Config, Results, then Advanced plus the final React panel shell. The Kinematic and What-if reports are now React-owned in both their docked Basic layouts and floating/mobile layouts. The complete DSM wizard — navigation, keyboard controls, all nine steps, equation/vector/matrix renderers, quiz cells, and Matrix Explorer — is React-owned with no Svelte bridge. Section stress now has a React-owned root, calculation model, Mohr-circle, central-core, stress-state, tensor, torsion, centroid, and shear-centre views in both docked and floating/mobile placements. Its cross-section SVG is the sole remaining Svelte leaf in the Basic panel and is kept mounted through a live-prop adapter until its direct React port lands.

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
- 3D→2D plane/slice/project/erase decision dialog, with its original CSS hooks and E2E test IDs.
- Mobile Basic/PRO solve and results panel, portalled into its original viewport position.
- 2D DXF import dialog, including file parsing, unit/tolerance remapping, preview, warnings, and model import.
- Calculation report configuration/generation dialog and the shared material preset catalogue.
- Basic editor ribbon, including project/history commands, mode switching, drawing tools, solve, and result diagrams.
- Desktop tool-options bar, mobile/authoring floating tools, and inline editing for selected 2D/3D loads and supports.
- Basic Project panel and sidebar sections: file/session operations, 2D/3D examples, tutorials, export/import, and share links.
- Basic Config, Results, and Advanced controls plus the resizable right-panel shell.
- Mobile Basic toolbar, dimension switching, undo/redo, and responsive drawer placement.
- Model-data shell and nodes, elements, supports, loads, materials, sections, and results tables.
- Property panel with node, element, support, nodal-load, hinge, local-axis, member-offset, stress, reaction, and displacement detail flows.
- PRO Nodes, Elements, Supports, Materials, and Sections tabs, including curved-member generation and the steel/profile section builder.

Current implementation priority is the editor. Public landing and blog surfaces are already stable and are excluded from the remaining incremental goals. The active editor goal is G4.7, removal of the final Basic section-drawing leaf; G7 Education/PRO work remains paused until Basic is fully closed out.

### G5 2D viewport breakdown

| Gate | Scope | Verification | Status |
| --- | --- | --- | --- |
| G5.1 | React canvas DOM, viewport controls, event-listener lifecycle, DXF drop, resize/disposal boundary | ownership contract, coordinate/selection regressions, typecheck/build | Done |
| G5.2 | Extract invalidation renderer and drawing coordinator to framework-neutral TypeScript | diagram/theme/render invalidation tests | Done |
| G5.3 | Extract pointer, touch, snapping, creation, selection, drag, and context-menu controller | spatial-query and interaction tests | Done |
| G5.4 | Remove the headless Svelte controller and close the compatibility boundary | no 2D viewport Svelte dependency, production build | Done |

React now owns the 2D canvas DOM and native event lifecycle. `ViewportController.ts` is framework-neutral and preserves the former drawing and interaction implementation, while dedicated invalidation, store-coordination, and input-geometry modules provide independently tested scheduling, transitions, wheel anchoring, pinch/pan, cursor, selection, and disposal contracts. The former `Viewport.svelte` compatibility surface has been removed.

### G6 3D viewport breakdown

| Gate | Scope | Verification | Status |
| --- | --- | --- | --- |
| G6.1 | React wrapper, camera controls, pointer-listener lifecycle, and scene readiness boundary | ownership contract, viewport3d regressions, typecheck/build | Done |
| G6.2 | Extract render invalidation, animation scheduling, resize, and disposal coordination | scheduler, scene-cost, disposal, typecheck/build | Done |
| G6.3 | Extract camera navigation, picking, creation, selection, dragging, measuring, and context controller | camera/picking/interaction suites | Done |
| G6.4 | Move clipping, legends, coordinate dialog, selection rectangle, tooltip, gizmo, shell legend, and perf HUD overlays to React | overlay ownership contract and viewport regressions | Done |
| G6.5 | Remove the headless Svelte scene controller and close the 3D compatibility boundary | no main 3D viewport Svelte dependency, production bundle | Done |

The React root now places migrated chrome into the existing header, panel, viewport, and footer positions with portals. These portals replace nested React roots and keep the transitional Svelte shell from owning migrated component lifecycles.

### G7 Education and PRO workspace breakdown

| Gate | Scope | Verification | Status |
| --- | --- | --- | --- |
| G7.1 | PRO project open/save actions | file contracts, shortcut lifecycle, typecheck/build | Done |
| G7.2 | PRO geometry, properties, conditions, and results tabs | tab CRUD and solve/result workflow suites | In progress — Nodes, Elements, Supports, Materials, and Sections done |
| G7.3 | PRO design, steel, generators, connections, and diagnostics | domain workflow suites and ownership contracts | Pending |
| G7.4 | Education exercise, authoring, review, and help surfaces | exercise/authoring suites and responsive contracts | Pending |
| G7.5 | Remove PRO/Education Svelte workspace shells | no workspace `.svelte` dependency, production bundle | Pending |

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
