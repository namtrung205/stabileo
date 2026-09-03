import { useEffect, useState } from 'react';
import { POSTS, formatPostDate } from '../../lib/blog';
import { readingMinutes } from '../../lib/blog/types';
import {
  AI_WORKFLOW_URL, DOCS_HUB_URL, QUICK_START_URL, REPO_URL, SOLVER_REF_URL,
  enterApp, fetchGithubStars,
} from '../../components/landing/landing-utils';
import { usePublicI18n } from '../i18n/PublicI18n';
import { Eyebrow } from './Eyebrow';
import { PublicLink } from './PublicLink';
import { Shot } from './Shot';

export function LandingProblem() {
  const { t } = usePublicI18n();
  const rows = [
    { term: 'landing.probCostTerm', body: 'landing.probCostBody', accent: true },
    { term: 'landing.probOsTerm', body: 'landing.probOsBody', accent: false },
    { term: 'landing.probBoxTerm', body: 'landing.probBoxBody', accent: false },
  ];
  return <section className="sec sec--paper problem reveal" data-section="problem" id="problem" aria-labelledby="problem-title">
    <div className="wrap">
      <Eyebrow n="02" label={t('landing.ebProblem')} />
      <h2 id="problem-title" className="display">{t('landing.probH1')}<br /><em>{t('landing.probH2')}</em></h2>
      <dl className="prob-rows">{rows.map((row) => <div className="prob-row" key={row.term}>
        <dt className={`prob-term${row.accent ? ' accent' : ''}`}>{t(row.term)}</dt>
        <dd className="prob-body">{t(row.body)}</dd>
      </div>)}</dl>
    </div>
  </section>;
}

export function LandingWhat() {
  const { t } = usePublicI18n();
  const cards = [
    { k: 'landing.whatK1', title: 'landing.whatT1', body: 'landing.whatB1' },
    { k: 'landing.whatK2', title: 'landing.whatT2', body: 'landing.whatB2' },
    { k: 'landing.whatK3', title: 'landing.whatT3', body: 'landing.whatB3' },
  ];
  const modes = [
    { id: 'basic', tone: 'today', badge: 'landing.badgeToday', name: 'landing.modeBasicName', body: 'landing.modeBasicLine' },
    { id: 'edu', tone: 'dev', badge: 'landing.badgeDev', name: 'landing.modeEduName', body: 'landing.modeEduLine' },
    { id: 'pro', tone: 'dev', badge: 'landing.badgeDev', name: 'landing.modeProName', body: 'landing.modeProLine' },
    { id: 'ai', tone: 'dev', badge: 'landing.badgeDev', name: 'landing.modeAiName', body: 'landing.modeAiLine' },
  ];
  return <section className="sec sec--ink what reveal" data-section="what" id="what" aria-labelledby="what-title">
    <div className="wrap">
      <Eyebrow n="03" label={t('landing.ebWhat')} />
      <h2 id="what-title" className="display">{t('landing.whatH')}</h2>
      <div className="card-row cols-3">{cards.map((card) => <article className="card" key={card.k}>
        <p className="kicker">{t(card.k)}</p><h3>{t(card.title)}</h3><p>{t(card.body)}</p>
      </article>)}</div>
      <p className="what-access">{t('landing.whatAccess')}</p>
      <div className="modes" aria-labelledby="modes-title">
        <h3 id="modes-title" className="modes-title">{t('landing.modesTitle')}</h3>
        <p className="modes-lead">{t('landing.modesLead')}</p>
        <ul className="mode-list">{modes.map((mode) => <li className="mode-row" data-mode={mode.id} key={mode.id}>
          <span className={`badge badge-${mode.tone}`}>{t(mode.badge)}</span>
          <p className="mode-name">{t(mode.name)}</p><p className="mode-body">{t(mode.body)}</p>
        </li>)}</ul>
      </div>
    </div>
  </section>;
}

