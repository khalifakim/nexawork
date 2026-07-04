package com.nexawork.auth.repositories;

import com.nexawork.auth.entities.UserActionToken;
import com.nexawork.auth.entities.enums.ActionTokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserActionTokenRepository extends JpaRepository<UserActionToken, UUID> {

    Optional<UserActionToken> findByTokenAndType(String token, ActionTokenType type);
}
