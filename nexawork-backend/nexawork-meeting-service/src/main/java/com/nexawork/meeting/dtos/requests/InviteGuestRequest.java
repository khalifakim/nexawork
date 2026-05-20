package com.nexawork.meeting.dtos.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record InviteGuestRequest(
    @Email @NotBlank String email,
    @NotBlank String displayName
) {}
