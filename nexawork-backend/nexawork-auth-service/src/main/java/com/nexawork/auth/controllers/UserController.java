package com.nexawork.auth.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.auth.dtos.requests.ChangeEmailRequest;
import com.nexawork.auth.dtos.requests.ChangePasswordRequest;
import com.nexawork.auth.dtos.requests.UpdateProfileRequest;
import com.nexawork.auth.dtos.responses.UserProfileResponse;
import com.nexawork.auth.services.UserService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Profil de l'utilisateur courant (§13.1 /users/me/**).
 */
@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {

    UserService userService;

    @GetMapping
    public Response<UserProfileResponse> getMe() {
        return Response.<UserProfileResponse>ok().setPayload(userService.getMe());
    }

    @PatchMapping("/profile")
    public Response<UserProfileResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return Response.<UserProfileResponse>ok().setPayload(userService.updateProfile(request));
    }

    @PatchMapping("/password")
    public Response<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request);
        return Response.ok();
    }

    @PostMapping("/email")
    public Response<Void> requestEmailChange(@Valid @RequestBody ChangeEmailRequest request) {
        userService.requestEmailChange(request);
        return Response.ok();
    }
}
