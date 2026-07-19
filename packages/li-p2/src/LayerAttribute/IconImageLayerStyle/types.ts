import type { IconImageLayerOptions } from '@antv/l7-composite-layers';
import type { FieldSelectOptionType } from '../types';
import type { CommonProps } from '../types/common';

/**
 * 图标图层样式属性值（扩展字段用于图标库匹配）
 */
export type IconImageLayerStyleAttributeValue = Omit<IconImageLayerOptions, 'source'> & {
  /** 图标模式: fixed=固定图标, field=基于字段(库号+代号) */
  iconType?: 'fixed' | 'field';
  /** 库号字段名 — 从数据行中提取 library_code */
  iconLibraryField?: string;
  /** 代号字段名 — 从数据行中提取 code_name */
  iconCodeField?: string;
  /** 未匹配时的 fallback 图标 URL */
  fallbackIconUrl?: string;
};

/**
 * 组件类型定义
 */
export interface IconImageLayerStyleAttributeProps extends CommonProps {
  fieldList: FieldSelectOptionType[];
  initialValues: IconImageLayerStyleAttributeValue;
  onChange?: (values: IconImageLayerStyleAttributeValue) => void;
}
