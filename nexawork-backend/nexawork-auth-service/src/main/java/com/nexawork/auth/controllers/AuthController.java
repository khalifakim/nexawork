package com.nexawork.auth.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.auth.dtos.requests.LoginRequest;
import com.nexawork.auth.dtos.requests.LogoutRequest;
import com.nexawork.auth.dtos.requests.PasswordResetConfirmRequest;
import com.nexawork.auth.dtos.requests.PasswordResetRequest;
import com.nexawork.auth.dtos.requests.RefreshTokenRequest;
import com.nexawork.auth.dtos.requests.RegisterRequest;
import com.nexawork.auth.dtos.requests.VerifyEmailRequest;
import com.nexawork.auth.dtos.responses.AuthResponse;
import com.nexawork.auth.services.AuthenticationService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints d'authentification (§13.1 /auth/**).
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthController {

    AuthenticationService authenticationService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return Response.<AuthResponse>created().setPayload(authenticationService.register(request));
    }

    @PostMapping("/login")
    public Response<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return Response.<AuthResponse>ok().setPayload(authenticationService.login(request));
    }

    @PostMapping("/refresh")
    public Response<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return Response.<AuthResponse>ok().setPayload(authenticationService.refresh(request));
    }

    @PostMapping("/logout")
    public Response<Void> logout(@Valid @RequestBody LogoutRequest request) {
        authenticationService.logout(request);
        return Response.ok();
    }

    @PostMapping("/password/reset-request")
    public Response<Void> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        authenticationService.requestPasswordReset(request);
        // Toujours 200 — pas de divulgation d'existence de compte (§3.4)
        return Response.ok();
    }

    @PostMapping("/password/reset")
    public Response<Void> resetPassword(@Valid @RequestBody PasswordResetConfirmRequest request) {
        authenticationService.resetPassword(request);
        return Response.ok();
    }

    @PostMapping("/verify-email")
    public Response<AuthResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return Response.<AuthResponse>ok().setPayload(authenticationService.verifyEmail(request));
    }
}
