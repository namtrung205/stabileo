import { useEffect, useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../lib/i18n/store';
import { dsmStepsStore } from '../../lib/store';
import { useStoreRevision } from '../store/useStoreRevision';
import './DSMStepWizard.css';
import { Step7Solution } from './dsm/Step7Solution';
import { Step8Reactions } from './dsm/Step8Reactions';
import { Step4Assembly } from './dsm/Step4Assembly';
import { Step5LoadVector } from './dsm/Step5LoadVector';
import { Step6Partitioning } from './dsm/Step6Partitioning';
import { Step1DOFNumbering } from './dsm/Step1DOFNumbering';
import { Step2LocalMatrices } from './dsm/Step2LocalMatrices';
import { Step3Transformation } from './dsm/Step3Transformation';
import { Step9InternalForces } from './dsm/Step9InternalForces';
import { MatrixExplorer } from './dsm/MatrixExplorer';

/** React-owned navigation shell for the Basic direct-stiffness-method walkthrough. */
export function DSMStepWizard() {
  useStoreRevision(dsmStepsStore);
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [showExplorer, setShowExplorer] = useState(false);
  const data = dsmStepsStore.stepData;
  const is3D = data ? data.dofNumbering.dofsPerNode > 3 : false;

  const close = () => {
    dsmStepsStore.close();
    setTimeout(() => window.dispatchEvent(new Event('stabileo-zoom-to-fit')), 100);
  };

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        dsmStepsStore.nextStep();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        dsmStepsStore.prevStep();
      } else if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const stepContent = () => {
    if (!data) return null;
    const editable = dsmStepsStore.quizMode;
    switch (dsmStepsStore.currentStep) {
      case 1: return <Step1DOFNumbering data={data} />;
      case 2: return <Step2LocalMatrices data={data} editable={editable} />;
      case 3: return <Step3Transformation data={data} editable={editable} />;
      case 4: return <Step4Assembly data={data} editable={editable} />;
      case 5: return <Step5LoadVector data={data} />;
      case 6: return <Step6Partitioning data={data} editable={editable} />;
      case 7: return <Step7Solution data={data} />;
      case 8: return <Step8Reactions data={data} />;
      case 9: return <Step9InternalForces data={data} />;
      default: return null;
    }
  };

  return <div className="wizard react-dsm-wizard">
    <div className="wizard-header">
      <span className="wizard-title">{showExplorer ? t('dsm.matrixExplorer') : t('dsm.wizardTitle')}</span>
      <button className={`explorer-toggle${showExplorer ? ' active' : ''}`} onClick={() => setShowExplorer((value) => !value)} title={showExplorer ? t('dsm.backToSteps') : t('dsm.matrixExplorer')}>
        {showExplorer ? t('dsm.stepsBtn') : t('dsm.explorerBtn')}
      </button>
      <button className="close-btn" onClick={close}>✕</button>
    </div>

    {showExplorer ? <div className="step-content">
      {data && <MatrixExplorer data={data} editable={dsmStepsStore.quizMode} />}
    </div> : <>
      <div className="step-indicator">
        {Array.from({ length: 9 }, (_, index) => index + 1).map((step) => <button className={`step-dot${dsmStepsStore.currentStep === step ? ' active' : ''}${dsmStepsStore.currentStep > step ? ' past' : ''}`} onClick={() => dsmStepsStore.goToStep(step)} title={`${step}. ${t(`dsm.step${step}Name`)}`} key={step}>{step}</button>)}
      </div>
      <div className="step-name">{t('dsm.step').replace('{n}', String(dsmStepsStore.currentStep)).replace('{name}', t(`dsm.step${dsmStepsStore.currentStep}Name`))}</div>
      {is3D ? <div className="mode-banner mode-3d">{t('dsm.mode3dBanner')}</div> : <div className="mode-banner mode-2d">{data?.dofNumbering.dofsPerNode === 2 ? t('dsm.mode2dBanner2dof') : t('dsm.mode2dBanner3dof')}</div>}
      <div className="step-content">{stepContent()}</div>
      <div className="wizard-footer">
        <button className="nav-btn" disabled={dsmStepsStore.currentStep === 1} onClick={() => dsmStepsStore.prevStep()}>{t('dsm.prev')}</button>
        <span className="step-counter">{dsmStepsStore.currentStep} / 9</span>
        <button className="nav-btn" disabled={dsmStepsStore.currentStep === 9} onClick={() => dsmStepsStore.nextStep()}>{t('dsm.next')}</button>
      </div>
    </>}
  </div>;
}
