import { useEffect, useMemo, useRef, useState } from 'react';
import { resultsStore, modelStore, uiStore, historyStore } from '../../lib/store';
import { t, i18n } from '../../lib/i18n';
import {
  reviewModel,
  buildArtifact,
  buildModel,
  buildModelContext,
  type ReviewModelResponse,
  type ReviewFinding,
  type ConversationMessage,
  type SolverDiagnosticMsg,
} from '../../lib/ai/client';
import { runGlobalSolve } from '../../lib/engine/live-calc';
import type { ModelSnapshot } from '../../lib/store/history';
import {
  compactSnapshotForAi,
  isValidReleaseShape,
  normalizeSnapshotReleases,
} from '../../lib/ai/build-model';
import { useStoreRevision } from '../store/useStoreRevision';
import './AiDrawer.css';

type AiTab = 'review' | 'explain' | 'query' | 'build';

interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  text: string;
  meta?: { modelUsed: string; latencyMs: number; tokens: number };
  isBuilding?: boolean;
  changeSummary?: string;
  rawAiResponse?: string;
  draft?: Record<string, unknown>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_CHAT_HISTORY = 50;

function validateSnapshot(snapshot: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const nodes = snapshot.nodes as Array<[number, { id: number; x: number; y: number; z?: number }]> | undefined;
  const elements = snapshot.elements as Array<[number, { id: number; nodeI: number; nodeJ: number }]> | undefined;
  const supports = snapshot.supports as Array<[number, { id: number; nodeId: number; type: string }]> | undefined;
  const materials = snapshot.materials as Array<[number, unknown]> | undefined;
  const sections = snapshot.sections as Array<[number, unknown]> | undefined;

  if (!Array.isArray(nodes) || nodes.length < 2) errors.push('Model must have at least 2 nodes');
  if (!Array.isArray(elements) || elements.length < 1) errors.push('Model must have at least 1 element');
  if (!Array.isArray(supports) || supports.length < 1) errors.push('Model must have at least 1 support');
  if (!Array.isArray(materials) || materials.length < 1) errors.push('Model must have at least 1 material');
  if (!Array.isArray(sections) || sections.length < 1) errors.push('Model must have at least 1 section');
  if (errors.length > 0 || !nodes || !elements || !supports) return { valid: false, errors };

  const nodeIds = new Set(nodes.map(([id]) => id));
  const elementIds = new Set(elements.map(([id]) => id));
  for (const [id, element] of elements) {
    if (!nodeIds.has(element.nodeI)) errors.push(`Element ${id} references non-existent node ${element.nodeI}`);
    if (!nodeIds.has(element.nodeJ)) errors.push(`Element ${id} references non-existent node ${element.nodeJ}`);
    const releases = element as unknown as { releaseI?: unknown; releaseJ?: unknown };
    if (!isValidReleaseShape(releases.releaseI)) errors.push(`Element ${id} has an invalid releaseI shape`);
    if (!isValidReleaseShape(releases.releaseJ)) errors.push(`Element ${id} has an invalid releaseJ shape`);
  }
  for (const [id, support] of supports) {
    if (!nodeIds.has(support.nodeId)) errors.push(`Support ${id} references non-existent node ${support.nodeId}`);
  }

  const loads = snapshot.loads as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(loads)) {
    for (const load of loads) {
      const data = (load.data as Record<string, unknown>) ?? load;
      if (data.elementId && !elementIds.has(data.elementId as number)) {
        errors.push(`Load references non-existent element ${data.elementId}`);
      }
      if (data.nodeId && !nodeIds.has(data.nodeId as number)) {
        errors.push(`Load references non-existent node ${data.nodeId}`);
      }
    }
  }
  for (const [id, node] of nodes) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) errors.push(`Node ${id} has invalid coordinates`);
  }
  return { valid: errors.length === 0, errors };
}

function severityColor(severity: string): string {
  if (severity === 'error') return '#e94560';
  if (severity === 'warning') return '#f0a500';
  if (severity === 'info') return '#4fc3f7';
  return '#aaa';
}

