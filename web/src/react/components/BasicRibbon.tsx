import { useSyncExternalStore } from 'react';
import { t, localeExternalStore } from '../../lib/i18n/store';
import { TWO_D_INTERNAL_FORCE_LABELS as F2D } from '../../lib/geometry/coordinate-system';
import { runSolve } from '../../lib/actions/solve';
import { saveProject } from '../../lib/store/file';
import { historyStore } from '../../lib/store/history';
import { commandShowsQuantity, showStressMap, activeMapMeasure } from '../../lib/store/result-view';
import { resultsStore, type DiagramType } from '../../lib/store/results';
import { hasBackup, needsPlaneChoice, restore3D, switchPlain } from '../../lib/store/switch-2d';
import { EDIT_TOOLS, uiStore } from '../../lib/store/ui';
import { armTool, showDiagram } from '../../lib/store/view-mode';
import { modelStore } from '../../lib/store/model';
import { basicPanelStore, openBasicPanel, type BasicPanelId, type BasicPanelOptions } from '../../lib/store/basic-panel';
import { TOOL_KEY_MAP } from '../../lib/tool-keys';
import { useStoreRevision } from '../store/useStoreRevision';
import { Icon, type IconName } from './Icon';
import './BasicRibbon.css';

type Cmd = {
  id: string;
  icon: IconName | (() => IconName);
  labelKey?: string | (() => string);
  label?: string;
  nameKey?: string;
  dataTab?: string;
  rotate?: number;
  tool?: string;
  panel?: BasicPanelId;
  diagram?: DiagramType;
  stressMap?: boolean;
  action?: () => void;
  enabled?: () => boolean;
  needs3d?: boolean;
  prominent?: boolean;
};

type Group = { id: string; labelKey: string; cmds: Cmd[] };

const KEYS: Record<string, string> = { ...TOOL_KEY_MAP, solve: 'Enter' };

function openPanel(panel: BasicPanelId | null, opts?: BasicPanelOptions) {
  if (panel) openBasicPanel(panel, opts);
}

