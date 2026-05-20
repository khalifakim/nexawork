package com.nexawork.auth.controllers;

import com.nexawork.auth.dtos.requests.LoginRequest;
import com.nexawork.auth.dtos.requests.RegisterRequest;
import com.nexawork.auth.dtos.responses.AuthResponse;
import com.nexawork.auth.dtos.responses.UserResponse;
import com.nexawork.auth.entities.User;
import com.nexawork.auth.exceptions.ResourceNotFoundException;
import com.nexawork.auth.repositories.UserRepository;
import com.nexawork.auth.security.SecurityUtils;
import com.nexawork.auth.services.AuthService;
import com.nexawork.auth.utils.Response;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Authentication")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @Operation(summary = "Créer un compte")
    @PostMapping("/register")
    public ResponseEntity<Response<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Response.created(user, "Compte créé avec succès"));
    }

    @Operation(summary = "Connexion")
    @PostMapping("/login")
    public ResponseEntity<Response<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse auth = authService.login(request);
        return ResponseEntity.ok(Response.ok(auth, "Connexion réussie"));
    }

    @Operation(summary = "Rafraîchir le token d'accès")
    @PostMapping("/refresh")
    public ResponseEntity<Response<AuthResponse>> refresh(@RequestHeader("X-Refresh-Token") String refreshToken) {
        AuthResponse auth = authService.refresh(refreshToken);
        return ResponseEntity.ok(Response.ok(auth, "Token rafraîchi"));
    }

    @Operation(summary = "Déconnexion")
    @PostMapping("/logout")
    public ResponseEntity<Response<Void>> logout(@RequestHeader("X-Refresh-Token") String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.ok(Response.ok(null, "Déconnecté avec succès"));
    }

    @Operation(summary = "Profil de l'utilisateur connecté")
    @GetMapping("/me")
    public ResponseEntity<Response<UserResponse>> me() {
        String email = SecurityUtils.getCurrentUserLogin()
            .orElseThrow(() -> new RuntimeException("Non authentifié"));
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        UserResponse dto = new UserResponse(
            user.getId(), user.getEmail(),
            user.getDisplayName(), user.getAvatarUrl(), user.getIsActive()
        );
        return ResponseEntity.ok(Response.ok(dto, "Profil récupéré"));
    }
}
