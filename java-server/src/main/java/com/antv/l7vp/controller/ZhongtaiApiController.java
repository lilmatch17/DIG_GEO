package com.antv.l7vp.controller;

import com.antv.l7vp.dto.UserSession;
import com.antv.l7vp.model.DbConnection;
import com.antv.l7vp.service.DbConnectionService;
import com.antv.l7vp.service.ZhongtaiApiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.*;

/**
 * 中台 API 数据源控制器：代理前端请求到中台数据 API
 * 使用当前登录用户的 SSO token（从 Session 获取）
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ZhongtaiApiController {

    private static final Logger log = LoggerFactory.getLogger(ZhongtaiApiController.class);

    @Autowired
    private ZhongtaiApiService zhongtaiApiService;

    @Autowired
    private DbConnectionService dbConnService;

    /**
     * 代理调用中台数据 API
     * 前端传: { apiUrl, variableParams }
     * 后端从 Session 获取用户 token + orgId 后调用中台 API
     */
    @PostMapping("/datasource/zhongtai/fetch")
    public ResponseEntity<?> fetchZhongtaiData(@RequestBody Map<String, Object> body,
                                                HttpServletRequest request) {
        // 从 Session 获取用户认证信息
        UserSession userSession = AuthController.getSession(request);
        if (userSession == null || userSession.isExpired()) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", "未登录或登录已过期，请重新登录");
            return ResponseEntity.status(401).body(error);
        }

        try {
            String apiUrl = (String) body.get("apiUrl");
            if (apiUrl == null || apiUrl.isEmpty()) {
                Map<String, Object> error = new LinkedHashMap<>();
                error.put("error", "API 地址不能为空");
                return ResponseEntity.badRequest().body(error);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> variableParams = (Map<String, Object>) body.getOrDefault(
                    "variableParams", new HashMap<>());

            // 支持前端动态传入 scopeType / spaceId
            String scopeType = (String) body.get("scopeType");
            String spaceId = (String) body.get("spaceId");

            log.info("用户 {} 请求中台数据: {} (scopeType={}, spaceId={})",
                    userSession.getUsername(), apiUrl, scopeType, spaceId);

            Map<String, Object> result = zhongtaiApiService.fetchData(apiUrl, variableParams,
                    scopeType, spaceId, userSession);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("代理中台 API 失败", e);
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 查询中台数据（GET 方式，用于数据集浏览等场景）
     */
    @GetMapping("/datasource/zhongtai/query")
    public ResponseEntity<?> queryZhongtaiData(@RequestParam String apiUrl,
                                                @RequestParam(required = false) Map<String, String> queryParams,
                                                HttpServletRequest request) {
        UserSession userSession = AuthController.getSession(request);
        if (userSession == null || userSession.isExpired()) {
            Map<String, Object> err1 = new LinkedHashMap<>();
            err1.put("error", "未登录");
            return ResponseEntity.status(401).body(err1);
        }

        try {
            Map<String, Object> result = zhongtaiApiService.fetchDataGet(apiUrl, queryParams, userSession);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("查询中台 API 失败", e);
            Map<String, Object> err2 = new LinkedHashMap<>();
            err2.put("error", e.getMessage());
            return ResponseEntity.status(500).body(err2);
        }
    }

    // ==================== 中台 API 资源列表 ====================

    /**
     * 获取中台 API 资源列表
     * POST /api/zhongtai/api-resources/list
     * Body: { scopeType?, spaceId? }
     */
    @PostMapping("/zhongtai/api-resources/list")
    public ResponseEntity<?> listApiResources(@RequestBody Map<String, Object> body,
                                              HttpServletRequest request) {
        UserSession userSession = AuthController.getSession(request);
        if (userSession == null || userSession.isExpired()) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", "未登录或登录已过期");
            return ResponseEntity.status(401).body(error);
        }

        try {
            String scopeType = (String) body.getOrDefault("scopeType", "User");
            String spaceId = (String) body.get("spaceId");

            log.info("用户 {} 请求中台 API 资源列表 (scopeType={}, spaceId={})",
                    userSession.getUsername(), scopeType, spaceId);

            Map<String, Object> response = zhongtaiApiService.fetchApiResourceList(
                    scopeType, spaceId, userSession);

            @SuppressWarnings("unchecked")
            Map<String, Object> details = (Map<String, Object>) response.get("details");
            List<Map<String, Object>> rawList = new ArrayList<>();
            if (details != null) {
                Object data = details.get("data");
                if (data instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> d = (List<Map<String, Object>>) data;
                    rawList = d;
                }
            }

            List<Map<String, Object>> resources = new ArrayList<>();
            for (Map<String, Object> item : rawList) {
                Map<String, Object> res = new LinkedHashMap<>();
                res.put("resourceId", item.get("resourceId"));
                res.put("resourceCode", item.get("resourceCode"));
                res.put("resourceName", item.get("resourceName"));
                res.put("resourceType", item.get("resourceType"));
                res.put("apiCode", item.get("apiCode"));
                res.put("datasourceId", item.get("datasourceId"));
                res.put("datasourceName", item.get("datasourceName"));
                res.put("datasourceCode", item.get("datasourceCode"));
                res.put("typeCode", item.get("typeCode"));
                res.put("resourceDesp", item.get("resourceDesp"));
                res.put("lastUpdateTime", item.get("lastUpdateTime"));
                resources.add(res);
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("resources", resources);
            result.put("total", resources.size());

            log.info("返回 {} 条 API 资源", resources.size());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("获取中台 API 资源列表失败", e);
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // ==================== 中台数据资源列表 ====================

    /**
     * 获取中台数据资源列表（数据表 + API）
     * POST /api/zhongtai/resources/list
     * Body: { scopeType?, spaceId? }
     */
    @PostMapping("/zhongtai/resources/list")
    public ResponseEntity<?> listResources(@RequestBody Map<String, Object> body,
                                           HttpServletRequest request) {
        UserSession userSession = AuthController.getSession(request);
        if (userSession == null || userSession.isExpired()) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", "未登录或登录已过期");
            return ResponseEntity.status(401).body(error);
        }

        try {
            String scopeType = (String) body.getOrDefault("scopeType", "User");
            String spaceId = (String) body.get("spaceId");

            log.info("用户 {} 请求中台数据资源列表 (scopeType={}, spaceId={})",
                    userSession.getUsername(), scopeType, spaceId);

            Map<String, Object> response = zhongtaiApiService.fetchDataResourceList(
                    scopeType, spaceId, userSession);

            // 提取 data 列表
            @SuppressWarnings("unchecked")
            Map<String, Object> details = (Map<String, Object>) response.get("details");
            List<Map<String, Object>> rawList = new ArrayList<>();
            if (details != null) {
                Object data = details.get("data");
                if (data instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> d = (List<Map<String, Object>>) data;
                    rawList = d;
                }
            }

            // 转为简化格式
            List<Map<String, Object>> resources = new ArrayList<>();
            for (Map<String, Object> item : rawList) {
                Map<String, Object> res = new LinkedHashMap<>();
                res.put("resourceId", item.get("resourceId"));
                res.put("resourceName", item.get("resourceName"));
                res.put("resourceCode", item.get("resourceCode"));
                res.put("tableName", item.get("name")); // 物理表名（resourceName 是显示名，可能为中文，不能直接当 SQL 表名用）
                res.put("catalog", item.get("catalog")); // catalog/库名
                res.put("resourceType", item.get("resourceType"));
                res.put("datasourceId", item.get("datasourceId"));
                res.put("datasourceName", item.get("datasourceName"));
                res.put("datasourceCode", item.get("datasourceCode"));
                res.put("typeCode", item.get("typeCode"));
                res.put("storageLayer", item.get("storageLayer"));
                res.put("storageLayerName", item.get("storageLayerName"));
                res.put("resourceDesp", item.get("resourceDesp"));
                res.put("columnsTotal", item.get("columnsTotal"));
                res.put("lastUpdateTime", item.get("lastUpdateTime"));
                resources.add(res);
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("resources", resources);
            result.put("total", resources.size());

            log.info("返回 {} 条数据资源", resources.size());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("获取中台数据资源列表失败", e);
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // ==================== 中台数据表预览/查询 ====================

    /**
     * 预览中台数据资源（通过 JDBC 直连数据库）
     * POST /api/zhongtai/resources/data
     * Body: { datasourceId, resourceName, limit? }
     */
    @PostMapping("/zhongtai/resources/data")
    public ResponseEntity<?> previewResourceData(@RequestBody Map<String, Object> body,
                                                  HttpServletRequest request) {
        UserSession userSession = AuthController.getSession(request);
        if (userSession == null || userSession.isExpired()) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", "未登录或登录已过期");
            return ResponseEntity.status(401).body(error);
        }

        try {
            String datasourceId = (String) body.get("datasourceId");
            String resourceName = (String) body.get("resourceName");
            int limit = 20;
            if (body.get("limit") instanceof Number) {
                limit = ((Number) body.get("limit")).intValue();
            }

            if (datasourceId == null || datasourceId.isEmpty()) {
                Map<String, Object> error = new LinkedHashMap<>();
                error.put("error", "数据源ID不能为空");
                return ResponseEntity.badRequest().body(error);
            }
            if (resourceName == null || resourceName.isEmpty()) {
                Map<String, Object> error = new LinkedHashMap<>();
                error.put("error", "资源名称不能为空");
                return ResponseEntity.badRequest().body(error);
            }

            log.info("预览中台资源: datasourceId={}, table={}", datasourceId, resourceName);

            Map<String, Object> connectInfo = zhongtaiApiService.fetchConnectInfo(datasourceId, userSession);
            DbConnection conn = zhongtaiApiService.buildConnectionFromConnectInfo(connectInfo);

            int rowCount = dbConnService.getRowCount(conn, resourceName);
            DbConnectionService.TableDataResult tableData = dbConnService.previewTableWithColumns(
                    conn, resourceName, limit);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("rows", tableData.getRows());
            result.put("columns", tableData.getColumns());
            result.put("rowCount", rowCount);
            result.put("limit", limit);

            log.info("预览完成: {} ({} 行)", resourceName, rowCount);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("预览中台资源数据失败", e);
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 查询中台数据资源全量数据（用于数据集加载）
     * POST /api/zhongtai/resources/data/full
     */
    @PostMapping("/zhongtai/resources/data/full")
    public ResponseEntity<?> queryResourceData(@RequestBody Map<String, Object> body,
                                                HttpServletRequest request) {
        UserSession userSession = AuthController.getSession(request);
        if (userSession == null || userSession.isExpired()) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", "未登录或登录已过期");
            return ResponseEntity.status(401).body(error);
        }

        try {
            String datasourceId = (String) body.get("datasourceId");
            String resourceName = (String) body.get("resourceName");

            if (datasourceId == null || datasourceId.isEmpty()) {
                Map<String, Object> error = new LinkedHashMap<>();
                error.put("error", "数据源ID不能为空");
                return ResponseEntity.badRequest().body(error);
            }
            if (resourceName == null || resourceName.isEmpty()) {
                Map<String, Object> error = new LinkedHashMap<>();
                error.put("error", "资源名称不能为空");
                return ResponseEntity.badRequest().body(error);
            }

            log.info("查询中台全量数据: datasourceId={}, table={}", datasourceId, resourceName);

            Map<String, Object> connectInfo = zhongtaiApiService.fetchConnectInfo(datasourceId, userSession);
            DbConnection conn = zhongtaiApiService.buildConnectionFromConnectInfo(connectInfo);

            int rowCount = dbConnService.getRowCount(conn, resourceName);
            DbConnectionService.TableDataResult tableData = dbConnService.queryTableWithColumns(
                    conn, resourceName);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("rows", tableData.getRows());
            result.put("columns", tableData.getColumns());
            result.put("rowCount", rowCount);

            log.info("查询完成: {} ({} 行)", resourceName, rowCount);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("查询中台全量数据失败", e);
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}
