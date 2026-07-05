package com.nexawork.commons.exceptions;

import com.nexawork.commons.models.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.List;

/**
 * Handler global d'exceptions cloné de Smart-Mifin, adapté NexaWork :
 * toutes les erreurs sortent en {@link Response} avec le statut HTTP approprié
 * (400/401/403/404/409/413/422/500).
 */
@Slf4j
@RestControllerAdvice
public class GlobalControllerExceptionHandler {

    @ResponseStatus(HttpStatus.NOT_FOUND)
    @ExceptionHandler(ResourceNotFoundException.class)
    public Response<Object> notFound(ResourceNotFoundException e) {
        log.error(e.getMessage());
        return Response.notFound().setMessage(e.getMessage());
    }

    @ResponseStatus(HttpStatus.CONFLICT)
    @ExceptionHandler(ResourceAlreadyExistException.class)
    public Response<Object> conflict(ResourceAlreadyExistException e) {
        log.error(e.getMessage());
        return Response.duplicateEntity().setMessage(e.getMessage());
    }

    @ResponseStatus(HttpStatus.CONFLICT)
    @ExceptionHandler(ConflictException.class)
    public Response<Object> stateConflict(ConflictException e) {
        log.error(e.getMessage());
        return Response.conflict().setMessage(e.getMessage());
    }

    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    @ExceptionHandler(UnprocessableEntityException.class)
    public Response<Object> unprocessable(UnprocessableEntityException e) {
        log.error(e.getMessage());
        return Response.unprocessableEntity().setMessage(e.getMessage());
    }

    @ResponseStatus(HttpStatus.FORBIDDEN)
    @ExceptionHandler({ForbiddenException.class, ForbiddenActionException.class})
    public Response<Object> forbidden(RuntimeException e) {
        log.error(e.getMessage());
        return Response.accessDenied().setMessage(e.getMessage());
    }

    @ResponseStatus(HttpStatus.FORBIDDEN)
    @ExceptionHandler(AccessDeniedException.class)
    public Response<Object> accessDenied(AccessDeniedException e) {
        log.error(e.getMessage());
        return Response.accessDenied().setMessage("Accès refusé.");
    }

    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    @ExceptionHandler(BadCredentialsException.class)
    public Response<Object> badCredentials(BadCredentialsException e) {
        log.error(e.getMessage());
        return Response.wrongCredentials().setMessage("Identifiants incorrects.");
    }

    @ResponseStatus(HttpStatus.FORBIDDEN)
    @ExceptionHandler(UserDisabledException.class)
    public Response<Object> disabled(UserDisabledException e) {
        log.error(e.getMessage());
        return Response.disabledAccount().setMessage(e.getMessage());
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(PasswordException.class)
    public Response<Object> password(PasswordException e) {
        log.error(e.getMessage());
        return Response.badRequest().setMessage(e.getMessage());
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(InvalidRequestException.class)
    public Response<Object> invalidRequest(InvalidRequestException e) {
        log.error(e.getMessage());
        return Response.badRequest().setMessage(e.getMessage());
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Response<Object> invalidInput(MethodArgumentNotValidException e) {
        log.error(e.getMessage());
        List<String> errors = e.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> fieldError.getField() + " " + fieldError.getDefaultMessage())
                .toList();
        return Response.validationException().setMessage(errors);
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public Response<Object> unreadable(HttpMessageNotReadableException e) {
        log.error(e.getMessage());
        return Response.badRequest().setMessage("Corps de requête illisible ou malformé.");
    }

    @ResponseStatus(HttpStatus.PAYLOAD_TOO_LARGE)
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public Response<Object> payloadTooLarge(MaxUploadSizeExceededException e) {
        log.error("File size limit exceeded: {}", e.getMessage());
        return Response.payloadTooLarge().setMessage("Le fichier dépasse la taille maximale autorisée.");
    }

    @ResponseStatus(HttpStatus.CONFLICT)
    @ExceptionHandler(DataIntegrityViolationException.class)
    public Response<Object> dataIntegrity(DataIntegrityViolationException e) {
        log.error(e.getMessage());
        return Response.conflict().setMessage("Violation de contrainte d'intégrité.");
    }

    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    @ExceptionHandler(Exception.class)
    public Response<Object> unhandled(Exception e) {
        log.error("Unhandled exception", e);
        return Response.exception().setMessage("Une erreur interne est survenue.");
    }
}
