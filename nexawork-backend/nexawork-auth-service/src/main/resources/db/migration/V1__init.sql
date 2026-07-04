-- ============================================================================
-- NexaWork Auth Service — V1__init.sql
-- Conforme V5.1 §4.1 / §5.1 (modèle V5 : first_name/last_name/photo_url,
-- displayName dérivé non stocké). Toutes les entités héritent d'Auditable.
-- ============================================================================

-- ─── users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255)    NOT NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    first_name          VARCHAR(120)    NOT NULL,
    last_name           VARCHAR(120)    NOT NULL,
    job_title           VARCHAR(255),
    photo_url           VARCHAR(1024),
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    email_verified      BOOLEAN         NOT NULL DEFAULT FALSE,
    pending_email       VARCHAR(255),
    last_seen_at        TIMESTAMP,
    created_by          VARCHAR(255),
    created_date        TIMESTAMP,
    last_modified_by    VARCHAR(255),
    last_modified_date  TIMESTAMP,
    CONSTRAINT uk_users_email UNIQUE (email)
);

-- ─── organisations (= workspaces) ───────────────────────────────────────────
CREATE TABLE organisations (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255)    NOT NULL,
    slug                VARCHAR(255)    NOT NULL,
    color               VARCHAR(9)      NOT NULL,
    icon_url            VARCHAR(1024),
    created_by          VARCHAR(255),
    created_date        TIMESTAMP,
    last_modified_by    VARCHAR(255),
    last_modified_date  TIMESTAMP,
    CONSTRAINT uk_organisations_slug UNIQUE (slug)
);

-- ─── organisation_members ───────────────────────────────────────────────────
CREATE TABLE organisation_members (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id     UUID            NOT NULL,
    user_id             UUID            NOT NULL,
    org_role            VARCHAR(50)     NOT NULL DEFAULT 'MEMBER',
    joined_at           TIMESTAMP       NOT NULL DEFAULT NOW(),
    is_owner            BOOLEAN         NOT NULL DEFAULT FALSE,
    is_deactivated      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_by          VARCHAR(255),
    created_date        TIMESTAMP,
    last_modified_by    VARCHAR(255),
    last_modified_date  TIMESTAMP,
    CONSTRAINT uk_organisation_members_org_user UNIQUE (organisation_id, user_id),
    CONSTRAINT fk_organisation_members_organisation FOREIGN KEY (organisation_id)
        REFERENCES organisations (id) ON DELETE CASCADE,
    CONSTRAINT fk_organisation_members_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_organisation_members_organisation_id ON organisation_members (organisation_id);
CREATE INDEX idx_organisation_members_user_id ON organisation_members (user_id);

-- ─── refresh_tokens ─────────────────────────────────────────────────────────
-- active_organisation_id : workspace actif de la session (R20 — révocation
-- ciblée au self-leave ; claim organisationId du JWT).
CREATE TABLE refresh_tokens (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID            NOT NULL,
    token                   VARCHAR(512)    NOT NULL,
    expires_at              TIMESTAMP       NOT NULL,
    revoked                 BOOLEAN         NOT NULL DEFAULT FALSE,
    active_organisation_id  UUID,
    created_by              VARCHAR(255),
    created_date            TIMESTAMP,
    last_modified_by        VARCHAR(255),
    last_modified_date      TIMESTAMP,
    CONSTRAINT uk_refresh_tokens_token UNIQUE (token),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);

-- ─── invitations ────────────────────────────────────────────────────────────
CREATE TABLE invitations (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id     UUID            NOT NULL,
    email               VARCHAR(255)    NOT NULL,
    token               VARCHAR(512)    NOT NULL,
    status              VARCHAR(50)     NOT NULL DEFAULT 'PENDING',
    expires_at          TIMESTAMP       NOT NULL,
    role                VARCHAR(50)     NOT NULL DEFAULT 'MEMBER',
    invited_by          UUID,
    created_by          VARCHAR(255),
    created_date        TIMESTAMP,
    last_modified_by    VARCHAR(255),
    last_modified_date  TIMESTAMP,
    CONSTRAINT uk_invitations_token UNIQUE (token),
    CONSTRAINT fk_invitations_organisation FOREIGN KEY (organisation_id)
        REFERENCES organisations (id) ON DELETE CASCADE,
    CONSTRAINT fk_invitations_invited_by FOREIGN KEY (invited_by)
        REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_invitations_organisation_id ON invitations (organisation_id);
CREATE INDEX idx_invitations_email ON invitations (email);

-- ─── user_action_tokens ─────────────────────────────────────────────────────
-- Tokens à usage unique envoyés par email : vérification d'adresse (§3.5),
-- réinitialisation de mot de passe (§3.4). Complément V5.1 §4.1.
CREATE TABLE user_action_tokens (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL,
    token               VARCHAR(512)    NOT NULL,
    type                VARCHAR(50)     NOT NULL,
    expires_at          TIMESTAMP       NOT NULL,
    used_at             TIMESTAMP,
    created_by          VARCHAR(255),
    created_date        TIMESTAMP,
    last_modified_by    VARCHAR(255),
    last_modified_date  TIMESTAMP,
    CONSTRAINT uk_user_action_tokens_token UNIQUE (token),
    CONSTRAINT fk_user_action_tokens_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_user_action_tokens_user_id ON user_action_tokens (user_id);

-- ─── audit_trail (@Journal AOP) ─────────────────────────────────────────────
CREATE TABLE audit_trail (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type  VARCHAR(255)   NOT NULL,
    entity_name  VARCHAR(255),
    entity_id    VARCHAR(255),
    actor        VARCHAR(255)   NOT NULL,
    action_date  TIMESTAMP      NOT NULL DEFAULT NOW(),
    details      TEXT
);

CREATE INDEX idx_audit_trail_action_date ON audit_trail (action_date);
