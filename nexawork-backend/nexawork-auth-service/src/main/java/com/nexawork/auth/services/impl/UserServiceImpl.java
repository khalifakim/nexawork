package com.nexawork.auth.services.impl;

import com.nexawork.commons.exceptions.PasswordException;
import com.nexawork.commons.exceptions.ResourceAlreadyExistException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.commons.security.SecurityUtils;
import com.nexawork.auth.dtos.requests.ChangeEmailRequest;
import com.nexawork.auth.dtos.requests.ChangePasswordRequest;
import com.nexawork.auth.dtos.requests.UpdateProfileRequest;
import com.nexawork.auth.dtos.responses.UserProfileResponse;
import com.nexawork.auth.entities.User;
import com.nexawork.auth.entities.UserActionToken;
import com.nexawork.auth.entities.enums.ActionTokenType;
import com.nexawork.auth.mappers.UserMapper;
import com.nexawork.auth.repositories.RefreshTokenRepository;
import com.nexawork.auth.repositories.UserActionTokenRepository;
import com.nexawork.auth.repositories.UserRepository;
import com.nexawork.auth.services.EmailSender;
import com.nexawork.auth.services.UserService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Profil de l'utilisateur courant (§13.1, §15.1). PATCH profil atomique :
 * les champs absents (nuls) ne sont jamais effacés.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserServiceImpl implements UserService {

    UserRepository userRepository;
    RefreshTokenRepository refreshTokenRepository;
    UserActionTokenRepository userActionTokenRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;
    EmailSender emailSender;

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getMe() {
        return userMapper.asDto(currentUser());
    }

    @Override
    public UserProfileResponse updateProfile(UpdateProfileRequest request) {
        User user = currentUser();
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getJobTitle() != null) {
            user.setJobTitle(request.getJobTitle());
        }
        if (request.getPhotoUrl() != null) {
            user.setPhotoUrl(request.getPhotoUrl());
        }
        return userMapper.asDto(userRepository.save(user));
    }

    @Override
    public void changePassword(ChangePasswordRequest request) {
        User user = currentUser();
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new PasswordException("Le mot de passe actuel est incorrect.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        // Les autres sessions sont invalidées après changement de mot de passe
        refreshTokenRepository.revokeAllByUserId(user.getId());
        log.info("Mot de passe changé pour {}", user.getEmail());
    }

    @Override
    public void requestEmailChange(ChangeEmailRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getNewEmail())) {
            throw new ResourceAlreadyExistException("Un compte existe déjà avec cet email.");
        }
        User user = currentUser();
        user.setPendingEmail(request.getNewEmail().toLowerCase());
        userRepository.save(user);

        UserActionToken changeToken = userActionTokenRepository.save(UserActionToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .type(ActionTokenType.EMAIL_CHANGE)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build());
        // Le lien part vers la NOUVELLE adresse — elle seule prouve sa validité
        emailSender.sendEmailChangeConfirmation(request.getNewEmail(), user.getFirstName(), changeToken.getToken());
        log.info("Changement d'email demandé pour {} → {}", user.getEmail(), request.getNewEmail());
    }

    private User currentUser() {
        String email = SecurityUtils.getCurrentUserLogin()
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non authentifié."));
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }
}