export function BasicRibbon() {
  useSyncExternalStore(
    localeExternalStore.subscribe,
    localeExternalStore.getSnapshot,
    localeExternalStore.getSnapshot,
  );
  useStoreRevision(uiStore);
  useStoreRevision(resultsStore);
  // History is still a Svelte rune store. Model revisions cover all structural
  // history operations and keep Undo/Redo disabled state current in React.
  useStoreRevision(modelStore);

  const { activePanel, activeDataTab } = useSyncExternalStore(
    basicPanelStore.subscribe,
    basicPanelStore.getSnapshot,
    basicPanelStore.getSnapshot,
  );
  const solved = resultsStore.results != null || resultsStore.results3D != null;
  const threeD = uiStore.analysisMode === '3d';

  const any = () => solved;
  const only3d = () => solved && threeD;
  const diagramCmds: Cmd[] = [
    { id: 'none', icon: 'none', labelKey: 'ribbon.noDiagram', panel: 'results', diagram: 'none', enabled: any },
    { id: 'deformed', icon: 'deformed', labelKey: 'ribbon.deformed', panel: 'results', diagram: 'deformed', enabled: any },
    { id: 'axial', icon: 'axial', label: F2D.axial, nameKey: 'ribbon.nameAxial', panel: 'results', diagram: 'axial', enabled: any },
    { id: 'momentY', icon: 'moment', label: F2D.moment, nameKey: 'ribbon.nameMomentY', panel: 'results', diagram: threeD ? 'momentY' : 'moment', enabled: any },
    { id: 'shearZ', icon: 'shear', label: F2D.shear, nameKey: 'ribbon.nameShearZ', panel: 'results', diagram: threeD ? 'shearZ' : 'shear', enabled: any },
  ];

  // Mz, Vy and torsion are out-of-plane quantities, so they do not exist in 2D.
  if (threeD) {
    diagramCmds.push(
      { id: 'moment', icon: 'moment', rotate: 90, label: 'Mz', nameKey: 'ribbon.nameMomentZ', panel: 'results', diagram: 'momentZ', enabled: only3d, needs3d: true },
      { id: 'shear', icon: 'shear', rotate: 90, label: 'Vy', nameKey: 'ribbon.nameShearY', panel: 'results', diagram: 'shearY', enabled: only3d, needs3d: true },
      { id: 'torsion', icon: 'torsion', label: 'T', nameKey: 'ribbon.nameTorsion', panel: 'results', diagram: 'torsion', enabled: only3d, needs3d: true },
    );
  }
  diagramCmds.push({
    id: 'stress', icon: 'stress', labelKey: 'ribbon.stress',
    panel: 'results', stressMap: true, enabled: any,
  });

  const groups: Group[] = [
    {
      id: 'view',
      labelKey: 'ribbon.groupView',
      cmds: [
        { id: 'select', icon: 'select', labelKey: 'ribbon.selection', panel: 'selection' },
        {
          id: 'dim',
          icon: () => (threeD ? 'view2d' : 'view3d'),
          labelKey: () => (threeD ? 'ribbon.view2d' : 'ribbon.view3d'),
          action: () => {
            if (!threeD) {
              if (hasBackup()) restore3D();
              else uiStore.analysisMode = '3d';
              return;
            }
            if (needsPlaneChoice()) uiStore.switchTo2DPrompt = true;
            else switchPlain();
          },
        },
      ],
    },
    {
      id: 'data',
      labelKey: 'ribbon.groupData',
      cmds: [
        { id: 'data', icon: 'data', nameKey: 'ribbon.data', panel: 'data', prominent: true, dataTab: activeDataTab || 'nodes' },
      ],
    },
    {
      id: 'draw',
      labelKey: 'ribbon.groupDraw',
      cmds: [
        { id: 'node', icon: 'node', labelKey: 'float.node', tool: 'node', panel: 'data', dataTab: 'nodes' },
        { id: 'element', icon: 'element', labelKey: 'float.element', tool: 'element', panel: 'data', dataTab: 'elements' },
      ],
    },
    {
      id: 'conditions',
      labelKey: 'ribbon.groupConditions',
      cmds: [
        { id: 'support', icon: 'support', labelKey: 'float.support', tool: 'support', panel: 'data', dataTab: 'supports' },
        { id: 'load', icon: 'load', labelKey: 'float.load', tool: 'load', panel: 'data', dataTab: 'loads' },
      ],
    },
    {
      id: 'properties',
      labelKey: 'ribbon.groupProperties',
      cmds: [
        { id: 'materials', icon: 'material', labelKey: 'pro.tabMaterials', panel: 'data', dataTab: 'materials' },
        { id: 'sections', icon: 'section', labelKey: 'pro.tabSections', panel: 'data', dataTab: 'sections' },
      ],
    },
    {
      id: 'analyse',
      labelKey: 'ribbon.tabAnalyse',
      cmds: [
        {
          id: 'solve', icon: 'solve', labelKey: 'pro.solve', panel: 'results',
          action: () => {
            runSolve();
            if (EDIT_TOOLS.includes(uiStore.currentTool)) uiStore.currentTool = 'select';
          },
        },
        { id: 'advanced', icon: 'advanced', labelKey: 'ribbon.advanced', panel: 'advanced' },
      ],
    },
    { id: 'results', labelKey: 'ribbon.tabResults', cmds: diagramCmds },
  ];

  function run(cmd: Cmd) {
    if (cmd.enabled && !cmd.enabled()) return;
    if (cmd.tool) {
      armTool(cmd.tool);
      if (cmd.dataTab) openPanel('data', { dataTab: cmd.dataTab, toggle: false });
      return;
    }
    if (cmd.stressMap) {
      showStressMap();
      openPanel(cmd.panel ?? null, { toggle: false });
      return;
    }
    if (cmd.diagram) {
      showDiagram(cmd.diagram);
      cmd.action?.();
      openPanel(cmd.panel ?? null, { toggle: false });
      return;
    }
    cmd.action?.();
    if (cmd.dataTab && !cmd.tool && EDIT_TOOLS.includes(uiStore.currentTool)) {
      uiStore.currentTool = 'select';
    }
    if (cmd.panel) {
      openPanel(cmd.panel, {
        ...(cmd.id === 'solve' ? { toggle: false } : {}),
        ...(cmd.dataTab ? { dataTab: cmd.dataTab, toggle: false } : {}),
      });
    }
  }

  function isActive(cmd: Cmd): boolean {
    if (cmd.tool) return activePanel === 'data' && uiStore.currentTool === cmd.tool;
    if (cmd.dataTab && cmd.id !== 'data') {
      return activePanel === 'data' && activeDataTab === cmd.dataTab;
    }
    if (cmd.id === 'data') return false;
    if (cmd.diagram) {
      if (cmd.diagram === 'none') {
        return solved && activePanel === 'results' && resultsStore.diagramType === 'none';
      }
      return solved && activePanel === 'results' && commandShowsQuantity(cmd.diagram);
    }
    if (cmd.stressMap) return solved && activePanel === 'results' && activeMapMeasure() !== null;
    if (cmd.id === 'solve') return false;
    if (cmd.panel) return activePanel === cmd.panel;
    return false;
  }

  function cmdLabel(cmd: Cmd): string {
    if (cmd.label) return cmd.label;
    const key = typeof cmd.labelKey === 'function' ? cmd.labelKey() : cmd.labelKey;
    return key ? t(key) : '';
  }

  function cmdTitle(cmd: Cmd, enabled: boolean): string {
    const name = cmd.nameKey ? t(cmd.nameKey) : cmdLabel(cmd);
    const full = cmd.label ? `${name} (${cmd.label})` : name;
    const key = KEYS[cmd.id];
    const withKey = key ? `${full} — ${key}` : full;
    if (enabled) return withKey;
    return `${withKey} — ${cmd.needs3d && !threeD ? t('ribbon.needs3d') : t('ribbon.needsSolve')}`;
  }

  const mod = typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl';

  return <div className="ribbon" data-testid="ribbon">
    <div className="rb-row">
      <div className="rb-quick" data-testid="rb-quick">
        <div className="rb-quick-row">
          <button
            className={`rb-quick-btn${activePanel === 'project' ? ' active' : ''}`}
            onClick={() => openPanel('project')}
            title={t('ribbon.project')}
            aria-label={t('ribbon.project')}
            data-testid="hdr-project"
          ><Icon name="project" size={21} /></button>
          <button
            className="rb-quick-btn"
            onClick={() => saveProject()}
            title={`${t('project.saveTab')} (${mod}+S)`}
            aria-label={t('project.saveTab')}
            data-testid="rb-save"
          ><Icon name="save" size={21} /></button>
        </div>
        <div className="rb-quick-row">
          <button
            className="rb-quick-btn"
            onClick={() => historyStore.undo()}
            disabled={!historyStore.canUndo}
            title={`${t('toolbar.undo')} (${mod}+Z)`}
            aria-label={t('toolbar.undo')}
          ><Icon name="undo" size={16} /></button>
          <button
            className="rb-quick-btn"
            onClick={() => historyStore.redo()}
            disabled={!historyStore.canRedo}
            title={`${t('toolbar.redo')} (${mod}+Y)`}
            aria-label={t('toolbar.redo')}
          ><Icon name="redo" size={16} /></button>
        </div>
      </div>

      {groups.map((group) => <section
        className="rb-group"
        data-group={group.id}
        aria-label={t(group.labelKey)}
        key={group.id}
      >
        <div className="rb-cmds">
          {group.cmds.map((cmd) => {
            const enabled = !cmd.enabled || cmd.enabled();
            const icon = typeof cmd.icon === 'function' ? cmd.icon() : cmd.icon;
            return <button
              className={`rb-cmd${isActive(cmd) ? ' active' : ''}`}
              disabled={!enabled}
              data-testid={`rb-cmd-${cmd.id}`}
              onClick={() => run(cmd)}
              title={cmdTitle(cmd, enabled)}
              key={cmd.id}
            >
              <span className="rb-icon"><Icon name={icon} rotate={cmd.rotate ?? 0} /></span>
              <span className={`rb-label${cmd.label ? ' symbol' : ''}`}>{cmdLabel(cmd)}</span>
            </button>;
          })}
        </div>
        <p className="rb-group-label">{t(group.labelKey)}</p>
      </section>)}

      <div className="rb-spacer" />
    </div>
  </div>;
}
