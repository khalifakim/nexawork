package com.nexawork.project.security;

import com.nexawork.commons.security.SecurityUtils;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Filtre d'identité inter-services : le Project Service fait confiance à l'API
 * Gateway, qui a déjà validé le JWT et propage l'identité via les headers
 * {@code X-User-Id} / {@code X-Org-Id} / {@code X-Org-Role} (V5.1 §14.10).
 *
 * <p>Le filtre reconstruit un objet {@link Claims} à partir de ces headers et le
 * dépose dans les {@code details} de l'{@code Authentication}, exactement comme
 * le fait le {@code TokenProvider} côté Auth Service. Ainsi le
 * {@link SecurityUtils} de {@code nexawork-commons} (userId, organisationId,
 * orgRole) et l'{@code AuditorAwareImpl} fonctionnent sans aucune adaptation.</p>
 *
 * <p>Le service ne détient pas le secret JWT : toute requête atteignant ce
 * service est réputée déjà authentifiée par le Gateway. En accès direct (hors
 * Gateway), l'absence de {@code X-User-Id} laisse le contexte anonyme → 401 via
 * la chaîne de sécurité.</p>
 */
public class GatewayIdentityFilter extends OncePerRequestFilter {

    public static final String HEADER_USER_ID = "X-User-Id";
    public static final String HEADER_ORG_ID = "X-Org-Id";
    public static final String HEADER_ORG_ROLE = "X-Org-Role";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String userId = request.getHeader(HEADER_USER_ID);

        if (StringUtils.hasText(userId) && SecurityContextHolder.getContext().getAuthentication() == null) {
            String organisationId = request.getHeader(HEADER_ORG_ID);
            String orgRole = request.getHeader(HEADER_ORG_ROLE);

            var claimsBuilder = Jwts.claims()
                    .subject(userId)
                    .add(SecurityUtils.CLAIM_USER_ID, userId);
            if (StringUtils.hasText(organisationId)) {
                claimsBuilder.add(SecurityUtils.CLAIM_ORGANISATION_ID, organisationId);
            }
            if (StringUtils.hasText(orgRole)) {
                claimsBuilder.add(SecurityUtils.CLAIM_ORG_ROLE, orgRole);
            }
            Claims claims = claimsBuilder.build();

            // Une seule autorité dérivée du rôle workspace (ROLE_OWNER/ADMIN/MEMBER) ;
            // le détail des règles REF/R est appliqué en couche service (403 explicites).
            List<GrantedAuthority> authorities = StringUtils.hasText(orgRole)
                    ? List.of(new SimpleGrantedAuthority("ROLE_" + orgRole))
                    : List.of();

            var authentication = new UsernamePasswordAuthenticationToken(userId, null, authorities);
            authentication.setDetails(claims);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}
