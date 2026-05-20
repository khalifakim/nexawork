package com.nexawork.auth.security.services;

import com.nexawork.auth.repositories.UserRepository;
import com.nexawork.auth.security.rules.NexaWorkPermissions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DomainUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
            .map(user -> {
                if (!user.getIsActive()) {
                    throw new RuntimeException("Compte désactivé : " + email);
                }
                return new org.springframework.security.core.userdetails.User(
                    user.getEmail(),
                    user.getPasswordHash(),
                    List.of(new SimpleGrantedAuthority(NexaWorkPermissions.ALL_ACCESS.name()))
                );
            })
            .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable : " + email));
    }
}
