import type { Application, LocalDatasetSchema } from '@antv/li-sdk';
import { LIRuntimeApp } from '@antv/li-sdk';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'umi';
import { Spin } from 'antd';
import { getProject } from '@/services';
import type { Project } from '@/services';
import { useMarketAssets } from '@/hooks';

const API_BASE_URL = '/api';

/** 异步加载懒加载数据集的数据行 */
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

const SharePage = () => {
  const { id: projectId = '' } = useParams();

  const [assetPackageIds, setAssetPackageIds] = useState<string[] | undefined>([]);
  const [appConfig, setAppConfig] = useState<Application>();
  const [loadingLazyRows, setLoadingLazyRows] = useState(false);

  const liRuntimeApp = useMemo(() => new LIRuntimeApp({ assets: [] }), []);
  const { assets } = useMarketAssets(assetPackageIds);

  // 安装资产
  useMemo(() => liRuntimeApp.installAssets(assets), [assets]);

  useEffect(() => {
    if (!projectId) return;
    getProject(projectId)
      .then(async (project: Project) => {
        setAssetPackageIds(project.assetPackageIds);
        document.title = project.applicationConfig.metadata.name || 'L7VP';
        let { applicationConfig: config } = project;

        // 检查并加载懒加载数据集（Excel 等离线数据）
        const lazyDatasets = config.datasets?.filter(
          (ds: any) => ds.type === 'local' && ds._lazy === true,
        ) as LocalDatasetSchema[] | undefined;

        if (lazyDatasets?.length) {
          setLoadingLazyRows(true);
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
          const newDatasets = config.datasets!.map((ds: any) => {
            const updated = updatedDatasets.find((u) => u.id === ds.id);
            return updated || ds;
          });
          config = { ...config, datasets: newDatasets };
          setLoadingLazyRows(false);
        }

        setAppConfig(config);
      })
      .catch((err: any) => {
        console.error('加载项目失败:', err);
      });
  }, [projectId]);

  const { App: LIAPP } = liRuntimeApp;
  const loaded = Boolean(assets.length) && appConfig && !loadingLazyRows;

  if (!loaded) {
    return loadingLazyRows ? (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh' }}>
        <Spin size="large" />
      </div>
    ) : null;
  }

  // 纯地图视图：无 header、无工具栏、无编辑器 UI
  // LIRuntimeApp 只渲染 Auto 类型组件（地图交互），不渲染编辑器 Layout
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <LIAPP style={{ width: '100%', height: '100%' }} config={appConfig} />
    </div>
  );
};

export default SharePage;