export function LandingBasic() {
  const { t } = usePublicI18n();
  const shots = [
    { base: '2d-moments', w: 1600, h: 997, alt: 'landing.capAlt2d', title: 'landing.capShot2dTitle', body: 'landing.capShot2dBody' },
    { base: '2d-section-analysis', w: 1600, h: 997, alt: 'landing.capAltStress2d', title: 'landing.capShotStress2dTitle', body: 'landing.capShotStress2dBody' },
    { base: '3d-frame', w: 1600, h: 876, alt: 'landing.capAlt3d', title: 'landing.capShot3dTitle', body: 'landing.capShot3dBody' },
    { base: '3d-section-analysis', w: 1600, h: 876, alt: 'landing.capAltStress3d', title: 'landing.capShotStress3dTitle', body: 'landing.capShotStress3dBody' },
    { base: '3d-industrial', w: 1600, h: 876, alt: 'landing.capAltIndustrial', title: 'landing.capShotIndustrialTitle', body: 'landing.capShotIndustrialBody', wide: true },
  ];
  const points = ['basicPt1', 'basicPt2', 'basicPt6', 'basicPt3', 'basicPt4', 'basicPt5'];
  return <section className="sec sec--paper basic reveal" data-section="basic" id="basic" aria-labelledby="basic-title">
    <div className="wrap">
      <Eyebrow n="04" label={t('landing.ebBasic')} />
      <div className="mode-head"><h2 id="basic-title" className="display">{t('landing.basicH')}</h2><span className="badge badge-today">{t('landing.badgeToday')}</span></div>
      <p className="lead">{t('landing.basicP')}</p>
      <ul className="tick-list">{points.map((key) => <li key={key}>{t(`landing.${key}`)}</li>)}</ul>
      <div className="card-row cols-2 cap-shots">{shots.map((shot) => <article className={`card card-media${shot.wide ? ' card-wide' : ''}`} key={shot.base}>
        <Shot base={shot.base} w={shot.w} h={shot.h} alt={t(shot.alt)} sizes={shot.wide ? '(max-width: 760px) 92vw, 92vw' : undefined} />
        <div className="card-body"><h3>{t(shot.title)}</h3><p>{t(shot.body)}</p></div>
      </article>)}</div>
      <p className="mode-note">{t('landing.basicNote')}</p>
    </div>
  </section>;
}

export function LandingCapabilities() {
  const { t } = usePublicI18n();
  const columns = [
    { head: 'landing.capColLinear', items: ['capLin1','capLin2','capLin3','capLin4','capLin5','capLin6','capLin7','capLin8'] },
    { head: 'landing.capColNonlinear', items: ['capNl1','capNl2','capNl3','capNl4','capNl5','capNl6'] },
    { head: 'landing.capColElements', items: ['capEl1','capEl2','capEl3','capEl4','capEl5'] },
    { head: 'landing.capColTime', items: ['capTd1','capTd2','capTd3','capTd4'] },
  ];
  return <section className="sec sec--paper caps reveal" data-section="capabilities" id="capabilities" aria-labelledby="capabilities-title">
    <div className="wrap"><Eyebrow n="05" label={t('landing.ebCapabilities')} />
      <h2 id="capabilities-title" className="display">{t('landing.capH')}</h2><p className="lead">{t('landing.capP')}</p>
      <div className="cap-matrix">{columns.map((column) => <div className="cap-col" key={column.head}><p className="kicker">{t(column.head)}</p><ul>{column.items.map((key) => <li key={key}>{t(`landing.${key}`)}</li>)}</ul></div>)}</div>
    </div>
  </section>;
}

