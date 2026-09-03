import { useEffect } from 'react';

const FIRST_VIEW_FONTS = [
  '/fonts/space-grotesk-700.woff2',
  '/fonts/ibm-plex-sans-400.woff2',
  '/fonts/ibm-plex-mono-500.woff2',
];

/** Keep the public pages' original self-hosted first-paint font preloads. */
export function usePublicFontPreloads() {
  useEffect(() => {
    const links = FIRST_VIEW_FONTS.map((href) => {
      const existing = document.head.querySelector<HTMLLinkElement>(
        `link[rel="preload"][as="font"][href="${href}"]`,
      );
      if (existing) return { link: existing, owned: false };

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.href = href;
      link.crossOrigin = 'anonymous';
      link.dataset.reactPublicFont = '';
      document.head.appendChild(link);
      return { link, owned: true };
    });

    return () => {
      for (const { link, owned } of links) if (owned) link.remove();
    };
  }, []);
}
