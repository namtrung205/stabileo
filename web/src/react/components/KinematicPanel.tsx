import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { generateKinematicReport, type KinematicReport, type SlidingJointInput } from '../../lib/engine/kinematic-report';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { modelStore, uiStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './KinematicPanel.css';

type Props = { docked?: boolean };

/** React owner for the Basic kinematic report, in docked and floating layouts. */
export function KinematicPanel({ docked = false }: Props) {
  useStoreRevision(modelStore);
  useStoreRevision(uiStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);

  const [showStep1, setShowStep1] = useState(true);
  const [showStep2, setShowStep2] = useState(true);
  const [showStep3, setShowStep3] = useState(true);
  const [showBarAnalysis, setShowBarAnalysis] = useState(false);
  const [showStep4, setShowStep4] = useState(true);
  const [expandedElems, setExpandedElems] = useState<Set<number>>(() => new Set());
  const [report, setReport] = useState<KinematicReport | null>(null);
  const [lastAnalyzedVersion, setLastAnalyzedVersion] = useState(-1);
  const rankRetries = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const is3D = uiStore.analysisMode === '3d';
  const isStale = report !== null && modelStore.modelVersion !== lastAnalyzedVersion;

  const recompute = useCallback(() => {
    const input = modelStore.buildSolverInput(false);
    if (!input) {
      setReport(null);
      return;
    }
    const slidingJoints: SlidingJointInput[] = [];
    for (const element of modelStore.elements.values()) {
      if (element.releaseI?.slide) slidingJoints.push({
        elemId: element.id,
        end: 'I',
        kind: element.releaseI.slide,
        axis: element.releaseI.slideAxis ?? 'global',
      });
      if (element.releaseJ?.slide) slidingJoints.push({
        elemId: element.id,
        end: 'J',
        kind: element.releaseJ.slide,
        axis: element.releaseJ.slideAxis ?? 'global',
      });
    }
    const next = generateKinematicReport(input, slidingJoints);
    setReport(next);
    setLastAnalyzedVersion(modelStore.modelVersion);

    if (next && !next.rankChecked && rankRetries.current < 40) {
      rankRetries.current += 1;
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        if (uiStore.showKinematicPanel) recompute();
      }, 250);
    }
  }, []);

  useEffect(() => {
    if (!uiStore.showKinematicPanel) {
      setReport(null);
      setLastAnalyzedVersion(-1);
      rankRetries.current = 0;
      if (retryTimer.current !== null) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      return;
    }
    if (lastAnalyzedVersion === -1) {
      rankRetries.current = 0;
      recompute();
    } else if (uiStore.liveCalc && modelStore.modelVersion !== lastAnalyzedVersion) {
      recompute();
    }
  }, [uiStore.showKinematicPanel, uiStore.liveCalc, modelStore.modelVersion, lastAnalyzedVersion, recompute]);

  useEffect(() => () => {
    if (retryTimer.current !== null) clearTimeout(retryTimer.current);
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && uiStore.showKinematicPanel) uiStore.showKinematicPanel = false;
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  if (!uiStore.showKinematicPanel) return null;

  const toggleElement = (elementId: number) => setExpandedElems((current) => {
    const next = new Set(current);
    if (next.has(elementId)) next.delete(elementId); else next.add(elementId);
    return next;
  });
  const toggleNodeLabels = () => {
    if (is3D) uiStore.showNodeLabels3D = !uiStore.showNodeLabels3D;
    else uiStore.showNodeLabels = !uiStore.showNodeLabels;
  };
  const toggleElementLabels = () => {
    if (is3D) uiStore.showElementLabels3D = !uiStore.showElementLabels3D;
    else uiStore.showElementLabels = !uiStore.showElementLabels;
  };
  const toggleLoads = () => {
    if (is3D) uiStore.showLoads3D = !uiStore.showLoads3D;
    else uiStore.showLoads = !uiStore.showLoads;
  };

  return <div className={`kp-panel${docked ? ' docked' : ''}`}>
    <div className="kp-header">
      <span className="kp-title">{t('kinematic.title')}</span>
      <div className="kp-header-actions">
        <button className={`kp-quick-btn${(is3D ? uiStore.showNodeLabels3D : uiStore.showNodeLabels) ? ' kp-quick-active' : ''}`} title={t('kinematic.toggleNodeIds')} onClick={toggleNodeLabels}>N</button>
        <button className={`kp-quick-btn${(is3D ? uiStore.showElementLabels3D : uiStore.showElementLabels) ? ' kp-quick-active' : ''}`} title={t('kinematic.toggleElementIds')} onClick={toggleElementLabels}>E</button>
        <button className={`kp-quick-btn${(is3D ? uiStore.showLoads3D : uiStore.showLoads) ? ' kp-quick-active' : ''}`} title={t('kinematic.toggleLoads')} onClick={toggleLoads}>Q</button>
        <button className="kp-close" onClick={() => { uiStore.showKinematicPanel = false; }} title={t('kinematic.close')}>&times;</button>
      </div>
    </div>

    {!report ? <div className="kp-body"><p className="kp-empty">{t('kinematic.empty')}</p></div> : <div className="kp-body">
      {isStale && <button className="kp-stale-btn" data-testid="kin-stale" onClick={recompute}>{t('kinematic.stale')}</button>}

      <button className="kp-section-toggle" onClick={() => setShowStep1((value) => !value)}>
        <span className="kp-chevron">{showStep1 ? '▾' : '▸'}</span>{t('kinematic.step1Title')}
      </button>
      {showStep1 && <div className="kp-section">
        <div className="kp-explanation" style={{ marginBottom: '0.3rem' }}>{t('kinematic.step1Vars')}</div>
        <div className="kp-row"><span className="kp-label"><strong>n</strong> {t('kinematic.nodes')}</span><span className="kp-value">{report.nNodes}</span></div>
        {report.nFrames > 0 && <div className="kp-row"><span className="kp-label"><strong>{report.nTrusses > 0 ? 'm_p' : 'm'}</strong> {t('kinematic.rigidBars')}</span><span className="kp-value">{report.nFrames}</span></div>}
        {report.nTrusses > 0 && <div className="kp-row"><span className="kp-label"><strong>{report.isPureTruss ? 'm' : 'm_r'}</strong> {t('kinematic.trussBars')}</span><span className="kp-value">{report.nTrusses}</span></div>}
        {report.supportDetails.length > 0 ? <>
          <div className="kp-row" style={{ marginTop: '0.2rem' }}><span className="kp-label"><strong>r</strong> {t('kinematic.supportReactions')}</span><span className="kp-value">{report.totalR}</span></div>
          {report.supportDetails.map((support, index) => <div className="kp-detail" key={`${support.nodeId}-${index}`}>{t('kinematic.nodeDetail').replaceAll('{id}', String(support.nodeId)).replaceAll('{type}', support.type).replaceAll('{dofs}', String(support.dofs)).replaceAll('{restrained}', support.restrainedDofs)}</div>)}
        </> : <div className="kp-detail kp-danger-text">{t('kinematic.noSupports')}</div>}
        {report.hingeDetails.length > 0 || report.slideDetails.length > 0 ? <>
          <div className="kp-row" style={{ marginTop: '0.2rem' }}><span className="kp-label"><strong>c</strong> {t('kinematic.internalConditions')}</span><span className="kp-value">{report.totalC}</span></div>
          {report.hingeDetails.map((hinge, index) => <div className="kp-detail" key={`hinge-${hinge.nodeId}-${index}`}>{t('kinematic.nodeHingeDetail').replaceAll('{id}', String(hinge.nodeId)).replaceAll('{explanation}', hinge.explanation)}</div>)}
          {report.slideDetails.map((slide, index) => <div className="kp-detail" key={`slide-${index}`}>{slide.explanation}</div>)}
          {report.slideDetails.length > 0 && <div className="kp-detail kp-muted">{t('kinematic.slideAxisNote')}</div>}
        </> : !report.isPureTruss && <div className="kp-detail kp-muted">{t('kinematic.noHinges')}</div>}
      </div>}

      <button className="kp-section-toggle" onClick={() => setShowStep2((value) => !value)}>
        <span className="kp-chevron">{showStep2 ? '▾' : '▸'}</span>{t('kinematic.step2Title')}
      </button>
      {showStep2 && <div className="kp-section">
        <div className="kp-formula">{report.formula}</div>
        <div className="kp-formula kp-formula-sub">{report.substitution}</div>
        <div className={`kp-badge ${report.classification === 'hyperstatic' ? 'kp-ok' : report.classification === 'isostatic' ? 'kp-warn' : 'kp-danger'}`}>g = {report.degree}</div>
        <div className="kp-explanation">{report.classificationText}</div>
      </div>}

      <button className="kp-section-toggle" onClick={() => setShowStep3((value) => !value)}>
        <span className="kp-chevron">{showStep3 ? '▾' : '▸'}</span>{t('kinematic.step3Title')}
      </button>
      {showStep3 && <div className="kp-section">
        <div className="kp-explanation" dangerouslySetInnerHTML={{ __html: t('kinematic.matrixExplanation').replaceAll('{n}', String(report.nFreeDofs)) }} />
        {!report.rankChecked ? <div className="kp-result kp-warn-bg">{t('kinematic.rankUnavailable')}</div>
          : report.mechanismModes === 0 ? <div className="kp-result kp-ok-bg">{t('kinematic.noMechanisms')}</div>
          : report.hasHiddenMechanism ? <><div className="kp-result kp-danger-bg">{t('kinematic.hiddenMechanism').replaceAll('{n}', String(report.mechanismModes)).replaceAll('{s}', report.mechanismModes > 1 ? 's' : '').replaceAll('{degree}', String(report.degree))}</div><div className="kp-explanation">{t('kinematic.hiddenMechanismExplanation')}</div></>
          : <div className="kp-result kp-danger-bg">{t('kinematic.mechanismDetected').replaceAll('{n}', String(report.mechanismModes)).replaceAll('{s}', report.mechanismModes > 1 ? 's' : '')}</div>}
        {report.unconstrainedDofs.length > 0 && <>
          <div className="kp-sub-title">{t('kinematic.freeMovements')}</div>
          {report.unconstrainedDofs.map((dof, index) => <div className="kp-unconstrained" key={`${dof.nodeId}-${dof.dofName}-${index}`}>
            <span className="kp-dof-badge">{t('kinematic.nodeDof').replaceAll('{id}', String(dof.nodeId)).replaceAll('{dofName}', dof.dofName)}</span>
            <div className="kp-dof-explanation">{dof.explanation}</div>
          </div>)}
        </>}
        {report.elementAnalysis.length > 0 && <>
          <button className="kp-sub-toggle" onClick={() => setShowBarAnalysis((value) => !value)}><span className="kp-chevron">{showBarAnalysis ? '▾' : '▸'}</span>{t('kinematic.barByBarAnalysis')}</button>
          {showBarAnalysis && <div className="kp-sub-section">{report.elementAnalysis.map((analysis) => {
            const expanded = expandedElems.has(analysis.elemId);
            const stateClass = analysis.status === 'isostatic' ? 'kp-elem-ok' : analysis.status === 'hyperstatic' ? 'kp-elem-hyper' : 'kp-elem-mech';
            const badgeClass = analysis.status === 'isostatic' ? 'kp-elem-badge-ok' : analysis.status === 'hyperstatic' ? 'kp-elem-badge-hyper' : 'kp-elem-badge-mech';
            const status = analysis.status === 'isostatic' ? t('kinematic.statusIsostatic') : analysis.status === 'hyperstatic' ? t('kinematic.statusHyperstatic') : t('kinematic.statusMechanism');
            return <div className={`kp-elem-card ${stateClass}`} key={analysis.elemId}>
              <button className="kp-elem-toggle" onClick={() => toggleElement(analysis.elemId)}>
                <span className="kp-elem-toggle-left"><span className="kp-chevron">{expanded ? '▾' : '▸'}</span>{t('kinematic.bar').replaceAll('{id}', String(analysis.elemId))} <span className="kp-elem-type">({analysis.type === 'frame' ? t('kinematic.rigid') : t('kinematic.truss')})</span></span>
                <span className={`kp-elem-badge ${badgeClass}`}>{status}</span>
              </button>
              {expanded && <div className="kp-elem-body">
                {analysis.dofBreakdown.lines.map((line, index) => <div className={`kp-dof-line${line.sources.length === 0 ? ' kp-dof-free' : ''}`} key={`${line.dof}-${index}`}>
                  <span className="kp-dof-label">{line.dof}</span>
                  {line.sources.length === 0 ? <span className="kp-dof-none">{t('kinematic.noRestriction')}</span> : <><span className="kp-dof-arrow">←</span><span className="kp-dof-sources">{line.displayText}</span></>}
                </div>)}
                <div className="kp-elem-summary">{analysis.dofBreakdown.summary}</div>
              </div>}
            </div>;
          })}</div>}
        </>}
      </div>}

      {report.suggestions.length > 0 && <>
        <button className="kp-section-toggle" onClick={() => setShowStep4((value) => !value)}><span className="kp-chevron">{showStep4 ? '▾' : '▸'}</span>{t('kinematic.step4Title')}</button>
        {showStep4 && <div className="kp-section"><ul className="kp-suggestions">{report.suggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}</ul></div>}
      </>}
      <div className="kp-footer"><span className={`kp-status ${report.isSolvable ? 'kp-ok-text' : 'kp-danger-text'}`}>{report.isSolvable ? t('kinematic.stableResult') : t('kinematic.mechanismResult')}</span></div>
    </div>}
  </div>;
}
