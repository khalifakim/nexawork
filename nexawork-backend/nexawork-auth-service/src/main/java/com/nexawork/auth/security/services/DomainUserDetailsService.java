package com.nexawork.auth.security.services;

import com.nexawork.commons.exceptions.UserDisabledException;
import com.nexawork.auth.repositories.UserRepository;
import com.nexawork.auth.security.rules.NexaWorkPermissions;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.text.MessageFormat;
import java.util.List;

/**
 * Authentifie un utilisateur depuis la base par email (clone Smart-Mifin).
 * Les authorities au login sont les permissions de base — les permissions de
 * rôle sont injectées dans le JWT selon le workspace actif (AuthenticationService).
 */
@Component("userDetailsService")
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DomainUserDetailsService implements UserDetailsService {

    static final String ACCOUNT_LOCKED = "Ce compte est désactivé : {0}";

    UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public User loadUserByUsername(final String username) {
        log.debug("Authenticating {}", username);

        var userEntity = userRepository.findByEmailIgnoreCase(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        MessageFormat.format("User {0} was not found in the database", username)));

        if (Boolean.FALSE.equals(userEntity.getIsActive())) {
            throw new UserDisabledException(MessageFormat.format(ACCOUNT_LOCKED, username));
        }

        List<GrantedAuthority> grantedAuthorities = NexaWorkPermissions.base().stream()
                .map(permission -> (GrantedAuthority) new SimpleGrantedAuthority(permission.name()))
                .toList();

        return new User(userEntity.getEmail(), userEntity.getPasswordHash(), grantedAuthorities);
    }
}
