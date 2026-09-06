import { t } from '../i18n';
import { modelStore, resultsStore, tabManager, uiStore } from '../store';

export type ProExampleGroupId = 'buildings' | 'industrial' | 'foundations' | 'longspan' | 'energy' | 'xl';
export type ProExamplePreset = 'default' | 'xl' | 'clean-shell' | 'bridge';

export interface ProExample {
  nameKey: string;
  descKey: string;
  purposeKey: string;
  groupKey: string;
  group: ProExampleGroupId;
  tags: string[];
  stats: { nodes: string; members: string; shells?: string };
  preset?: ProExamplePreset;
  featured?: boolean;
  fixture: string;
}

export interface ProExampleGroup {
  group: ProExampleGroupId;
  title: string;
  examples: ProExample[];
}

export const PRO_EXAMPLES: readonly ProExample[] = [
  {
    group: 'buildings', groupKey: 'pro.examples.groupBuildings',
    nameKey: 'ex.pro-edificio-7p', descKey: 'ex.pro-edificio-7p.desc', purposeKey: 'ex.pro-edificio-7p.purpose',
    tags: ['pro.tagRC', 'pro.tagCodes'], stats: { nodes: '141', members: '203', shells: '120' },
    preset: 'clean-shell', fixture: 'pro-edificio-7p',
  },
  {
    group: 'buildings', groupKey: 'pro.examples.groupBuildings',
    nameKey: 'ex.irregularSetbackTower3D', descKey: 'ex.irregularSetbackTower3D.desc', purposeKey: 'ex.irregularSetbackTower3D.purpose',
    tags: ['pro.tagDrift', 'pro.tagTorsion'], stats: { nodes: '420', members: '1180' },
    fixture: 'torre-irregular-con-retiros',
  },
  {
    group: 'buildings', groupKey: 'pro.examples.groupBuildings',
    nameKey: 'ex.rcDesignFrame3D', descKey: 'ex.rcDesignFrame3D.desc', purposeKey: 'ex.rcDesignFrame3D.purpose',
    tags: ['pro.tagDesign', 'pro.tagRC'], stats: { nodes: '180', members: '344' }, fixture: 'rc-design-frame',
  },
  {
    group: 'buildings', groupKey: 'pro.examples.groupBuildings',
    nameKey: 'ex.rc-qa-diagnostic', descKey: 'ex.rc-qa-diagnostic.desc', purposeKey: 'ex.rc-qa-diagnostic.purpose',
    tags: ['pro.tagDesign', 'pro.tagRC'], stats: { nodes: '18', members: '26' }, fixture: 'rc-qa-diagnostic',
  },
  {
    group: 'buildings', groupKey: 'pro.examples.groupBuildings',
    nameKey: 'ex.cad-arch-structure-dxf', descKey: 'ex.cad-arch-structure-dxf.desc', purposeKey: 'ex.cad-arch-structure-dxf.purpose',
    tags: ['pro.tagRC', 'pro.tagCad'], stats: { nodes: '2101', members: '970', shells: '1160' }, fixture: 'cad-arch-structure-dxf',
  },
  {
    group: 'buildings', groupKey: 'pro.examples.groupBuildings',
    nameKey: 'ex.cad-arch-only-dxf', descKey: 'ex.cad-arch-only-dxf.desc', purposeKey: 'ex.cad-arch-only-dxf.purpose',
    tags: ['pro.tagRC', 'pro.tagCad'], stats: { nodes: '794', members: '1000', shells: '660' }, fixture: 'cad-arch-only-dxf',
  },
  {
    group: 'industrial', groupKey: 'pro.examples.groupIndustrial',
    nameKey: 'ex.3d-nave-industrial', descKey: 'ex.3d-nave-industrial.desc', purposeKey: 'ex.3d-nave-industrial.purpose',
    tags: ['pro.tagSteel', 'pro.tagCrane'], stats: { nodes: '232', members: '633' }, fixture: '3d-nave-industrial',
  },
  {
    group: 'industrial', groupKey: 'pro.examples.groupIndustrial',
    nameKey: 'ex.pipeRack3D', descKey: 'ex.pipeRack3D.desc', purposeKey: 'ex.pipeRack3D.purpose',
    tags: ['pro.tagIndustrial', 'pro.tagSteel'], stats: { nodes: '90', members: '173' }, fixture: 'pipe-rack',
  },
  {
    group: 'energy', groupKey: 'pro.examples.groupEnergy',
    nameKey: 'ex.offshorePlatform', descKey: 'ex.offshorePlatform.desc', purposeKey: 'ex.offshorePlatform.purpose',
    tags: ['pro.tagSteel', 'pro.tagOffshore'], stats: { nodes: '196', members: '762' }, featured: true, fixture: 'offshore-platform',
  },
  {
    group: 'foundations', groupKey: 'pro.examples.groupFoundations',
    nameKey: 'ex.matFoundation3D', descKey: 'ex.matFoundation3D.desc', purposeKey: 'ex.matFoundation3D.purpose',
    tags: ['pro.tagFoundation', 'pro.tagSoil'], stats: { nodes: '99', members: '180', shells: '80' },
    preset: 'clean-shell', fixture: 'mat-foundation',
  },
  {
    group: 'longspan', groupKey: 'pro.examples.groupLongSpan',
    nameKey: 'ex.suspensionBridge3D', descKey: 'ex.suspensionBridge3D.desc', purposeKey: 'ex.suspensionBridge3D.purpose',
    tags: ['pro.tagCables', 'pro.tagLongSpan'], stats: { nodes: '378', members: '932' }, preset: 'bridge', fixture: 'suspension-bridge',
  },
  {
    group: 'longspan', groupKey: 'pro.examples.groupLongSpan',
    nameKey: 'ex.cableStayedBridge3D', descKey: 'ex.cableStayedBridge3D.desc', purposeKey: 'ex.cableStayedBridge3D.purpose',
    tags: ['pro.tagCables', 'pro.tagBridge'], stats: { nodes: '74', members: '125' }, preset: 'bridge', fixture: 'cable-stayed-bridge',
  },
  {
    group: 'longspan', groupKey: 'pro.examples.groupLongSpan',
    nameKey: 'ex.fullStadium3D', descKey: 'ex.fullStadium3D.desc', purposeKey: 'ex.fullStadium3D.purpose',
    tags: ['pro.tagRoof', 'pro.tagBowl'], stats: { nodes: '360', members: '876', shells: '48' }, preset: 'clean-shell', fixture: 'full-stadium',
  },
  {
    group: 'xl', groupKey: 'pro.examples.groupXL',
    nameKey: 'ex.geodesicDome3D', descKey: 'ex.geodesicDome3D.desc', purposeKey: 'ex.geodesicDome3D.purpose',
    tags: ['pro.tagShells', 'pro.tagScale'], stats: { nodes: '641', members: '1920' }, preset: 'xl', fixture: 'geodesic-dome',
  },
  {
    group: 'xl', groupKey: 'pro.examples.groupXL',
    nameKey: 'ex.laBombonera3D', descKey: 'ex.laBombonera3D.desc', purposeKey: 'ex.laBombonera3D.purpose',
    tags: ['pro.tagBowl', 'pro.tagScale'], stats: { nodes: '1005', members: '2476', shells: '120' },
    preset: 'clean-shell', featured: true, fixture: 'la-bombonera',
  },
  {
    group: 'xl', groupKey: 'pro.examples.groupXL',
    nameKey: 'ex.xlDiagridTower3D', descKey: 'ex.xlDiagridTower3D.desc', purposeKey: 'ex.xlDiagridTower3D.purpose',
    tags: ['pro.tagScale', 'pro.tagDrift'], stats: { nodes: '1262', members: '5013' }, preset: 'xl', fixture: 'xl-diagrid-tower',
  },
];

const GROUP_ORDER: readonly ProExampleGroupId[] = ['buildings', 'industrial', 'energy', 'foundations', 'longspan', 'xl'];

export function groupProExamples(translate: (key: string) => string = t): ProExampleGroup[] {
  return GROUP_ORDER.map((group) => ({
    group,
    title: translate(PRO_EXAMPLES.find((example) => example.group === group)?.groupKey ?? ''),
    examples: PRO_EXAMPLES.filter((example) => example.group === group),
  })).filter((group) => group.examples.length > 0);
}

export async function loadProExampleModel(example: ProExample): Promise<void> {
  await modelStore.loadExample(example.fixture);
  uiStore.includeSelfWeight = true;
  uiStore.showLengths3D = false;
  uiStore.showNodeLabels3D = false;
  uiStore.showElementLabels3D = false;
  tabManager.syncActiveTabName();
  resultsStore.clear();
  resultsStore.clear3D();
  window.setTimeout(() => window.dispatchEvent(new Event('stabileo-zoom-to-fit')), 200);
  window.setTimeout(() => window.dispatchEvent(new Event('stabileo-zoom-to-fit')), 600);
}
