package com.antv.l7vp.service;

import com.antv.l7vp.config.ZhongtaiConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 中台 API 调用服务：SSO token 管理 + 数据 API 代理
 */
@Service
public class ZhongtaiApiService {

    private static final Logger log = LoggerFactory.getLogger(ZhongtaiApiService.class);

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ZhongtaiConfig config;

    @Autowired
    private ObjectMapper objectMapper;

    /** 缓存的 token */
    private String cachedToken;
    /** token 过期时间 */
    private LocalDateTime tokenExpireTime;

    /**
     * 获取 SSO access_token（缓存 30 分钟）
     */
    private synchronized String getToken() {
        if (cachedToken != null && tokenExpireTime != null && LocalDateTime.now().isBefore(tokenExpireTime)) {
            return cachedToken;
        }

        String ssoUrl = config.getSsoUrl();
        if (ssoUrl == null || ssoUrl.isEmpty()) {
            throw new RuntimeException("中台 SSO 地址未配置");
        }

        // 构建 SSO 请求 URL
        String url = ssoUrl + "?username=" + config.getSsoUsername()
                + "&password=" + config.getSsoPassword()
                + "&grant_type=" + config.getSsoGrantType()
                + "&client_id=" + config.getSsoClientId()
                + "&client_secret=" + config.getSsoClientSecret();

        log.info("获取中台 SSO token: {}", ssoUrl);

        try {
            ResponseEntity<String> resp = restTemplate.postForEntity(url, null, String.class);
            String respBody = resp.getBody();
            log.info("SSO token 返回: {}", respBody);
            @SuppressWarnings("unchecked")
            Map<String, Object> tokenMap = objectMapper.readValue(respBody, Map.class);
            cachedToken = tokenMap.get("access_token").toString();

            // 缓存 N 分钟（提前 1 分钟过期，避免边界情况）
            int cacheMinutes = config.getTokenCacheMinutes();
            tokenExpireTime = LocalDateTime.now().plusMinutes(cacheMinutes).minusSeconds(60);

            return cachedToken;
        } catch (Exception e) {
            log.error("获取中台 SSO token 失败", e);
            throw new RuntimeException("获取中台 SSO token 失败: " + e.getMessage(), e);
        }
    }

    /**
     * 调用中台数据 API
     * @param apiUrl 完整的 API 地址
     * @param variableParams 用户自定义变量参数
     * @return API 返回数据
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> fetchData(String apiUrl, Map<String, Object> variableParams) {
        String token = getToken();

        // 构建请求体
        Map<String, Object> dataServiceParams = new HashMap<>();
        dataServiceParams.put("variableParams", variableParams != null ? variableParams : new HashMap<>());

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("sqlMode", "normal");
        requestBody.put("rowType", "map");
        requestBody.put("dataServiceParams", dataServiceParams);

        // 构建 headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + token);
        headers.set("spaceId", config.getApiSpaceId());
        headers.set("scopeType", config.getApiScopeType());
        if (config.getApiTenantId() != null && !config.getApiTenantId().isEmpty()) {
            headers.set("tenantId", config.getApiTenantId());
        }

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        log.info("调用中台数据 API: {}", apiUrl);

        try {
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);
            String respBody = response.getBody();
            log.info("中台 API 返回数据长度: {}", respBody != null ? respBody.length() : 0);
            return objectMapper.readValue(respBody, Map.class);
        } catch (Exception e) {
            log.error("调用中台数据 API 失败", e);
            throw new RuntimeException("调用中台数据 API 失败: " + e.getMessage(), e);
        }
    }
}
