package com.nexawork.project.security;

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

    public static Optional<Long> getCurrentOrganisationId() {
        return getHeader("X-Organisation-Id")
            .filter(s -> !s.isBlank())
            .map(Long::parseLong);
    }

    public static Optional<String> getCurrentUserRole() {
        return getHeader("X-User-Role");
    }

    private static Optional<String> getHeader(String name) {
        var attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes sra) {
            HttpServletRequest req = sra.getRequest();
            return Optional.ofNullable(req.getHeader(name));
        }
        return Optional.empty();
    }
}
