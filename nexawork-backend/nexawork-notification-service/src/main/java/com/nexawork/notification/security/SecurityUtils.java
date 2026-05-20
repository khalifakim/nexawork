package com.nexawork.notification.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Optional;

public final class SecurityUtils {
    private SecurityUtils() {}

    public static Optional<Long> getCurrentUserId() {
        return getHeader("X-User-Id").map(Long::parseLong);
    }

    private static Optional<String> getHeader(String name) {
        var attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes sra) {
            return Optional.ofNullable(sra.getRequest().getHeader(name));
        }
        return Optional.empty();
    }
}
