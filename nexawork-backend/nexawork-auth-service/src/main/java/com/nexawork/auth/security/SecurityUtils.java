package com.nexawork.auth.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Optional<String> getCurrentUserLogin() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) return Optional.empty();

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails ud) {
            return Optional.of(ud.getUsername());
        }
        if (principal instanceof String s) {
            return Optional.of(s);
        }
        return Optional.empty();
    }
}
