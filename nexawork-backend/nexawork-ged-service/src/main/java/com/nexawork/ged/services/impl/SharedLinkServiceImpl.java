package com.nexawork.ged.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.ged.dtos.requests.CreateShareLinkRequest;
import com.nexawork.ged.dtos.responses.PublicShareFileResponse;
import com.nexawork.ged.dtos.responses.PublicShareResponse;
import com.nexawork.ged.dtos.responses.ShareLinkResponse;
import com.nexawork.ged.entities.GedFile;
import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.entities.SharedLink;
import com.nexawork.ged.entities.enums.AccessMode;
import com.nexawork.ged.entities.enums.ShareMode;
import com.nexawork.ged.entities.enums.TargetType;
import com.nexawork.ged.repositories.GedFileRepository;
import com.nexawork.ged.repositories.GedFolderRepository;
import com.nexawork.ged.repositories.SharedLinkRepository;
import com.nexawork.ged.security.CallerContext;
import com.nexawork.ged.services.AccessEvaluator;
import com.nexawork.ged.services.GedFileClient;
import com.nexawork.ged.services.GedGuard;
import com.nexawork.ged.services.SharedLinkService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Liens de partage externes (Brique 4). Toute la sécurité vit ici : validation du
 * token, de l'expiration (date / nombre d'accès), du mot de passe, du mode et de la
 * portée. Le relais des octets (download / upload) passe par {@link GedFileClient}
 * qui forge une identité de confiance vers le File Service.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SharedLinkServiceImpl implements SharedLinkService {

    /** Taille max par défaut d'un dépôt externe : alignée sur le File Service (25 Mo). */
    static final long DEFAULT_MAX_UPLOAD_BYTES = 25L * 1024 * 1024;

    /** Extensions toujours refusées au dépôt, quelles que soient les autorisations du lien. */
    static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            "exe", "bat", "cmd", "com", "msi", "scr", "js", "jse", "vbs", "vbe",
            "ps1", "sh", "jar", "dll", "apk", "app", "deb", "rpm");

    SharedLinkRepository sharedLinkRepository;
    GedFileRepository fileRepository;
    GedFolderRepository folderRepository;
    GedFileClient fileClient;
    AccessEvaluator access;
    GedGuard guard;
    CallerContext caller;

    SecureRandom random = new SecureRandom();
    PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // ═══════════════════════════ Authentifié ════════════════════════════════════

    @Override
    public ShareLinkResponse create(CreateShareLinkRequest request) {
        UUID org = caller.organisationId();
        String targetName;

        if (request.getTargetType() == TargetType.FILE) {
            if (request.getMode() == ShareMode.DROP) {
                throw new InvalidRequestException(
                        "Une boîte de dépôt cible un dossier, pas un fichier.");
            }
            GedFile file = guard.loadFileInOrg(request.getTargetId());
            access.requireViewable(file);
            targetName = file.getName();
        } else {
            GedFolder folder = guard.loadFolderInOrg(request.getTargetId());
            access.requireViewable(folder);
            guard.rejectIfSystemFolder(folder, "partager par lien externe");
            targetName = folder.getName();
        }

        SharedLink link = sharedLinkRepository.save(SharedLink.builder()
                .token(generateToken())
                .organisationId(org)
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .mode(request.getMode())
                .passwordHash(StringUtils.hasText(request.getPassword())
                        ? passwordEncoder.encode(request.getPassword()) : null)
                .expiresAt(request.getExpiresAt())
                .maxAccess(request.getMaxAccess() != null && request.getMaxAccess() > 0
                        ? request.getMaxAccess() : null)
                .accessCount(0)
                .maxUploadBytes(request.getMode() == ShareMode.DROP ? request.getMaxUploadBytes() : null)
                .allowedExtensions(request.getMode() == ShareMode.DROP
                        ? normalizeExtensions(request.getAllowedExtensions()) : null)
                .createdByUserId(caller.userId())
                .revoked(false)
                .build());

        log.info("Lien de partage {} créé sur {} {} par {}",
                link.getId(), request.getTargetType(), request.getTargetId(), caller.userId());
        return toDto(link, targetName);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShareLinkResponse> myLinks() {
        return sharedLinkRepository
                .findByCreatedByUserIdAndOrganisationIdOrderByCreatedAtDesc(caller.userId(), caller.organisationId())
                .stream()
                .map(l -> toDto(l, resolveTargetName(l)))
                .toList();
    }

    @Override
    public void revoke(UUID id) {
        SharedLink link = sharedLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lien introuvable."));
        // Seul le créateur, dans son workspace, révoque son lien — on ne révèle pas
        // l'existence d'un lien d'autrui (404 plutôt que 403).
        if (!link.getOrganisationId().equals(caller.organisationId())
                || !link.getCreatedByUserId().equals(caller.userId())) {
            throw new ResourceNotFoundException("Lien introuvable.");
        }
        link.setRevoked(true);
        sharedLinkRepository.save(link);
        log.info("Lien de partage {} révoqué par {}", id, caller.userId());
    }

    // ═══════════════════════════ Public (token) ═════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public PublicShareResponse resolve(String token, String password) {
        SharedLink link = sharedLinkRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Lien introuvable."));

        String reason = statusReason(link);
        boolean active = "ACTIVE".equals(reason);
        boolean passwordRequired = link.getPasswordHash() != null;
        boolean unlocked = active && passwordMatches(link, password);

        PublicShareResponse.PublicShareResponseBuilder b = PublicShareResponse.builder()
                .mode(link.getMode())
                .targetType(link.getTargetType())
                .active(active)
                .reason(reason)
                .passwordRequired(passwordRequired)
                .unlocked(unlocked);

        if (!unlocked) {
            return b.build();
        }

        b.remainingAccess(remainingAccess(link));

        if (link.getMode() == ShareMode.DROP) {
            GedFolder folder = loadSharedFolder(link);
            // Isolation : en dépôt, on n'expose JAMAIS le contenu existant du dossier.
            b.targetName(folder.getName())
                    .maxUploadBytes(link.getMaxUploadBytes() != null ? link.getMaxUploadBytes() : DEFAULT_MAX_UPLOAD_BYTES)
                    .allowedExtensions(link.getAllowedExtensions());
            return b.build();
        }

        // READ
        if (link.getTargetType() == TargetType.FILE) {
            GedFile file = loadSharedFile(link.getTargetId(), link);
            b.targetName(file.getName())
                    .fileName(file.getName())
                    .contentType(file.getContentType())
                    .fileSize(file.getFileSize());
        } else {
            GedFolder folder = loadSharedFolder(link);
            b.targetName(folder.getName()).files(listFolderFiles(folder));
        }
        return b.build();
    }

    @Override
    public DownloadedFile downloadTargetFile(String token, String password) {
        SharedLink link = requireActive(token);
        if (link.getMode() != ShareMode.READ || link.getTargetType() != TargetType.FILE) {
            throw new ForbiddenException("Ce lien ne permet pas ce téléchargement.");
        }
        requirePassword(link, password);
        GedFile file = loadSharedFile(link.getTargetId(), link);
        DownloadedFile out = relayDownload(file, link);
        countAccess(link);
        return out;
    }

    @Override
    public DownloadedFile downloadFolderFile(String token, UUID fileId, String password) {
        SharedLink link = requireActive(token);
        if (link.getMode() != ShareMode.READ || link.getTargetType() != TargetType.FOLDER) {
            throw new ForbiddenException("Ce lien ne permet pas ce téléchargement.");
        }
        requirePassword(link, password);

        GedFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Fichier introuvable."));
        // Le fichier DOIT appartenir au dossier partagé, sinon le token deviendrait
        // un passe-partout sur tout le workspace.
        boolean belongs = file.getFolder() != null
                && link.getTargetId().equals(file.getFolder().getId())
                && link.getOrganisationId().equals(file.getOrganisationId())
                && !Boolean.TRUE.equals(file.getIsDeleted())
                && file.getAccessMode() == AccessMode.OPEN;
        if (!belongs) {
            throw new ResourceNotFoundException("Fichier introuvable.");
        }
        DownloadedFile out = relayDownload(file, link);
        countAccess(link);
        return out;
    }

    @Override
    public PublicShareFileResponse upload(String token, MultipartFile file,
                                          String uploaderName, String uploaderEmail, String password) {
        SharedLink link = requireActive(token);
        if (link.getMode() != ShareMode.DROP) {
            throw new ForbiddenException("Ce lien n'accepte pas de dépôt de fichier.");
        }
        requirePassword(link, password);
        GedFolder folder = loadSharedFolder(link);
        validateUpload(file, link);

        GedFileClient.Stored stored = fileClient.upload(
                file, link.getOrganisationId(), link.getCreatedByUserId(), folder.getProjectId());

        String cleanName = StringUtils.hasText(file.getOriginalFilename())
                ? file.getOriginalFilename() : (stored.originalName() != null ? stored.originalName() : "fichier");

        GedFile saved = fileRepository.save(GedFile.builder()
                .folder(folder)
                .organisationId(link.getOrganisationId())
                .name(cleanName)
                // URL de téléchargement canonique (context-path File Service inclus),
                // identique à celle qu'enregistre un import GED normal — sinon le
                // fichier déposé serait introuvable au téléchargement depuis l'app.
                .fileUrl("/nexawork-file-api-v1/api/v1/files/" + stored.id() + "/download")
                .fileSize(stored.size())
                .contentType(stored.contentType())
                .sourceFileId(stored.id())
                .projectId(folder.getProjectId())
                // OPEN : le fichier déposé est visible des membres du workspace.
                .accessMode(AccessMode.OPEN)
                // Identité de confiance = créateur du lien ; paternité réelle conservée à part.
                .addedByUserId(link.getCreatedByUserId())
                .isDeleted(false)
                // Toujours renseigné pour un dépôt externe (« Anonyme » si non nommé) :
                // c'est le signal qui permet à l'UI de NE PAS afficher le créateur du
                // lien comme auteur. Sans ce fallback, un dépôt anonyme retombait sur
                // addedByUserId et s'affichait au nom du créateur du lien.
                .externalUploaderName(StringUtils.hasText(uploaderName) ? uploaderName.trim() : "Anonyme")
                .externalUploaderEmail(trimToNull(uploaderEmail))
                .build());

        countAccess(link);
        log.info("Dépôt externe {} dans le dossier {} via le lien {} (par {} <{}>)",
                saved.getId(), folder.getId(), link.getId(), uploaderName, uploaderEmail);
        return PublicShareFileResponse.builder()
                .id(saved.getId()).name(saved.getName())
                .contentType(saved.getContentType()).fileSize(saved.getFileSize())
                .build();
    }

    // ═══════════════════════════ Helpers ════════════════════════════════════════

    /** Relaie les octets du File Service ; refuse si le fichier n'a pas de binaire source. */
    private DownloadedFile relayDownload(GedFile file, SharedLink link) {
        if (file.getSourceFileId() == null) {
            throw new ResourceNotFoundException("Fichier indisponible au téléchargement.");
        }
        byte[] bytes = fileClient.download(file.getSourceFileId(), link.getOrganisationId(), link.getCreatedByUserId());
        return new DownloadedFile(bytes, file.getName(), file.getContentType());
    }

    /** Charge un lien exploitable (existe, non révoqué, non expiré, non épuisé) ; sinon 409. */
    private SharedLink requireActive(String token) {
        SharedLink link = sharedLinkRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Lien introuvable."));
        String reason = statusReason(link);
        if (!"ACTIVE".equals(reason)) {
            throw new com.nexawork.commons.exceptions.ConflictException("Ce lien n'est plus valide.");
        }
        return link;
    }

    private String statusReason(SharedLink link) {
        if (Boolean.TRUE.equals(link.getRevoked())) {
            return "REVOKED";
        }
        if (link.getExpiresAt() != null && LocalDateTime.now().isAfter(link.getExpiresAt())) {
            return "EXPIRED";
        }
        if (link.getMaxAccess() != null && link.getAccessCount() >= link.getMaxAccess()) {
            return "EXHAUSTED";
        }
        return "ACTIVE";
    }

    private boolean passwordMatches(SharedLink link, String supplied) {
        if (link.getPasswordHash() == null) {
            return true;
        }
        return supplied != null && passwordEncoder.matches(supplied, link.getPasswordHash());
    }

    private void requirePassword(SharedLink link, String supplied) {
        if (!passwordMatches(link, supplied)) {
            throw new ForbiddenException("Mot de passe incorrect.");
        }
    }

    private void countAccess(SharedLink link) {
        link.setAccessCount(link.getAccessCount() + 1);
        sharedLinkRepository.save(link);
    }

    private Integer remainingAccess(SharedLink link) {
        return link.getMaxAccess() == null ? null : Math.max(0, link.getMaxAccess() - link.getAccessCount());
    }

    /** Charge le fichier ciblé par un lien, borné à son workspace (public, sans caller). */
    private GedFile loadSharedFile(UUID fileId, SharedLink link) {
        GedFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Fichier introuvable."));
        if (!link.getOrganisationId().equals(file.getOrganisationId())
                || Boolean.TRUE.equals(file.getIsDeleted())) {
            throw new ResourceNotFoundException("Fichier introuvable.");
        }
        return file;
    }

    /** Charge le dossier ciblé par un lien, borné à son workspace (public, sans caller). */
    private GedFolder loadSharedFolder(SharedLink link) {
        GedFolder folder = folderRepository.findById(link.getTargetId())
                .orElseThrow(() -> new ResourceNotFoundException("Dossier introuvable."));
        if (!link.getOrganisationId().equals(folder.getOrganisationId())
                || Boolean.TRUE.equals(folder.getIsDeleted())) {
            throw new ResourceNotFoundException("Dossier introuvable.");
        }
        return folder;
    }

    /** Fichiers OPEN, non supprimés, listés publiquement pour un partage de dossier. */
    private List<PublicShareFileResponse> listFolderFiles(GedFolder folder) {
        return fileRepository.findByFolderIdAndIsDeletedFalse(folder.getId()).stream()
                .filter(f -> f.getAccessMode() == AccessMode.OPEN)
                .map(f -> PublicShareFileResponse.builder()
                        .id(f.getId()).name(f.getName())
                        .contentType(f.getContentType()).fileSize(f.getFileSize())
                        .build())
                .toList();
    }

    private void validateUpload(MultipartFile file, SharedLink link) {
        if (file == null || file.isEmpty()) {
            throw new InvalidRequestException("Aucun fichier fourni.");
        }
        long max = link.getMaxUploadBytes() != null ? link.getMaxUploadBytes() : DEFAULT_MAX_UPLOAD_BYTES;
        if (file.getSize() > max) {
            throw new InvalidRequestException("Fichier trop volumineux (max " + (max / (1024 * 1024)) + " Mo).");
        }
        String ext = extensionOf(file.getOriginalFilename());
        if (BLOCKED_EXTENSIONS.contains(ext)) {
            throw new ForbiddenException("Ce type de fichier n'est pas autorisé.");
        }
        if (StringUtils.hasText(link.getAllowedExtensions())) {
            Set<String> allowed = parseExtensions(link.getAllowedExtensions());
            if (!allowed.contains(ext)) {
                throw new ForbiddenException("Type de fichier non autorisé (autorisés : "
                        + link.getAllowedExtensions() + ").");
            }
        }
    }

    private String resolveTargetName(SharedLink link) {
        try {
            if (link.getTargetType() == TargetType.FILE) {
                return fileRepository.findById(link.getTargetId())
                        .map(GedFile::getName).orElse("(élément supprimé)");
            }
            return folderRepository.findById(link.getTargetId())
                    .map(GedFolder::getName).orElse("(élément supprimé)");
        } catch (RuntimeException e) {
            return "(élément)";
        }
    }

    private ShareLinkResponse toDto(SharedLink link, String targetName) {
        return ShareLinkResponse.builder()
                .id(link.getId())
                .token(link.getToken())
                .path("/s/" + link.getToken())
                .targetType(link.getTargetType())
                .targetId(link.getTargetId())
                .targetName(targetName)
                .mode(link.getMode())
                .hasPassword(link.getPasswordHash() != null)
                .expiresAt(link.getExpiresAt())
                .maxAccess(link.getMaxAccess())
                .accessCount(link.getAccessCount())
                .maxUploadBytes(link.getMaxUploadBytes())
                .allowedExtensions(link.getAllowedExtensions())
                .revoked(Boolean.TRUE.equals(link.getRevoked()))
                .active("ACTIVE".equals(statusReason(link)))
                .createdAt(link.getCreatedAt())
                .build();
    }

    private String generateToken() {
        byte[] buffer = new byte[32];
        random.nextBytes(buffer);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
    }

    /** Normalise une liste d'extensions (« .PDF, png » → « pdf,png ») ; null si vide. */
    private String normalizeExtensions(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String joined = parseExtensions(raw).stream().collect(Collectors.joining(","));
        return joined.isEmpty() ? null : joined;
    }

    private Set<String> parseExtensions(String csv) {
        return Arrays.stream(csv.split("[,;\\s]+"))
                .map(s -> s.trim().toLowerCase().replaceFirst("^\\.", ""))
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
    }

    private String extensionOf(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        return dot >= 0 && dot < filename.length() - 1
                ? filename.substring(dot + 1).toLowerCase() : "";
    }

    private String trimToNull(String s) {
        return StringUtils.hasText(s) ? s.trim() : null;
    }
}
