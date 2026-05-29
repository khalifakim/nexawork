package com.nexawork.ged.security;

import com.nexawork.ged.security.rules.SecurityRule;
import lombok.RequiredArgsConstructor;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class WebSecurityManager {

    private final List<SecurityRule> securityRules;

    public void manageSecurityRules(HttpSecurity http) throws Exception {
        for (SecurityRule rule : securityRules) {
            rule.configure(http);
        }
    }
}
