package com.nexawork.auth.aspects;

import com.nexawork.commons.security.SecurityUtils;
import com.nexawork.auth.annotations.Journal;
import com.nexawork.auth.annotations.JournalAttribute;
import com.nexawork.auth.entities.audits.AuditTrailEntity;
import com.nexawork.auth.repositories.AuditTrailRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.annotation.Annotation;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Aspect d'audit trail cloné de Smart-Mifin (simplifié — pas de portée
 * hiérarchique) : trace les mutations @Journal réussies dans audit_trail.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class JournalAspect {

    AuditTrailRepository auditTrailRepository;

    @Around("@annotation(journal)")
    public Object journalize(ProceedingJoinPoint joinPoint, Journal journal) throws Throwable {
        Object result = joinPoint.proceed();
        try {
            String details = extractDetails(joinPoint);
            auditTrailRepository.save(AuditTrailEntity.builder()
                    .actionType(journal.actionType())
                    .entityName(journal.entityName().isEmpty() ? null : journal.entityName())
                    .actor(SecurityUtils.getCurrentUserLogin().orElse("anonymous"))
                    .actionDate(LocalDateTime.now())
                    .details(details)
                    .build());
        } catch (Exception e) {
            // L'échec de journalisation ne doit jamais faire échouer la mutation
            log.error("Échec de journalisation {} : {}", journal.actionType(), e.getMessage());
        }
        return result;
    }

    private String extractDetails(ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Annotation[][] parameterAnnotations = signature.getMethod().getParameterAnnotations();
        Object[] args = joinPoint.getArgs();
        List<String> parts = new ArrayList<>();
        for (int i = 0; i < args.length; i++) {
            for (Annotation annotation : parameterAnnotations[i]) {
                if (annotation instanceof JournalAttribute journalAttribute) {
                    String label = journalAttribute.value().isEmpty()
                            ? signature.getParameterNames()[i]
                            : journalAttribute.value();
                    parts.add(label + "=" + args[i]);
                }
            }
        }
        return parts.isEmpty() ? null : String.join(", ", parts);
    }
}
