package com.antv.l7vp.controller;

import com.antv.l7vp.service.ZhongtaiApiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 中台 API 数据源控制器：代理前端请求到中台 API
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ZhongtaiApiController {

    @Autowired
    private ZhongtaiApiService zhongtaiApiService;

    /**
     * 代理调用中台数据 API
     * 前端传：{ apiUrl, variableParams }
     * 后端获取 SSO token 后调用中台 API，返回数据
     */
    @PostMapping("/datasource/zhongtai/fetch")
    public ResponseEntity<?> fetchZhongtaiData(@RequestBody Map<String, Object> body) {
        try {
            String apiUrl = (String) body.get("apiUrl");
            if (apiUrl == null || apiUrl.isEmpty()) {
                Map<String, Object> error = new LinkedHashMap<>();
                error.put("error", "API 地址不能为空");
                return ResponseEntity.badRequest().body(error);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> variableParams = (Map<String, Object>) body.getOrDefault("variableParams", new HashMap<>());

            Map<String, Object> result = zhongtaiApiService.fetchData(apiUrl, variableParams);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}
