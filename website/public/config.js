// 内网部署配置文件
// 直接修改此文件即可生效，无需重新构建
window.L7VP_CONFIG = {
  // 瓦片底图服务地址
  tileLayerUrl: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
  
  // 可配置多个底图
  tileLayers: [
    {
      id: 'satellite',
      name: '卫星影像底图',
      url: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    },
    {
      id: 'normal',
      name: '普通地图底图',
      url: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    },
  ],
  
  // GeoJSON数据目录路径
  dataPath: '/data',
  
  // 图标目录路径
  iconPath: '/icons',
};
