export interface TileConfig {
  id?: string;
  tileUrl: string;
  tileName: string;
  minZoom: number;
  maxZoom: number;
  isDefault?: string; // "1" = default
  defaultNum?: number; // 默认排序编号
  updateTime?: string;
}
