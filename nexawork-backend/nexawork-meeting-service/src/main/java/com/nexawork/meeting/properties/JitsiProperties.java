package com.nexawork.meeting.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Component;

@Data
@Component
@RefreshScope
@ConfigurationProperties(prefix = "nexawork.jaas")
public class JitsiProperties {
    private String appId;
    private String apiKeyId;
    private String privateKey;
    private String url;
}