export function LandingValidation() {
  const { t } = usePublicI18n();
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => { void fetchGithubStars().then(setStars); }, []);
  const fmt = (value: number) => value.toLocaleString('en-US');
  return <section className="sec sec--ink validation reveal" data-section="validation" id="validation" aria-labelledby="validation-title">
    <div className="wrap"><Eyebrow n="06" label={t('landing.ebValidation')} /><h2 id="validation-title" className="display">{t('landing.valH')}</h2><p className="lead">{t('landing.valP')}</p>
      <p className="kicker">{t('landing.valAgainst')}</p><ul className="chip-row">{['NAFEMS', 'ANSYS', 'Code_Aster', 'SAP2000', 'OpenSees'].map((name) => <li className="chip chip-static" key={name}>{name}</li>)}<li className="chip chip-static">{t('landing.valBook')}</li></ul>
      <div className="stat-row">
        <div className="stat"><p className="stat-num">{fmt(5655)}</p><p className="stat-label">{t('landing.statTestsLbl')}</p><p className="stat-hint">{t('landing.statTestsHintNew')}</p></div>
        <div className="stat"><p className="stat-num">55</p><p className="stat-label">{t('landing.statExamplesLbl')}</p><p className="stat-hint">{t('landing.statExamplesHint')}</p></div>
        <a className="stat" href={REPO_URL} target="_blank" rel="noreferrer"><p className="stat-num">{stars == null ? '—' : fmt(stars)}</p><p className="stat-label">{t('landing.statStarsLbl')}</p><p className="stat-hint">{t('landing.statStarsHint')}</p></a>
        <div className="stat"><p className="stat-num stat-num-sm">AGPL-3.0</p><p className="stat-label">{t('landing.statLicenseLbl')}</p><p className="stat-hint">{t('landing.statLicenseHint')}</p></div>
      </div>
      <div className="card-row cols-2"><article className="card card-quiet"><h3>{t('landing.valPerfTitle')}</h3><p>{t('landing.valPerfBody')}</p></article><article className="card card-quiet"><h3>{t('landing.valLocalTitle')}</h3><p>{t('landing.valLocalBody')}</p></article></div>
    </div>
  </section>;
}

export function LandingCodes() {
  const { t } = usePublicI18n();
  const cirsoc = [
    { code: 'CIRSOC 101', ed: '2025', tone: 'today', badge: 'landing.badgeToday', scope: 'landing.cir101Scope', body: 'landing.cir101Body', limit: 'landing.cir101Limit' },
    { code: 'CIRSOC 102', ed: '2025', tone: 'today', badge: 'landing.badgeToday', scope: 'landing.cir102Scope', body: 'landing.cir102Body', limit: 'landing.cir102Limit' },
    { code: 'CIRSOC 201', ed: '2025', tone: 'testing', badge: 'landing.badgeTesting', scope: 'landing.cir201Scope', body: 'landing.cir201Body', limit: 'landing.cir201Limit' },
    { code: 'CIRSOC 301', ed: '2018', tone: 'partial', badge: 'landing.badgePartial', scope: 'landing.cir301Scope', body: 'landing.cir301Body', limit: 'landing.cir301Limit' },
    { code: 'INPRES-CIRSOC 103', ed: 'I 2018 · II 2005', tone: 'dev', badge: 'landing.badgeDev', scope: 'landing.cir103Scope', body: 'landing.cir103Body', limit: 'landing.cir103Limit' },
  ];
  const families = [
    { region: 'landing.codesRegionUs', codes: [{ code: 'AISC 360', key: 'landing.codeSteel' }, { code: 'ACI 318', key: 'landing.codeRc' }, { code: 'AISI S100', key: 'landing.codeCfs' }, { code: 'NDS · TMS 402', key: 'landing.codeTimberMasonry' }] },
    { region: 'landing.codesRegionEu', codes: [{ code: 'EN 1993-1-1', key: 'landing.codeEcSteel' }, { code: 'EN 1992-1-1', key: 'landing.codeEcConcrete' }] },
  ];
  return <section className="sec sec--paper codes reveal" data-section="codes" id="codes" aria-labelledby="codes-title"><div className="wrap">
    <Eyebrow n="07" label={t('landing.ebCodes')} /><h2 id="codes-title" className="display">{t('landing.codesH')}</h2><p className="lead">{t('landing.codesLead')}</p><p className="cirsoc-intro">{t('landing.cirsocP')}</p>
    <ul className="cirsoc-list">{cirsoc.map((code) => <li className="cirsoc-row" data-code={code.code} key={code.code}><div className="cirsoc-id"><p className="cirsoc-name">{code.code}</p><p className="cirsoc-ed">{code.ed}</p><span className={`badge badge-${code.tone}`}>{t(code.badge)}</span></div><div className="cirsoc-what"><h3>{t(code.scope)}</h3><p>{t(code.body)}</p><p className="cirsoc-limit">{t(code.limit)}</p></div></li>)}</ul>
    <div className="intl"><p className="kicker">{t('landing.codesIntlTitle')}</p><p className="intl-lead">{t('landing.codesIntlLead')}</p>{families.map((family) => <section className="intl-group" aria-labelledby={`intl-${family.region}`} key={family.region}><h3 id={`intl-${family.region}`} className="intl-region">{t(family.region)}</h3><ul className="code-grid">{family.codes.map((code) => <li className="code-cell" key={code.code}><p className="code-name">{code.code}</p><p className="code-desc">{t(code.key)}</p></li>)}</ul></section>)}</div>
  </div></section>;
}

