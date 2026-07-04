package com.nexawork.commons.security;

import com.nexawork.commons.security.rules.SecurityRule;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Collecte tous les beans {@link SecurityRule} du microservice et les applique
 * sur la HttpSecurity — clone fidèle de Smart-Mifin.
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WebSecurityManager {

    final List<SecurityRule> securityRules;

    public void manageSecurityRules(HttpSecurity http) throws Exception {
        for (SecurityRule securityRule : securityRules) {
            securityRule.configure(http);
        }
    }
}
