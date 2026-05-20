package com.nexawork.meeting.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "nexawork.jitsi")
public class JitsiProperties {
    private String appId;
    private String secret;
    private String url;
}
