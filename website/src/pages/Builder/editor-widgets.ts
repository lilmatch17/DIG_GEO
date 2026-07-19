import type { ImplementEditorWidget } from '@antv/li-editor';
import {
  DatabaseDataset,
  DatasetsPanel,
  FetchDataset,
  FiltersPanel,
  Folder,
  LayersPanel,
  MapSetting,
  TilesetsDataset,
  UploadDataset,
  WidgetsPanel,
  ZhongtaiApiDataset,
} from '@antv/li-editor/dist/esm/widgets';

import BackToProjects from './widgets/BackToProjects';
import DatasetPreview from './widgets/DatasetPreview';
import Docs from './widgets/Docs';
import Export from './widgets/Export';
import Preview from './widgets/Preview';
import Screenshot from './widgets/Screenshot';

export const DefaultEditorWidgets: ImplementEditorWidget[] = [
  DatasetsPanel,
  FiltersPanel,
  LayersPanel,
  WidgetsPanel,
  UploadDataset,
  MapSetting,
];

// 自定义编辑器的控件
export const editorWidgets: ImplementEditorWidget[] = [DatasetPreview, Export];
export const editorWidgetsWithBuilder: ImplementEditorWidget[] = [
  DatasetPreview,
  TilesetsDataset,
  FetchDataset,
  ZhongtaiApiDataset,
  DatabaseDataset,
  Screenshot,
  BackToProjects,
  Preview,
  Folder,
];
