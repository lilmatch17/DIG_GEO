import type { PolygonLayerProps } from '@antv/larkmap';
import { PolygonLayer } from '@antv/larkmap';
import type { ImplementLayerProps } from '@antv/li-sdk';
import { destination } from '@turf/turf';
import React, { useMemo } from 'react';

/** 半径单位转米的倍数 */
const UNIT_TO_METERS: Record<string, number> = {
  meters: 1,
  kilometers: 1000,
  miles: 1609.344,
  nauticalmiles: 1852,
};

/** 逼近地理圆的多边形边数 */
const CIRCLE_STEPS = 60;

export interface GeoCircleLayerWrapperProps extends ImplementLayerProps {
  source?: {
    data?: Record<string, any>[];
    parser?: {
      x?: string;
      y?: string;
      longitude?: string;
      latitude?: string;
      geometry?: string;
    };
  };
  radiusValue?: number;
  radiusUnit?: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  lineWidth?: number;
  label?: {
    field?: string;
    visible?: boolean;
    style?: Record<string, any>;
  };
  minZoom?: number;
  maxZoom?: number;
  blend?: string;
  zIndex?: number;
}

const GeoCircleLayerWrapper: React.FC<GeoCircleLayerWrapperProps> = (props) => {
  const {
    source,
    radiusValue = 1000,
    radiusUnit = 'meters',
    fillColor = 'rgb(90, 216, 166)',
    fillOpacity = 0.8,
    minZoom = 0,
    maxZoom = 24,
    blend = 'normal',
    strokeColor,
    lineWidth,
    label,
    zIndex,
  } = props;

  // 从 source.parser 中提取经纬度字段名
  const lngField = source?.parser?.x || source?.parser?.longitude;
  const latField = source?.parser?.y || source?.parser?.latitude;

  // 将点数据转换为地理圆 GeoJSON FeatureCollection
  const geoSource = useMemo(() => {
    const data = source?.data;
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    if (!lngField || !latField) return null;

    const radiusInMeters = radiusValue * (UNIT_TO_METERS[radiusUnit] || 1);

    const features = data
      .map((row: Record<string, any>) => {
        const lng = parseFloat(row[lngField]);
        const lat = parseFloat(row[latField]);
        if (isNaN(lng) || isNaN(lat)) return null;

        const center = [lng, lat];
        const coords: [number, number][] = [];
        for (let i = 0; i < CIRCLE_STEPS; i++) {
          const bearing = (i * -360) / CIRCLE_STEPS;
          const pt = destination(center, radiusInMeters, bearing, { units: 'meters' });
          coords.push(pt.geometry.coordinates as [number, number]);
        }
        coords.push(coords[0]); // 闭合环

        return {
          type: 'Feature' as const,
          properties: row,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [coords],
          },
        };
      })
      .filter(Boolean) as any[];

    if (features.length === 0) return null;

    return {
      data: {
        type: 'FeatureCollection',
        features,
      },
      parser: { type: 'geojson' as const },
    };
  }, [source, lngField, latField, radiusValue, radiusUnit]);

  if (!geoSource) return null;

  const labelConfig = label?.visible && label?.field
    ? { field: label.field, visible: true, style: label.style || {} }
    : undefined;

  return (
    <PolygonLayer
      {...({
        source: geoSource,
        shape: 'fill',
        color: fillColor,
        style: { opacity: fillOpacity },
        minZoom,
        maxZoom,
        blend,
        zIndex,
        label: labelConfig,
      } as any)}
    />
  );
};

export default GeoCircleLayerWrapper;