function severityLabel(severity: string): string {
  if (severity === 'error') return 'ERR';
  if (severity === 'warning') return 'WARN';
  if (severity === 'info') return 'INFO';
  return severity.toUpperCase().slice(0, 4);
}

function riskColor(risk: string): string {
  if (risk === 'high' || risk === 'critical') return '#e94560';
  if (risk === 'medium') return '#f0a500';
  if (risk === 'low') return '#4caf50';
  return '#aaa';
}

export function AiDrawer() {
  useStoreRevision(uiStore);
  useStoreRevision(modelStore);
  useStoreRevision(resultsStore);

  const [activeTab, setActiveTab] = useState<AiTab>('build');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewResponse, setReviewResponse] = useState<ReviewModelResponse | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [lastDescription, setLastDescription] = useState('');
  const [pendingDraft, setPendingDraft] = useState<Record<string, unknown> | null>(null);
  const [justApplied, setJustApplied] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [lastSolverDiagnostics, setLastSolverDiagnostics] = useState<SolverDiagnosticMsg[]>([]);
  const chatContainer = useRef<HTMLDivElement>(null);
  const abortController = useRef<AbortController | null>(null);

  const is3DMode = uiStore.analysisMode === '3d' || uiStore.analysisMode === 'pro';
  const aiAnalysisMode = is3DMode ? '3d' : '2d';
  const hasResults = is3DMode ? resultsStore.results3D !== null : resultsStore.results !== null;
  const hasModelOnCanvas = modelStore.nodes.size > 0 && modelStore.elements.size > 0;

  const appendMessages = (...messages: ChatMessage[]) => {
    setChatMessages((current) => [...current, ...messages].slice(-MAX_CHAT_HISTORY));
  };

  useEffect(() => {
    const node = chatContainer.current;
    if (!node) return;
    const handle = window.setTimeout(() => { node.scrollTop = node.scrollHeight; }, 50);
    return () => window.clearTimeout(handle);
  }, [chatMessages, buildError]);

  useEffect(() => () => abortController.current?.abort(), []);

  const currentSnapshot = () => compactSnapshotForAi(
    modelStore.snapshot() as unknown as Record<string, unknown>,
  );

  function fastRebuild(snapshot: ModelSnapshot) {
    const snapshotMode = (snapshot as ModelSnapshot & { analysisMode?: string }).analysisMode;
    const snapshotIs3D = snapshotMode === '3d' || snapshotMode === 'pro';
    if (snapshotIs3D && !is3DMode) uiStore.analysisMode = '3d';
    else if (snapshotMode === '2d' && is3DMode) uiStore.analysisMode = '2d';
    resultsStore.clear();
    modelStore.restore(snapshot);
    const canvas = document.querySelector('.viewport-container canvas') as HTMLCanvasElement | null;
    if (canvas && modelStore.nodes.size > 0) {
      uiStore.zoomToFit(modelStore.nodes.values(), canvas.width, canvas.height);
    }
  }

  async function handleBuildSend(descriptionOverride?: string) {
    const text = (descriptionOverride ?? chatInput).trim();
    if (!text || buildLoading) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
      setBuildError(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`);
      return;
    }
    if (!descriptionOverride) setChatInput('');
    setBuildError(null);
    setJustApplied(false);
    setPendingDraft(null);
    if (!descriptionOverride) appendMessages({ role: 'user', text });
    setLastDescription(text);

    const lower = text.toLowerCase();
    if (/\b(clean|clear|reset|limpiar|borrar|vaciar)\b/.test(lower)
      && !/\b(beam|frame|truss|viga|pórtico|portico|cantilever)\b/.test(lower)) {
      historyStore.pushState();
      resultsStore.clear();
      modelStore.clear();
      appendMessages({ role: 'system', text: 'Model cleared.' });
      return;
    }

    appendMessages({ role: 'ai', text: 'Building...', isBuilding: true });
    setBuildLoading(true);
    const controller = new AbortController();
    abortController.current = controller;
    try {
      const context = hasModelOnCanvas ? buildModelContext(modelStore) : undefined;
      const snapshot = hasModelOnCanvas ? currentSnapshot() : undefined;
      const response = await buildModel(
        text,
        i18n.locale,
        aiAnalysisMode,
        context,
        snapshot,
        conversationHistory.length > 0 ? conversationHistory : undefined,
        undefined,
        controller.signal,
      );
      setChatMessages((current) => current.filter((message) => !message.isBuilding));
      setConversationHistory((current) => [
        ...current,
        { role: 'user', content: text },
        { role: 'assistant', content: response.message || response.rawAiResponse || '' },
      ]);
      const snap = response.snapshot;
      const hasStructure = snap && typeof snap === 'object'
        && Array.isArray(snap.nodes) && snap.nodes.length > 0
        && Array.isArray(snap.elements) && snap.elements.length > 0;
      if (response.scopeRefusal || !hasStructure) {
        appendMessages({
          role: 'ai',
          text: response.message || 'Try describing a structure to build.',
          rawAiResponse: response.rawAiResponse,
          meta: {
            modelUsed: response.meta.modelUsed,
            latencyMs: response.meta.latencyMs,
            tokens: response.meta.inputTokens + response.meta.outputTokens,
          },
        });
        return;
      }
      const validation = validateSnapshot(snap);
      if (!validation.valid) {
        appendMessages(
          { role: 'ai', text: response.message || 'The generated model has issues.' },
          { role: 'system', text: `Validation failed:\n${validation.errors.join('\n')}` },
        );
        return;
      }
      const normalized = normalizeSnapshotReleases(snap);
      historyStore.pushState();
      fastRebuild(normalized as unknown as ModelSnapshot);
      setPendingDraft(normalized);
      appendMessages({
        role: 'ai',
        text: response.message,
        changeSummary: response.changeSummary,
        rawAiResponse: response.rawAiResponse,
        draft: normalized,
        meta: {
          modelUsed: response.meta.modelUsed,
          latencyMs: response.meta.latencyMs,
          tokens: response.meta.inputTokens + response.meta.outputTokens,
        },
      });
    } catch (error) {
      setChatMessages((current) => current.filter((message) => !message.isBuilding));
      const message = error instanceof Error ? error.message : 'Failed to build model';
      if (error instanceof Error && error.name === 'AbortError') {
        appendMessages({ role: 'system', text: 'Request cancelled.' });
      } else {
        appendMessages({
          role: 'ai',
          text: message.includes('Could not generate')
            ? 'I can build: beams, cantilevers, continuous beams, portal frames, trusses, and 3D frames. Try describing a structure, e.g. "simply supported beam, 6m, 10 kN/m".'
            : message,
        });
      }
    } finally {
      setBuildLoading(false);
      abortController.current = null;
    }
  }

  async function handleApply() {
    if (!pendingDraft) return;
    await runGlobalSolve();
    setPendingDraft(null);
    setJustApplied(true);
    const result = is3DMode ? resultsStore.results3D : resultsStore.results;
    const diagnostics = ((result as { solverDiagnostics?: SolverDiagnosticMsg[] } | null)?.solverDiagnostics ?? [])
      .filter((diagnostic) => diagnostic.severity === 'error' || diagnostic.severity === 'warning')
      .map((diagnostic) => ({ code: diagnostic.code, severity: diagnostic.severity, message: diagnostic.message }));
    setLastSolverDiagnostics(diagnostics);
    appendMessages({
      role: 'system',
      text: diagnostics.length > 0
        ? `Model applied and solved. ${diagnostics.length} issue(s) found.`
        : 'Model applied and solved.',
    });
  }

  function handleCancel() {
    historyStore.undo();
    setPendingDraft(null);
    appendMessages({ role: 'system', text: 'Draft discarded.' });
  }

  function handleRetry() {
    historyStore.undo();
    setPendingDraft(null);
    if (lastDescription) void handleBuildSend(lastDescription);
  }

  async function handleFixIssues() {
    if (lastSolverDiagnostics.length === 0 || buildLoading) return;
    setBuildLoading(true);
    setBuildError(null);
    setJustApplied(false);
    appendMessages(
      { role: 'user', text: 'Fix the solver issues' },
      { role: 'ai', text: 'Fixing...', isBuilding: true },
    );
    try {
      const context = hasModelOnCanvas ? buildModelContext(modelStore) : undefined;
      const snapshot = hasModelOnCanvas ? currentSnapshot() : undefined;
      const response = await buildModel(
        'Fix the solver issues in this model',
        i18n.locale,
        aiAnalysisMode,
        context,
        snapshot,
        conversationHistory.length > 0 ? conversationHistory : undefined,
        lastSolverDiagnostics,
      );
      setChatMessages((current) => current.filter((message) => !message.isBuilding));
      setConversationHistory((current) => [
        ...current,
        { role: 'user', content: 'Fix the solver issues' },
        { role: 'assistant', content: response.message || response.rawAiResponse || '' },
      ]);
      const snap = response.snapshot;
      const hasStructure = snap && typeof snap === 'object'
        && Array.isArray(snap.nodes) && snap.nodes.length > 0
        && Array.isArray(snap.elements) && snap.elements.length > 0;
      if (response.scopeRefusal || !hasStructure) {
        appendMessages({
          role: 'ai',
          text: response.message || 'Could not fix the issues automatically.',
          meta: response.meta ? {
            modelUsed: response.meta.modelUsed,
            latencyMs: response.meta.latencyMs,
            tokens: response.meta.inputTokens + response.meta.outputTokens,
          } : undefined,
        });
        return;
      }
      const validation = validateSnapshot(snap);
      if (!validation.valid) {
        appendMessages(
          { role: 'ai', text: response.message || 'Fixed model has issues.' },
          { role: 'system', text: `Validation failed:\n${validation.errors.join('\n')}` },
        );
        return;
      }
      const normalized = normalizeSnapshotReleases(snap);
      historyStore.pushState();
      fastRebuild(normalized as unknown as ModelSnapshot);
      setPendingDraft(normalized);
      setLastSolverDiagnostics([]);
      appendMessages({
        role: 'ai',
        text: response.message,
        changeSummary: response.changeSummary,
        rawAiResponse: response.rawAiResponse,
        draft: normalized,
        meta: response.meta ? {
          modelUsed: response.meta.modelUsed,
          latencyMs: response.meta.latencyMs,
          tokens: response.meta.inputTokens + response.meta.outputTokens,
        } : undefined,
      });
    } catch (error) {
      setChatMessages((current) => current.filter((message) => !message.isBuilding));
      appendMessages({ role: 'ai', text: error instanceof Error ? error.message : 'Failed to fix issues' });
    } finally {
      setBuildLoading(false);
    }
  }

  async function handleReview() {
    setReviewLoading(true);
    setReviewError(null);
    try {
      const result = is3DMode ? resultsStore.results3D : resultsStore.results;
      if (!result) {
        setReviewError(t('ai.noResults'));
        return;
      }
      // The review artifact intentionally consumes only the common 2D/3D
      // displacement/reaction/force subset; both solver result shapes provide it.
      const artifact = buildArtifact(result as unknown as Parameters<typeof buildArtifact>[0], modelStore.nodes.size, modelStore.elements.size);
      setReviewResponse(await reviewModel(artifact, i18n.locale));
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : t('ai.unknownError'));
    } finally {
      setReviewLoading(false);
    }
  }

  function handleFindingClick(finding: ReviewFinding, index: number) {
    setExpandedFinding((current) => current === index ? null : index);
    if (finding.affectedIds.length === 0) return;
    const nodeIds = new Set<number>();
    const elementIds = new Set<number>();
    for (const id of finding.affectedIds) {
      if (modelStore.nodes.has(id)) nodeIds.add(id);
      if (modelStore.elements.has(id)) elementIds.add(id);
    }
    uiStore.setSelection(nodeIds, elementIds);
  }

  const emptyPrompts = useMemo(() => hasModelOnCanvas
    ? ['Describe a structure or change', 'Try: "add one bay on the right"', 'Or: "add a story"', 'Or: "change all beams to IPE 400"', 'Or: "build a new 3-story frame"']
    : ['Describe a structure', 'Try: "simply supported beam, 6m, 10 kN/m"', 'Or: "portal frame, 8m span, 5m height"', 'Or: "build a bridge with two piers"'], [hasModelOnCanvas]);

  if (uiStore.isMobile || uiStore.embedMode) return null;
  if (!uiStore.aiDrawerOpen) {
    return <button className="ai-fab react-ai-fab" onClick={() => { uiStore.aiDrawerOpen = true; }} title="Stabileo AI">△</button>;
  }

  return (
    <aside className="ai-drawer react-ai-drawer">
      <div className="drawer-header">
        <span className="drawer-title">Stabileo AI</span>
        <button className="close-btn" onClick={() => { uiStore.aiDrawerOpen = false; }} title="Close">×</button>
      </div>
      <div className="tab-bar">
        {(['build', 'review', 'explain', 'query'] as const).map((tab) => (
          <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'review' && (
        <div className="drawer-body">
          {!reviewResponse && !reviewLoading && <>
            <button className="action-btn" disabled={!hasResults} onClick={() => void handleReview()}>{t('ai.reviewModel')}</button>
            {!hasResults && <p className="hint">{t('ai.solveFirst')}</p>}
          </>}
          {reviewLoading && <div className="loading-state"><span className="spinner"/><span className="loading-text">{t('ai.reviewing')}</span></div>}
          {reviewError && <div className="error-box">{reviewError}</div>}
          {reviewResponse && (
            <div className="results">
              <div className="risk-row">
                <div className="risk-chip" style={{ background: `${riskColor(reviewResponse.riskLevel)}20`, borderColor: riskColor(reviewResponse.riskLevel) }}>
                  <span className="risk-dot" style={{ background: riskColor(reviewResponse.riskLevel) }}/>
                  <span className="risk-text" style={{ color: riskColor(reviewResponse.riskLevel) }}>{reviewResponse.riskLevel.toUpperCase()}</span>
                </div>
                <button className="regen-btn" onClick={() => void handleReview()} disabled={reviewLoading} title="Re-run review">↻</button>
              </div>
              <p className="summary">{reviewResponse.summary}</p>
              {reviewResponse.findings.length > 0 ? (
                <div className="findings">
                  <span className="section-label">Findings ({reviewResponse.findings.length})</span>
                  {reviewResponse.findings.map((finding, index) => (
                    <div
                      key={`${finding.title}-${index}`}
                      className={`finding ${expandedFinding === index ? 'expanded' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleFindingClick(finding, index)}
                      onKeyDown={(event) => { if (event.key === 'Enter') handleFindingClick(finding, index); }}
                    >
                      <div className="finding-header">
                        <span className="severity-badge" style={{ background: severityColor(finding.severity) }}>{severityLabel(finding.severity)}</span>
                        <span className="finding-title">{finding.title}</span>
                        <span className="finding-chevron">{expandedFinding === index ? '▾' : '▸'}</span>
                      </div>
                      {expandedFinding === index && <div className="finding-body">
                        <p>{finding.explanation}</p>
                        {finding.recommendation && <p className="recommendation">{finding.recommendation}</p>}
                        {finding.affectedIds.length > 0 && <div className="finding-actions">
                          <button className="finding-action" onClick={(event) => { event.stopPropagation(); handleFindingClick(finding, index); }}>Zoom to issue</button>
                        </div>}
                      </div>}
                    </div>
                  ))}
                </div>
              ) : <p className="no-findings">{t('ai.noFindings')}</p>}
              {reviewResponse.reviewOrder.length > 0 && <div className="collapsible-section">
                <span className="section-label">{t('ai.reviewOrder')}</span>
                <ol>{reviewResponse.reviewOrder.map((step, index) => <li key={index}>{step}</li>)}</ol>
              </div>}
              {reviewResponse.riskyAssumptions.length > 0 && <div className="collapsible-section">
                <span className="section-label">{t('ai.riskyAssumptions')}</span>
                <ul>{reviewResponse.riskyAssumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul>
              </div>}
              <div className="meta">{reviewResponse.meta.modelUsed} · {reviewResponse.meta.latencyMs}ms · {reviewResponse.meta.inputTokens + reviewResponse.meta.outputTokens} tok</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'build' && <div className="build-container">
        <div className="chat-messages" ref={chatContainer}>
          {chatMessages.length === 0 && <div className="chat-empty">
            <p className="chat-empty-title">{emptyPrompts[0]}</p>
            {emptyPrompts.slice(1).map((prompt) => <p className="chat-empty-hint" key={prompt}>{prompt}</p>)}
          </div>}
          {chatMessages.map((message, index) => <div key={index} className={`chat-msg chat-${message.role} ${message.isBuilding ? 'building' : ''}`}>
            <div className="chat-bubble">{message.isBuilding && <span className="spinner-sm"/>}<span className="chat-text">{message.text}</span></div>
            {message.changeSummary && <div className="change-summary">{message.changeSummary}</div>}
            {message.rawAiResponse && <details className="raw-response"><summary>LLM response</summary><pre>{message.rawAiResponse}</pre></details>}
            {message.meta && <div className="chat-meta">{message.meta.modelUsed} · {message.meta.latencyMs}ms · {message.meta.tokens} tok</div>}
          </div>)}
          {buildError && <div className="error-box">{buildError}</div>}
        </div>
        {pendingDraft && <div className="draft-actions">
          <button className="draft-btn draft-apply" onClick={() => void handleApply()}>Apply</button>
          <button className="draft-btn draft-retry" onClick={handleRetry}>Retry</button>
          <button className="draft-btn draft-cancel" onClick={handleCancel}>Cancel</button>
        </div>}
        {justApplied && lastSolverDiagnostics.length > 0 && !pendingDraft && <div className="post-build-bar">
          <button className="post-build-btn fix-issues-btn" onClick={() => void handleFixIssues()} disabled={buildLoading}>
            Fix {lastSolverDiagnostics.length} solver issue{lastSolverDiagnostics.length > 1 ? 's' : ''}
          </button>
        </div>}
        {justApplied && hasResults && lastSolverDiagnostics.length === 0 && <div className="post-build-bar">
          <button className="post-build-btn" onClick={() => { setJustApplied(false); setActiveTab('review'); window.setTimeout(() => void handleReview(), 100); }}>Review this model</button>
        </div>}
        <div className="chat-input-row">
          <textarea
            className="chat-input"
            placeholder={hasModelOnCanvas ? 'Describe a change or new structure...' : 'Describe what to build...'}
            value={chatInput}
            onChange={(event) => setChatInput(event.currentTarget.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleBuildSend(); } }}
            disabled={buildLoading || !!pendingDraft}
            rows={2}
          />
          {buildLoading
            ? <button className="chat-send stop-btn" onClick={() => abortController.current?.abort()} title="Stop">■</button>
            : <button className="chat-send" onClick={() => void handleBuildSend()} disabled={!chatInput.trim() || !!pendingDraft}>→</button>}
        </div>
      </div>}

      {activeTab === 'explain' && <div className="drawer-body"><div className="placeholder"><span className="placeholder-icon">?</span><p>Select a diagnostic or finding to get a detailed explanation.</p><p className="hint">Coming soon</p></div></div>}
      {activeTab === 'query' && <div className="drawer-body"><div className="placeholder"><span className="placeholder-icon">⌕</span><p>Ask questions about your analysis results.</p><p className="hint">Coming soon</p></div></div>}
    </aside>
  );
}
