package com.nexawork.auth.services;

import com.nexawork.auth.dtos.requests.ChangeEmailRequest;
import com.nexawork.auth.dtos.requests.ChangePasswordRequest;
import com.nexawork.auth.dtos.requests.UpdateProfileRequest;
import com.nexawork.auth.dtos.responses.UserProfileResponse;

/**
 * Profil de l'utilisateur courant (§13.1 /users/me/**, §15.1).
 */
public interface UserService {

    UserProfileResponse getMe();

    UserProfileResponse updateProfile(UpdateProfileRequest request);

    void changePassword(ChangePasswordRequest request);

    void requestEmailChange(ChangeEmailRequest request);
}
