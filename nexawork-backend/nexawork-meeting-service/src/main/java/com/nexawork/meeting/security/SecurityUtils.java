package com.nexawork.meeting.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Optional;

public final class SecurityUtils {
    private SecurityUtils() {}

    public static Optional<Long> getCurrentUserId() {
        return getHeader("X-User-Id").map(Long::parseLong);
    }

    public static Optional<String> getCurrentUserEmail() {
        return getHeader("X-User-Email");
    }

    public static Optional<String> getCurrentDisplayName() {
        return getHeader("X-User-Display-Name");
    }

    public static Optional<Long> getCurrentOrganisationId() {
        return getHeader("X-Organisation-Id").filter(s -> !s.isBlank()).map(Long::parseLong);
    }

    private static Optional<String> getHeader(String name) {
        var attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes sra) {
            return Optional.ofNullable(sra.getRequest().getHeader(name));
        }
        return Optional.empty();
    }
}
