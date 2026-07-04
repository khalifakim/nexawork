package com.nexawork.auth;

import com.nexawork.auth.dtos.requests.CreateInvitationsRequest;
import com.nexawork.auth.dtos.requests.LeaveWorkspaceRequest;
import com.nexawork.auth.dtos.requests.UpdateMemberRoleRequest;
import com.nexawork.auth.entities.enums.OrgRole;
import com.nexawork.auth.repositories.InvitationRepository;
import com.nexawork.auth.repositories.RefreshTokenRepository;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test d'intégration Testcontainers (§E.7) — parcours complet sur PostgreSQL
 * éphémère avec la vraie chaîne de sécurité :
 * register → create workspace (REF I) → refresh avec contexte → invitation →
 * accept → R18 (400 sur OWNER) → REF H (403 delete par non-OWNER) → R20 (leave).
 */
// Ignoré par défaut : Testcontainers exige un démon Docker joignable par
// docker-java, ce que certaines versions de Docker Desktop sous Windows ne
// permettent pas (endpoint /info -> 400). Activer en CI ou sur une machine
// compatible avec :  RUN_INTEGRATION_TESTS=true mvn test
// La condition est évaluée AVANT l'extension Testcontainers, donc l'absence de
// Docker ignore proprement la classe au lieu de faire échouer le build.
@EnabledIfEnvironmentVariable(named = "RUN_INTEGRATION_TESTS", matches = "true")
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "nexawork.jwt.base64-secret=bmV4YXdvcmstdGVzdC1zZWNyZXQta2V5LW9mLXNpeHR5LWZvdXItYnl0ZXMtbWluaW11bS1mb3ItaHM1MTIhIQ==",
        "nexawork.jwt.token-validity-in-seconds=900",
        "nexawork.jwt.refresh-token-validity-in-days=7",
        "nexawork.mail.enabled=false",
        "nexawork.mail.from=test@nexawork.io",
        "spring.mail.host=localhost",
        "spring.rabbitmq.host=localhost",
        "spring.cloud.config.enabled=false"
})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthFlowIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired
    TestRestTemplate rest;

    @Autowired
    InvitationRepository invitationRepository;

    @Autowired
    RefreshTokenRepository refreshTokenRepository;

    // État partagé du parcours
    static String ownerAccess;
    static String ownerRefresh;
    static UUID workspaceId;
    static String memberAccess;
    static UUID ownerMemberId;

    @Test
    @Order(1)
    void register_shouldCreateAccountAndReturnTokens() {
        ResponseEntity<Map> response = rest.postForEntity("/api/v1/auth/register", json(Map.of(
                "firstName", "Khalif", "lastName", "Ba",
                "email", "owner@test.io", "password", "password123",
                "jobTitle", "Fondateur")), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map payload = payload(response);
        ownerAccess = (String) payload.get("accessToken");
        ownerRefresh = (String) payload.get("refreshToken");
        assertThat(ownerAccess).isNotBlank();
        assertThat(payload.get("activeWorkspaceId")).isNull();
    }

    @Test
    @Order(2)
    void login_shouldAuthenticate() {
        ResponseEntity<Map> response = rest.postForEntity("/api/v1/auth/login", json(Map.of(
                "email", "owner@test.io", "password", "password123")), Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @Order(3)
    void createWorkspace_shouldNotSwitchContext_REF_I() {
        ResponseEntity<Map> response = rest.exchange("/api/v1/workspaces", HttpMethod.POST,
                authJson(ownerAccess, Map.of("name", "Espace Test", "color", "#6C70F0")), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map payload = payload(response);
        workspaceId = UUID.fromString((String) payload.get("id"));
        assertThat(payload.get("myRole")).isEqualTo("OWNER");
    }

    @Test
    @Order(4)
    void refresh_withWorkspaceId_shouldRotateAndSetContext() {
        ResponseEntity<Map> response = rest.postForEntity("/api/v1/auth/refresh", json(Map.of(
                "refreshToken", ownerRefresh, "workspaceId", workspaceId.toString())), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map payload = payload(response);
        assertThat(payload.get("activeWorkspaceId")).isEqualTo(workspaceId.toString());

        String oldRefresh = ownerRefresh;
        ownerAccess = (String) payload.get("accessToken");
        ownerRefresh = (String) payload.get("refreshToken");

        // Rotation : l'ancien refresh token est révoqué → 401
        ResponseEntity<Map> replay = rest.postForEntity("/api/v1/auth/refresh", json(Map.of(
                "refreshToken", oldRefresh)), Map.class);
        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @Order(5)
    void inviteAndAccept_shouldCreateMemberWithImposedRole() {
        ResponseEntity<Map> sent = rest.exchange("/api/v1/workspaces/" + workspaceId + "/invitations",
                HttpMethod.POST, authJson(ownerAccess, new CreateInvitationsRequest(
                        List.of("member@test.io"), OrgRole.MEMBER)), Map.class);
        assertThat(sent.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // Le token part par email — on le lit en base comme le ferait le destinataire
        String token = invitationRepository.findAllByOrganisationId(workspaceId).get(0).getToken();

        ResponseEntity<Map> context = rest.getForEntity("/api/v1/invitations/" + token, Map.class);
        assertThat(context.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(payload(context).get("workspaceName")).isEqualTo("Espace Test");

        ResponseEntity<Map> accepted = rest.postForEntity("/api/v1/invitations/" + token + "/accept",
                json(Map.of("firstName", "Membre", "lastName", "Test",
                        "email", "member@test.io", "password", "password123")), Map.class);
        assertThat(accepted.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map payload = payload(accepted);
        memberAccess = (String) payload.get("accessToken");
        assertThat(payload.get("activeWorkspaceId")).isEqualTo(workspaceId.toString());
    }

    @Test
    @Order(6)
    void changeRole_onOwner_shouldReturn400_R18() {
        ResponseEntity<Map> members = rest.exchange("/api/v1/workspaces/" + workspaceId + "/members",
                HttpMethod.GET, auth(ownerAccess), Map.class);
        List<Map> list = (List<Map>) members.getBody().get("payload");
        ownerMemberId = UUID.fromString((String) list.stream()
                .filter(member -> Boolean.TRUE.equals(member.get("isOwner")))
                .findFirst().orElseThrow().get("id"));

        ResponseEntity<Map> response = rest.exchange("/api/v1/workspace-members/" + ownerMemberId + "/role",
                HttpMethod.PATCH, authJson(ownerAccess, new UpdateMemberRoleRequest(OrgRole.ADMIN)), Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @Order(7)
    void deleteWorkspace_byNonOwner_shouldReturn403_REF_H() {
        ResponseEntity<Map> response = rest.exchange("/api/v1/workspaces/" + workspaceId,
                HttpMethod.DELETE, auth(memberAccess), Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @Order(8)
    void leave_activeWorkspace_shouldRevokeSessionAndReturnWasActive_R20() {
        ResponseEntity<Map> response = rest.exchange("/api/v1/workspace-members/leave",
                HttpMethod.POST, authJson(memberAccess, new LeaveWorkspaceRequest(workspaceId)), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(payload(response).get("wasActive")).isEqualTo(true);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private HttpEntity<Object> json(Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    private HttpEntity<Object> authJson(String token, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return new HttpEntity<>(body, headers);
    }

    private HttpEntity<Void> auth(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(headers);
    }

    private Map payload(ResponseEntity<Map> response) {
        return (Map) response.getBody().get("payload");
    }
}
