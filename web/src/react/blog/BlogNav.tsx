import { useEffect, useState } from 'react';
import { PUBLIC_LOCALES, type PublicLocale } from '../../lib/i18n/store.svelte';
import { parsePublicPath } from '../../lib/i18n/public-routes';
import { REPO_URL, enterApp, fetchGithubStars, goPublic } from '../../components/landing/landing-utils';
import { PublicLink } from '../landing/PublicLink';
import { usePublicI18n } from '../i18n/PublicI18n';

const LOCALE_NAMES: Record<PublicLocale, string> = { en: 'English', es: 'Español', pt: 'Português' };

export function BlogNav({ inPost = false }: { inPost?: boolean }) {
  const { locale, setLocale, t } = usePublicI18n();
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => { void fetchGithubStars().then(setStars); }, []);

  function switchLocale(next: PublicLocale) {
    setLocale(next);
    goPublic(parsePublicPath(window.location.pathname).path);
  }

  const formattedStars = stars == null ? 'GitHub'
    : stars >= 1000 ? `${(stars / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(stars);

  return (
    <nav className="nav" aria-label={t('landing.navPrimary')}>
      <div className="nav-inner">
        <PublicLink to="/" className="nav-brand" title={t('blog.backHome')}>
          <span className="nav-logo" aria-hidden="true">S</span>
          <span className="nav-name">Stabileo</span>
        </PublicLink>
        <div className="nav-actions">
          {inPost && <PublicLink to="/blog" className="nav-blog-link">{t('landing.navBlog')}</PublicLink>}
          <a className="nav-gh" href={REPO_URL} target="_blank" rel="noreferrer" aria-label={t('landing.navGithubRepo')}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true" focusable="false">
              <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7 0-.7 0-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.7 18 5 18 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
            </svg>
            <span>{formattedStars}</span>
          </a>
          <label className="nav-lang-wrap">
            <span className="sr-only">{t('landing.navLanguage')}</span>
            <select className="nav-lang" value={locale} onChange={(event) => switchLocale(event.currentTarget.value as PublicLocale)}>
              {PUBLIC_LOCALES.map((code) => <option value={code} key={code}>{LOCALE_NAMES[code]}</option>)}
            </select>
          </label>
          <button className="btn btn-primary btn-sm" onClick={enterApp}>{t('blog.openEditor')}</button>
        </div>
      </div>
    </nav>
  );
}
