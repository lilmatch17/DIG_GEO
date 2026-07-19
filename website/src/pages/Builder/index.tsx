import { useEmptyModal, useMarketAssets } from '@/hooks';
import { getProject, updateProject } from '@/services';
import { logYuyanMonitor } from '@/utils';
import type { LocalDatasetSchema } from '@antv/li-sdk';
import { LIEditor } from '@antv/li-editor';
import { Spin } from 'antd';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'umi';
import TileSelectorModal from '@/components/TileSelectorModal';
import type { TileConfig } from '@/types/tile-config';
import { DefaultEditorWidgets, editorWidgetsWithBuilder as editorWidgets } from './editor-widgets';
import { useEditorNavbarKey } from './hooks';
import './index.less';
import type { Application, BuilderState } from './types';

const API_BASE_URL = '/api';

/**
 * 异步加载懒加载数据集的数据行
 */
const loadLazyRows = async (projectId: string, datasetId: string) => {
  const allRows: any[] = [];
  const size = 500;
  let page = 0;
  let total = 0;

  do {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/datasets/${datasetId}/rows?page=${page}&size=${size}`);
    if (!res.ok) break;
    const data = await res.json();
    allRows.push(...data.rows);
    total = data.total;
    page++;
  } while (allRows.length < total);

  return allRows;
};

LIEditor.DefaultEditorWidgets = DefaultEditorWidgets;

const Builder = () => {
  const { id: projectId = '' } = useParams();
  // 供 UploadDataset 组件获取当前项目 ID，用于直接上传数据集行数据
  (window as any).__L7VP_PROJECT_ID__ = projectId;
  const liEditor = useMemo(() => {
    const editor = new LIEditor({ assets: [], editorWidgets });
    (window as any).liRuntimeApp = editor.runtimeApp;
    return editor;
  }, []);
  const [assetPackageIds, setAssetPackageIds] = useState<string[] | undefined>([]);
  const { assets } = useMarketAssets(assetPackageIds);
  const activeNavbarKey = useEditorNavbarKey(liEditor);
  const { emptyModal, emptyContextHolder } = useEmptyModal();

  // 搭建应用状态
  const [loadingLazyRows, setLoadingLazyRows] = useState(false);
  const [builderState, setBuilderState] = useState<BuilderState>({
    project: undefined,
  });

  const defaultApplication = builderState.project?.applicationConfig;

  // 安装资产
  useMemo(() => liEditor.installAssets(assets), [assets]);

  // 查询数据
  useEffect(() => {
    let cancelled = false;
    console.log('[Builder] projectId changed to:', projectId);
    // 切换项目时立即清空旧项目数据，确保 EditorApp 卸载/重建
    console.log('[Builder] clearing old project state...');
    setBuilderState({ project: undefined });
    setLoadingLazyRows(false);

    getProject(projectId)
      .then((project) => {
        if (cancelled) return;
        console.log('[Builder] project loaded:', project.projectName, 'widgets count:', project.applicationConfig?.spec?.widgets?.length);
        // Debug: log widget container references
        const widgets = project.applicationConfig?.spec?.widgets || [];
        const layoutWidget = widgets.find((w: any) => w.type === 'AnalysisLayout' || w.type === 'BaseLayout');
        console.log('[Builder] layout widget id:', layoutWidget?.id, 'type:', layoutWidget?.type);
        widgets.forEach((w: any, i: number) => {
          if (w.container) {
            const match = w.container.id === layoutWidget?.id;
            console.log(`[Builder] widget[${i}] id=${w.id} type=${w.type} container.id=${w.container.id} match=${match ? 'YES' : 'NO -> ORPHANED!'}`);
          } else if (w.type !== 'AnalysisLayout' && w.type !== 'BaseLayout') {
            console.log(`[Builder] widget[${i}] id=${w.id} type=${w.type} NO CONTAINER -> will be top-level`);
          }
        });
        setAssetPackageIds(project.assetPackageIds);
        setBuilderState({ project });
        document.title = `${project.applicationConfig.metadata.name}`;
        logYuyanMonitor(14, { c1: project.projectName, c2: project.creatTime });
        // 有懒加载数据集时，立即置 loading 状态防止图层提前渲染导致 source undefined 崩溃
        const hasLazy = project.applicationConfig.datasets?.some(
          (ds: any) => ds.type === 'local' && ds._lazy === true,
        );
        if (hasLazy) {
          setLoadingLazyRows(true);
        }
      })
      .catch((message) => {
        if (cancelled) return;
        emptyModal(message);
      });

    return () => { cancelled = true; };
  }, [projectId]);

  // 异步加载懒加载数据集的数据行
  useEffect(() => {
    const appConfig = builderState.project?.applicationConfig;
    if (!appConfig?.datasets) return;

    const lazyDatasets = appConfig.datasets.filter(
      (ds): ds is LocalDatasetSchema => ds.type === 'local' && (ds as LocalDatasetSchema)._lazy === true,
    );

    if (lazyDatasets.length === 0) return;

    setLoadingLazyRows(true);
    const loadAllDatasets = async () => {
      const updatedDatasets = await Promise.all(
        lazyDatasets.map(async (ds) => {
          try {
            const rows = await loadLazyRows(projectId, ds.id);
            return { ...ds, data: rows, _lazy: false };
          } catch {
            return ds;
          }
        }),
      );

      setBuilderState((state) => {
        if (!state.project) return state;
        const app = state.project.applicationConfig;
        if (!app.datasets) return state;
        const newDatasets = app.datasets.map((ds) => {
          const updated = updatedDatasets.find((u) => u.id === ds.id);
          return updated || ds;
        });
        return {
          ...state,
          project: { ...state.project, applicationConfig: { ...app, datasets: newDatasets } },
        };
      });
    };

    loadAllDatasets().finally(() => setLoadingLazyRows(false));
  }, [builderState.project?.applicationConfig, projectId]);

  // 更新项目时存储数据
  useEffect(() => {
    const onUpdate = (applicationConfig: Application) => {
      // setBuilderState((state) => ({...state, project: {...state.project!, applicationConfig}}));
      console.log('[Builder] onUpdate spec.widgets count=', applicationConfig.spec?.widgets?.length, 'spec keys=', Object.keys(applicationConfig.spec || {}));
      const { projectName, description } = builderState.project!;
      updateProject(projectId, { projectName, description, applicationConfig });
    };
    liEditor.on('change', onUpdate);
    return () => {
      liEditor.off('change', onUpdate);
    };
  }, [builderState.project, liEditor, projectId]);

  const { Editor: EditorApp } = liEditor;
  const loaded = Boolean(assets.length) && defaultApplication;

  // TileSelector for fresh projects
  const [tileSelectorVisible, setTileSelectorVisible] = useState(false);
  const [tileSelectorShown, setTileSelectorShown] = useState(false);

  // Editor remount key (incremented on tile selection to force refresh)
  const [editorKey, setEditorKey] = useState(0);
  // Reset editorKey when project changes
  useEffect(() => { setEditorKey(0); }, [projectId]);

  // Show tile selector once when project loads and has only default tile
  useEffect(() => {
    if (!loaded || tileSelectorShown || !defaultApplication) return;
    const layers = defaultApplication.spec?.layers || [];
    const datasets = defaultApplication.datasets || [];
    // Only show for fresh projects with just the default basemap
    const hasOnlyDefaultTile = datasets.length === 0 && layers.length === 0;
    if (hasOnlyDefaultTile) {
      setTileSelectorVisible(true);
      setTileSelectorShown(true);
    }
  }, [loaded, defaultApplication, tileSelectorShown]);

  const handleTileConfirm = useCallback(async (selectedTiles: TileConfig[]) => {
    setTileSelectorVisible(false);
    if (!defaultApplication || selectedTiles.length === 0) return;

    const ts = Date.now();
    // 默认瓦片按 defaultNum 排序，小号在下层
    const sorted = [...selectedTiles].sort((a, b) => (a.defaultNum || 99) - (b.defaultNum || 99));
    const newDatasets = sorted.map((tile, i) => ({
      id: `tile_${ts}_${i}`,
      type: 'raster-tile' as const,
      metadata: { name: tile.tileName, description: '瓦片底图' },
      properties: { type: 'xyz-tile' as const, url: tile.tileUrl, minZoom: tile.minZoom ?? 0, maxZoom: tile.maxZoom ?? 18 },
    }));
    const newLayers = sorted.map((tile, i) => ({
      id: `tile_layer_${ts}_${i}`,
      type: 'TileLayer',
      metadata: { name: tile.tileName },
      sourceConfig: { datasetId: `tile_${ts}_${i}`, parser: { type: 'rasterTile' } },
      visConfig: { visible: true, style: { opacity: 1 }, minZoom: tile.minZoom ?? 0, maxZoom: tile.maxZoom ?? 18, blend: 'normal' },
    }));

    const updatedConfig: Application = {
      ...defaultApplication,
      datasets: [...defaultApplication.datasets, ...newDatasets],
      spec: { ...defaultApplication.spec, layers: [...defaultApplication.spec.layers, ...newLayers] },
    };

    // Save updated config and update state in-place (no reload)
    const { projectName, description } = builderState.project!;
    await updateProject(projectId, { projectName, description, applicationConfig: updatedConfig });
    setBuilderState({ project: { ...builderState.project!, applicationConfig: updatedConfig } });
    setEditorKey(prev => prev + 1);
  }, [defaultApplication, builderState.project, projectId]);

  return (
    <div className="li-builder">
      {emptyContextHolder}
      <TileSelectorModal
        visible={tileSelectorVisible}
        onCancel={() => setTileSelectorVisible(false)}
        onConfirm={handleTileConfirm}
      />
      {loadingLazyRows && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin tip="正在加载数据..." />
        </div>
      )}
      {loaded && !loadingLazyRows && (
        <EditorApp
          key={`${projectId}_${editorKey}`}
          className="li-builder__editor"
          defaultActiveNavMenuKey={activeNavbarKey}
          defaultApplication={defaultApplication}
        />
      )}
    </div>
  );
};

export default Builder;
