import type { ReactNode } from 'react';

export type IconName =
  | 'select' | 'pan' | 'view2d' | 'view3d' | 'node' | 'element'
  | 'material' | 'section' | 'support' | 'load' | 'solve' | 'advanced'
  | 'data' | 'settings' | 'save' | 'undo' | 'redo' | 'none' | 'deformed'
  | 'axial' | 'shear' | 'shearZ' | 'shearY' | 'moment' | 'momentY'
  | 'momentZ' | 'torsion' | 'constraint' | 'shell' | 'fit' | 'stress'
  | 'examples' | 'project';

type IconProps = {
  name: IconName;
  size?: number;
  rotate?: number;
};

/**
 * Pixel-for-pixel React port of components/ribbon/Icon.svelte.
 *
 * These are Stabileo's engineering glyphs, not approximations from a generic
 * icon package. Keep the 24px grid, path data, 1.6 stroke and currentColor
 * behavior in sync until the Svelte source is removed.
 */
export function Icon({ name, size = 22, rotate = 0 }: IconProps) {
  let glyph: ReactNode = null;

  switch (name) {
    case 'select':
      glyph = <path d="M5 3l6.5 16 2.2-6.4 6.3-2.2z" />;
      break;
    case 'pan':
      glyph = <>
        <path d="M12 3v18M3 12h18" />
        <path d="M12 3l-2.4 2.6M12 3l2.4 2.6M12 21l-2.4-2.6M12 21l2.4-2.6" />
        <path d="M3 12l2.6-2.4M3 12l2.6 2.4M21 12l-2.6-2.4M21 12l-2.6 2.4" />
      </>;
      break;
    case 'view2d':
      glyph = <><rect x="3.5" y="4.5" width="17" height="15" rx="1" /><path d="M9 4.5v15M15 4.5v15M3.5 9.5h17M3.5 14.5h17" /></>;
      break;
    case 'view3d':
      glyph = <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 3v18M4 7.5l8 4.5 8-4.5" /></>;
      break;
    case 'node':
      glyph = <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" /></>;
      break;
    case 'element':
      glyph = <><path d="M6.6 17.4L17.4 6.6" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="5" r="2" /></>;
      break;
    case 'material':
      glyph = <><rect x="4.5" y="4.5" width="15" height="15" rx="1.5" /><path d="M7 15.5L15.5 7" /><path d="M10.5 17.5L17.5 10.5" /></>;
      break;
    case 'section':
      glyph = <><path d="M6 5.5h12" /><path d="M6 18.5h12" /><path d="M12 5.5v13" /></>;
      break;
    case 'support':
      glyph = <><path d="M12 6l6 9H6z" /><path d="M3.5 15h17" /><path d="M6 15l-1.8 3M11 15l-1.8 3M16 15l-1.8 3M21 15l-1.8 3" /></>;
      break;
    case 'load':
      glyph = <><path d="M12 3v12" /><path d="M8.4 11.6L12 15.4l3.6-3.8" /><path d="M4 19.5h16" /></>;
      break;
    case 'solve':
      glyph = <path d="M7 4.5l12 7.5-12 7.5z" />;
      break;
    case 'advanced':
      glyph = <><path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h9M17 17h3" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="15" cy="17" r="2" /></>;
      break;
    case 'data':
      glyph = <><rect x="3.5" y="4.5" width="17" height="15" rx="1" /><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15" /></>;
      break;
    case 'settings':
      glyph = <><path d="M13.42 3.2l.28 2.2 1.9.79 1.75-1.36 1.82 1.82-1.36 1.75.79 1.9 2.2.28v2.58l-2.2.28-.79 1.9 1.36 1.75-1.82 1.82-1.75-1.36-1.9.79-.28 2.2h-2.58l-.28-2.2-1.9-.79-1.75 1.36-1.82-1.82 1.36-1.75-.79-1.9-2.2-.28v-2.58l2.2-.28.79-1.9-1.36-1.75 1.82-1.82 1.75 1.36 1.9-.79.28-2.2z" /><circle cx="12" cy="12" r="3.2" /></>;
      break;
    case 'save':
      glyph = <><path d="M4.5 4.5h11.4L19.5 8.1v11.4h-15z" /><path d="M8 4.5v5h7v-5" /><rect x="7.5" y="13" width="9" height="6.5" /></>;
      break;
    case 'undo':
      glyph = <><path d="M4 10h10a5 5 0 0 1 0 10H8" /><path d="M7.5 6.5L4 10l3.5 3.5" /></>;
      break;
    case 'redo':
      glyph = <><path d="M20 10H10a5 5 0 0 0 0 10h6" /><path d="M16.5 6.5L20 10l-3.5 3.5" /></>;
      break;
    case 'none':
      glyph = <><circle cx="12" cy="12" r="8.5" /><path d="M6 18L18 6" /></>;
      break;
    case 'deformed':
      glyph = <><path d="M3 8h18" opacity="0.4" /><path d="M3 8c4 0 5 9 9 9s5-9 9-9" /></>;
      break;
    case 'axial':
      glyph = <><rect x="10.6" y="5" width="2.8" height="14" rx="0.4" fill="currentColor" stroke="none" /><path d="M8.4 12H2.6M17.6 12h3.8" /><path d="M5 9.4L2.4 12 5 14.6M19 9.4L21.6 12 19 14.6" /></>;
      break;
    case 'shear':
    case 'shearZ':
    case 'shearY':
      glyph = <><rect x="10.6" y="5" width="2.8" height="14" rx="0.4" fill="currentColor" stroke="none" /><path d="M7 17.5V6.5M17 6.5v11" /><path d="M4.6 9L7 6.4 9.4 9M14.6 15L17 17.6 19.4 15" /></>;
      break;
    case 'moment':
    case 'momentY':
    case 'momentZ':
      glyph = <><rect x="10.6" y="5" width="2.8" height="14" rx="0.4" fill="currentColor" stroke="none" /><path d="M8.4 7.6a5 5 0 0 0 0 8.8" /><path d="M15.6 7.6a5 5 0 0 1 0 8.8" /><path d="M6.6 6.6l1.9 1L7.6 9.6M17.4 6.6l-1.9 1 .9 2" /></>;
      break;
    case 'torsion':
      glyph = <><path d="M12 4v16" opacity="0.45" /><path d="M5.5 9.5a7.5 4 0 1 0 13 0" /><path d="M4.4 6.6l1.2 3.2 3.2-.9" /></>;
      break;
    case 'constraint':
      glyph = <><circle cx="6" cy="12" r="2.2" /><circle cx="18" cy="12" r="2.2" /><path d="M8.2 12h7.6" /><path d="M10 9.4v5.2M14 9.4v5.2" opacity="0.55" /></>;
      break;
    case 'shell':
      glyph = <><path d="M3.5 9.5L11 5.5l9.5 4.5-8 5z" /><circle cx="3.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="11" cy="5.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="20.5" cy="10" r="1.1" fill="currentColor" stroke="none" /><circle cx="12.5" cy="15" r="1.1" fill="currentColor" stroke="none" /></>;
      break;
    case 'fit':
      glyph = <><path d="M3 8V4.6a1.6 1.6 0 0 1 1.6-1.6H8" /><path d="M16 3h3.4A1.6 1.6 0 0 1 21 4.6V8" /><path d="M21 16v3.4a1.6 1.6 0 0 1-1.6 1.6H16" /><path d="M8 21H4.6A1.6 1.6 0 0 1 3 19.4V16" /><rect x="8.5" y="8.5" width="7" height="7" rx="0.6" opacity="0.5" /></>;
      break;
    case 'stress':
      glyph = <><rect x="3" y="9" width="18" height="6" rx="0.6" /><path d="M7 9v6" opacity="0.35" /><path d="M11 9v6" opacity="0.6" /><path d="M14.5 9v6" opacity="0.8" /><path d="M17.5 9v6" /></>;
      break;
    case 'examples':
      glyph = <path d="M4 6.5h16M4 12h16M4 17.5h10" />;
      break;
    case 'project':
      glyph = <><path d="M5 3.5h9l5 5v12H5z" /><path d="M14 3.5v5h5" /></>;
      break;
  }

  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      {glyph}
    </svg>
  );
}