function ModeSplit({ mode }: { mode: 'edu' | 'pro' }) {
  const { t } = usePublicI18n();
  const isEdu = mode === 'edu';
  const now = isEdu ? ['eduNow1','eduNow2','eduNow3','eduNow4','eduNow5','eduNow6','eduNow7'] : ['proNow1','proNow2','proNow3','proNow4','proNow5','proNow6','proNow7','proNow8'];
  const next = isEdu ? ['eduNext1','eduNext2','eduNext3','eduNext4','eduNext5','eduNext6'] : ['proNext1','proNext2','proNext3','proNext4','proNext5','proNext6','proNext7'];
  return <div className="split">
    <section className="split-col" aria-labelledby={`${mode}-now-title`}><p className="kicker">{t(`landing.${mode}NowKicker`)}</p><h3 id={`${mode}-now-title`}>{t(`landing.${mode}NowTitle${isEdu ? 'New' : ''}`)}</h3><ul className="tick-list">{now.map((key) => <li key={key}>{t(`landing.${key}`)}</li>)}</ul></section>
    <section className="split-col split-col-quiet" aria-labelledby={`${mode}-next-title`}><p className="kicker">{t(`landing.${mode}NextKicker`)}</p><h3 id={`${mode}-next-title`}>{t(`landing.${mode}NextTitle`)}</h3><ul className="status-list">{next.map((key) => <li key={key}>{t(`landing.${key}`)}</li>)}</ul></section>
  </div>;
}

export function LandingEducation() {
  const { t } = usePublicI18n();
  return <section className="sec sec--ink edu reveal" data-section="education" id="education" aria-labelledby="edu-title"><div className="wrap">
    <Eyebrow n="08" label={t('landing.ebEdu')} /><div className="mode-head"><h2 id="edu-title" className="display">{t('landing.eduH')}</h2><span className="badge badge-dev">{t('landing.badgeDev')}</span></div><p className="lead">{t('landing.eduP')}</p>
    <ModeSplit mode="edu" /><p className="mode-note">{t('landing.eduNotYet')}</p><p className="mode-commit">{t('landing.eduFree')}</p>
  </div></section>;
}

export function LandingPro() {
  const { t } = usePublicI18n();
  const shots = [
    { base: 'pro-building-model', w: 1600, h: 1192, alt: 'landing.proAltModel', title: 'landing.proShotModelTitle', body: 'landing.proShotModelBody' },
    { base: 'pro-building-axial', w: 1600, h: 1192, alt: 'landing.proAltAxial', title: 'landing.proShotAxialTitle', body: 'landing.proShotAxialBody' },
    { base: 'pro-rebar-3d', w: 1600, h: 834, alt: 'landing.proAltRebar', title: 'landing.proShotRebarTitle', body: 'landing.proShotRebarBody', wide: true },
  ];
  return <section className="sec sec--paper pro reveal" data-section="pro" id="pro" aria-labelledby="pro-title"><div className="wrap">
    <Eyebrow n="09" label={t('landing.ebPro')} /><div className="mode-head"><h2 id="pro-title" className="display">{t('landing.proH')}</h2><span className="badge badge-dev">{t('landing.badgeDev')}</span></div><p className="lead">{t('landing.proP')}</p><ModeSplit mode="pro" />
    <div className="card-row cols-2 cap-shots pro-shots">{shots.map((shot) => <article className={`card card-media${shot.wide ? ' card-wide' : ''}`} key={shot.base}><Shot base={shot.base} w={shot.w} h={shot.h} alt={t(shot.alt)} sizes={shot.wide ? '(max-width: 760px) 92vw, 92vw' : undefined} /><div className="card-body"><h3>{t(shot.title)}</h3><p>{t(shot.body)}</p></div></article>)}</div>
    <p className="mode-note">{t('landing.proShotsNote')}</p>
  </div></section>;
}

