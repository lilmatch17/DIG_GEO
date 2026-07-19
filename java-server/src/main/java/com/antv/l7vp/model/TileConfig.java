package com.antv.l7vp.model;

import lombok.Data;

@Data
public class TileConfig {
    private String id;
    private String tileUrl;
    private String tileName;
    private Integer minZoom;
    private Integer maxZoom;
    private String updateTime;
    /** 是否默认瓦片: "1"=是, null/""=否 */
    private String isDefault;
    /** 默认瓦片排序编号: 小号在下层 */
    private Integer defaultNum;
}
