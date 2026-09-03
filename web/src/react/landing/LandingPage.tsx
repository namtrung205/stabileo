import { useEffect, useRef, useState } from 'react';
import { applyPageMeta, restorePageMeta } from '../../lib/page-meta';
import '../../components/landing/landing.css';
import { usePublicI18n } from '../i18n/PublicI18n';
import { LandingHero } from './LandingHero';
import { LandingNav } from './LandingNav';
import { WhatsappButton } from './WhatsappButton';
import {
  LandingBasic, LandingBlog, LandingCapabilities, LandingCodes, LandingCTA,
  LandingDocs, LandingEducation, LandingFooter, LandingProblem, LandingPro,
  LandingStatus, LandingThesis, LandingValidation, LandingWhat,
} from './Sections';
import { usePublicFontPreloads } from '../public/usePublicFontPreloads';

export function LandingPage() {
  const { locale, t } = usePublicI18n();
  const landingRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  usePublicFontPreloads();

  useEffect(() => {
    applyPageMeta({ title: `Stabileo — ${t('landing.heroH')}`, description: t('landing.heroP'), locale, path: '/' });
    return restorePageMeta;
  }, [locale, t]);

  useEffect(() => {
    const landing = landingRef.current;
    if (!landing) return;

    const revealPassed = () => {
      const limit = landing.getBoundingClientRect().bottom;
      for (const node of landing.querySelectorAll('.reveal:not(.visible)')) {
        if (node.getBoundingClientRect().top < limit) node.classList.add('visible');
      }
    };
    const onScroll = () => {
      const denominator = Math.max(1, landing.scrollHeight - landing.clientHeight);
      setScrollPct((landing.scrollTop / denominator) * 100);
      revealPassed();
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) entry.target.classList.add('visible');
    }, { threshold: 0.08, root: landing });
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);

    setPrefersReducedMotion(motionQuery.matches);
    motionQuery.addEventListener?.('change', onMotionChange);
    landing.addEventListener('scroll', onScroll, { passive: true });
    for (const element of landing.querySelectorAll('.reveal')) observer.observe(element);
    onScroll();

    return () => {
      observer.disconnect();
      landing.removeEventListener('scroll', onScroll);
      motionQuery.removeEventListener?.('change', onMotionChange);
    };
  }, []);

  return (
    <div className="landing" ref={landingRef} tabIndex={0}>
      <div className="scroll-progress" style={{ width: `${scrollPct}%` }} aria-hidden="true" />
      <LandingNav />
      <LandingHero prefersReducedMotion={prefersReducedMotion} />
      <LandingProblem /><LandingWhat /><LandingBasic /><LandingCapabilities />
      <LandingValidation /><LandingCodes /><LandingEducation /><LandingPro />
      <LandingThesis /><LandingStatus /><LandingDocs /><LandingCTA /><LandingBlog />
      <LandingFooter /><WhatsappButton />
    </div>
  );
}
