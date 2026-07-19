package com.antv.l7vp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * 数据中台 SSO 配置
 */
@Configuration
public class ZhongtaiConfig {

    @Value("${zhongtai.sso.url:}")
    private String ssoUrl;

    @Value("${zhongtai.sso.username:}")
    private String ssoUsername;

    @Value("${zhongtai.sso.password:}")
    private String ssoPassword;

    @Value("${zhongtai.sso.grant-type:password}")
    private String ssoGrantType;

    @Value("${zhongtai.sso.client-id:}")
    private String ssoClientId;

    @Value("${zhongtai.sso.client-secret:}")
    private String ssoClientSecret;

    @Value("${zhongtai.api.space-id:}")
    private String apiSpaceId;

    @Value("${zhongtai.api.scope-type:Space}")
    private String apiScopeType;

    @Value("${zhongtai.api.tenant-id:}")
    private String apiTenantId;

    @Value("${zhongtai.token.cache-minutes:30}")
    private int tokenCacheMinutes;

    public String getSsoUrl() { return ssoUrl; }
    public String getSsoUsername() { return ssoUsername; }
    public String getSsoPassword() { return ssoPassword; }
    public String getSsoGrantType() { return ssoGrantType; }
    public String getSsoClientId() { return ssoClientId; }
    public String getSsoClientSecret() { return ssoClientSecret; }
    public String getApiSpaceId() { return apiSpaceId; }
    public String getApiScopeType() { return apiScopeType; }
    public String getApiTenantId() { return apiTenantId; }
    public int getTokenCacheMinutes() { return tokenCacheMinutes; }
}