export function LandingThesis() {
  const { t } = usePublicI18n();
  const analogies = [{ k: 'landing.thAn1K', body: 'landing.thAn1' }, { k: 'landing.thAn2K', body: 'landing.thAn2' }, { k: 'landing.thAn3K', body: 'landing.thAn3' }];
  const future = ['aiFut1','aiFut2','aiFut3','aiFut4','aiFut5','aiFut6'];
  return <section className="sec sec--ink thesis reveal" data-section="thesis" id="thesis" aria-labelledby="thesis-title"><div className="wrap">
    <Eyebrow n="10" label={t('landing.ebThesis')} /><div className="mode-head"><h2 id="thesis-title" className="display">{t('landing.thH1')} <em>{t('landing.thH2')}</em></h2><span className="badge badge-dev">{t('landing.badgeDev')}</span></div><p className="lead lead-wide">{t('landing.thP')}</p>
    <div className="gv"><article className="gv-side"><p className="kicker kicker-blue">{t('landing.thGenK')}</p><h3>{t('landing.thGenT')}</h3><p>{t('landing.thGenB')}</p></article><p className="gv-arrow" aria-hidden="true">→</p><article className="gv-side"><p className="kicker kicker-accent">{t('landing.thVerK')}</p><h3>{t('landing.thVerT')}</h3><p>{t('landing.thVerB')}</p></article></div>
    <div className="analogies">{analogies.map((analogy) => <div className="analogy" key={analogy.k}><p className="kicker">{t(analogy.k)}</p><p>{t(analogy.body)}</p></div>)}</div><p className="mode-note">{t('landing.aiStatus')}</p>
    <section className="ai-future" aria-labelledby="ai-future-title"><p className="kicker">{t('landing.aiFutKicker')}</p><h3 id="ai-future-title">{t('landing.aiFutTitle')}</h3><ul className="status-list">{future.map((key) => <li key={key}>{t(`landing.${key}`)}</li>)}</ul></section><p className="thesis-close">{t('landing.thClose')}</p>
  </div></section>;
}

export function LandingStatus() {
  const { t } = usePublicI18n();
  const groups = [
    { badge: 'landing.badgeToday', tone: 'today', title: 'landing.stGroupToday', items: ['stT1','stT2','stT3','stT4','stT5','stT6','stT9','stT7','stT8'] },
    { badge: 'landing.badgePartial', tone: 'partial', title: 'landing.stGroupPartial', items: ['stPa1','stPa2','stPa5','stPa3','stPa4'] },
    { badge: 'landing.badgeDev', tone: 'dev', title: 'landing.stGroupDev', items: ['stD1','stD2','stD3','stD4'] },
    { badge: 'landing.badgeRoadmap', tone: 'roadmap', title: 'landing.stGroupRoadmap', items: ['stR1','stR2','stR3','stR4','stR5'] },
  ];
  return <section className="sec sec--paper status reveal" data-section="status" id="status" aria-labelledby="status-title"><div className="wrap">
    <Eyebrow n="11" label={t('landing.ebStatus')} /><h2 id="status-title" className="display">{t('landing.stH')}</h2><p className="lead">{t('landing.stP')}</p>
    <div className="status-groups">{groups.map((group) => <section className="status-group" aria-labelledby={`stg-${group.tone}`} key={group.tone}><header className="status-head"><span className={`badge badge-${group.tone}`}>{t(group.badge)}</span><h3 id={`stg-${group.tone}`}>{t(group.title)}</h3></header><ul className="status-list">{group.items.map((key) => <li key={key}>{t(`landing.${key}`)}</li>)}</ul></section>)}</div>
    <div className="access"><h3>{t('landing.accessT')}</h3><p>{t('landing.accessB')}</p><p>{t('landing.accessEdu')}</p><p className="access-note">{t('landing.accessNote')}</p></div>
  </div></section>;
}

