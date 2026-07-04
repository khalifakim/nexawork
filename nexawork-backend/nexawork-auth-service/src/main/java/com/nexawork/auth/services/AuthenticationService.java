package com.nexawork.auth.services;

import com.nexawork.auth.dtos.requests.LoginRequest;
import com.nexawork.auth.dtos.requests.LogoutRequest;
import com.nexawork.auth.dtos.requests.PasswordResetConfirmRequest;
import com.nexawork.auth.dtos.requests.PasswordResetRequest;
import com.nexawork.auth.dtos.requests.RefreshTokenRequest;
import com.nexawork.auth.dtos.requests.RegisterRequest;
import com.nexawork.auth.dtos.requests.VerifyEmailRequest;
import com.nexawork.auth.dtos.responses.AuthResponse;

/**
 * Identité et session JWT (§13.1 /auth/**) : register, login, rotation du
 * refresh token (avec switch de contexte workspace), logout, reset, vérification.
 */
public interface AuthenticationService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refresh(RefreshTokenRequest request);

    void logout(LogoutRequest request);

    void requestPasswordReset(PasswordResetRequest request);

    void resetPassword(PasswordResetConfirmRequest request);

    void verifyEmail(VerifyEmailRequest request);
}
