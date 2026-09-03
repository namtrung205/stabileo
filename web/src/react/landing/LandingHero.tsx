import { enterApp } from '../../components/landing/landing-utils';
import { usePublicI18n } from '../i18n/PublicI18n';
import { Eyebrow } from './Eyebrow';
import { PublicLink } from './PublicLink';
import { TrussFigure } from './TrussFigure';

export function LandingHero({ prefersReducedMotion = false }: { prefersReducedMotion?: boolean }) {
  const { t } = usePublicI18n();
  return (
    <section className="sec sec--ink hero" data-section="hero" id="top" aria-labelledby="hero-title">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <Eyebrow n="01" label={t('landing.ebHero')} />
          <h1 id="hero-title">{t('landing.heroH')}</h1>
          <p className="lead">{t('landing.heroP')}</p>
          <div className="hero-ctas"><button className="btn btn-primary btn-lg" onClick={enterApp}>{t('landing.heroCtaPrimary')}</button></div>
          <PublicLink to="/blog" className="link-arrow hero-blog">{t('landing.heroBlogLink')}</PublicLink>
          <ul className="hero-modes">
            <li><span className="hero-mode-name">{t('landing.heroModeBasic')}</span><span className="hero-mode-st hero-mode-st-today">{t('landing.heroModeBasicSt')}</span></li>
            <li><span className="hero-mode-name">{t('landing.heroModeEdu')}</span><span className="hero-mode-st">{t('landing.heroModeEduSt')}</span></li>
            <li><span className="hero-mode-name">{t('landing.heroModePro')}</span><span className="hero-mode-st">{t('landing.heroModeProSt')}</span></li>
          </ul>
          <dl className="hero-meta"><div><dt>{t('landing.heroMetaA')}</dt></div><div><dt>{t('landing.heroMetaB')}</dt></div><div><dt>{t('landing.heroMetaC')}</dt></div></dl>
        </div>
        <div className="hero-figure"><TrussFigure mode="animate" prefersReducedMotion={prefersReducedMotion} /></div>
      </div>
    </section>
  );
}