export function LandingDocs() {
  const { t } = usePublicI18n();
  const cards = [{ href: QUICK_START_URL, title: 'landing.docsC1T', body: 'landing.docsC1B' }, { href: AI_WORKFLOW_URL, title: 'landing.docsC2T', body: 'landing.docsC2B' }, { href: SOLVER_REF_URL, title: 'landing.docsC3T', body: 'landing.docsC3B' }];
  return <section className="sec sec--ink docs reveal" data-section="docs" id="docs" aria-labelledby="docs-title"><div className="wrap"><Eyebrow n="12" label={t('landing.ebDocs')} /><h2 id="docs-title" className="display">{t('landing.docsH')}</h2><p className="lead">{t('landing.docsP')}</p><div className="card-row cols-3">{cards.map((card) => <a className="card card-link" href={card.href} target="_blank" rel="noreferrer" key={card.href}><h3>{t(card.title)}</h3><p>{t(card.body)}</p><span className="link-arrow">{t('landing.docsOpenNew')}</span></a>)}</div></div></section>;
}

export function LandingCTA() {
  const { t } = usePublicI18n();
  return <section className="sec sec--paper cta reveal" data-section="cta" aria-labelledby="cta-title"><div className="wrap cta-inner"><div><h2 id="cta-title" className="display">{t('landing.ctaH')}</h2><p className="lead">{t('landing.ctaP')}</p></div><div className="cta-actions"><button className="btn btn-primary btn-lg" onClick={enterApp}>{t('landing.heroCtaPrimary')}</button><a className="link-arrow" href={REPO_URL} target="_blank" rel="noreferrer">{t('landing.ctaSource')}</a></div></div></section>;
}

export function LandingBlog() {
  const { locale, t, tp } = usePublicI18n();
  const latest = POSTS[0];
  const body = latest?.i18n[locale];
  return <section className="sec sec--ink blog-cta reveal" data-section="blog" id="blog" aria-labelledby="blog-cta-title"><div className="wrap"><div className="blog-cta-inner"><p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" /><span className="eyebrow-label">{t('landing.blogEyebrow')}</span></p><h2 id="blog-cta-title" className="display">{t('landing.blogTitle')}</h2><p className="lead">{t('landing.blogBody')}</p>
    {latest && body && <article className="blog-latest"><p className="kicker">{t('landing.blogLatestKicker')}</p><h3><PublicLink to={`/blog/${latest.slug}`} className="blog-latest-title">{body.title}</PublicLink></h3><p className="blog-latest-meta">{formatPostDate(latest.date, locale)} <span aria-hidden="true">·</span> {tp('blog.readingTime', { n: readingMinutes(body) })}</p><p className="blog-latest-excerpt">{body.excerpt}</p><PublicLink to={`/blog/${latest.slug}`} className="link-arrow">{t('landing.blogReadLatest')}</PublicLink></article>}
    <div><PublicLink to="/blog" className="btn btn-primary">{t('landing.blogLink')}</PublicLink></div>
  </div></div></section>;
}

export function LandingFooter() {
  const { t } = usePublicI18n();
  return <><footer className="sec sec--ink lp-footer"><div className="wrap footer-grid"><div className="footer-brand"><span className="nav-logo" aria-hidden="true">S</span><div><p className="footer-name">Stabileo</p><p className="footer-tagline">{t('landing.footTagline')}</p></div></div><nav className="footer-links" aria-label={t('landing.footNav')}><a href={DOCS_HUB_URL} target="_blank" rel="noreferrer">{t('landing.footDocs')}</a><a href={REPO_URL} target="_blank" rel="noreferrer">{t('landing.footRepo')}</a><PublicLink to="/blog">{t('landing.footBlog')}</PublicLink><button onClick={enterApp}>{t('landing.footLaunch')}</button></nav></div><div className="wrap footer-legal"><p>© {new Date().getFullYear()} Stabileo. {t('landing.footRights')}</p></div></footer><div className="mobile-sticky"><button className="btn btn-primary" onClick={enterApp}>{t('landing.navOpenEditor')}</button></div></>;
}
