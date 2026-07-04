package com.nexawork.commons.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.Accessors;

/**
 * Wrapper de réponse API cloné de Smart-Mifin : {status, payload, message, metadata}.
 * Retourné par tous les contrôleurs NexaWork.
 */
@Getter
@Setter
@Accessors(chain = true)
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
@AllArgsConstructor
@Builder
public class Response<T> {

    private Status status;
    private T payload;
    private Object metadata;
    private Object message;

    public static <T> Response<T> ok() {
        Response<T> response = new Response<>();
        response.setStatus(Status.OK);
        return response;
    }

    public static <T> Response<T> created() {
        Response<T> response = new Response<>();
        response.setStatus(Status.CREATED);
        return response;
    }

    public static <T> Response<T> deleted() {
        Response<T> response = new Response<>();
        response.setStatus(Status.DELETED);
        return response;
    }

    public static <T> Response<T> badRequest() {
        Response<T> response = new Response<>();
        response.setStatus(Status.BAD_REQUEST);
        return response;
    }

    public static <T> Response<T> unauthorized() {
        Response<T> response = new Response<>();
        response.setStatus(Status.UNAUTHORIZED);
        return response;
    }

    public static <T> Response<T> accessDenied() {
        Response<T> response = new Response<>();
        response.setStatus(Status.ACCESS_DENIED);
        return response;
    }

    public static <T> Response<T> notFound() {
        Response<T> response = new Response<>();
        response.setStatus(Status.NOT_FOUND);
        return response;
    }

    public static <T> Response<T> duplicateEntity() {
        Response<T> response = new Response<>();
        response.setStatus(Status.DUPLICATE_ENTITY);
        return response;
    }

    public static <T> Response<T> duplicateEmail() {
        Response<T> response = new Response<>();
        response.setStatus(Status.DUPLICATE_EMAIL);
        return response;
    }

    public static <T> Response<T> validationException() {
        Response<T> response = new Response<>();
        response.setStatus(Status.VALIDATION_EXCEPTION);
        return response;
    }

    public static <T> Response<T> wrongCredentials() {
        Response<T> response = new Response<>();
        response.setStatus(Status.WRONG_CREDENTIALS);
        return response;
    }

    public static <T> Response<T> disabledAccount() {
        Response<T> response = new Response<>();
        response.setStatus(Status.DISABLED_ACCOUNT);
        return response;
    }

    public static <T> Response<T> invalidToken() {
        Response<T> response = new Response<>();
        response.setStatus(Status.INVALID_TOKEN);
        return response;
    }

    public static <T> Response<T> tokenExpired() {
        Response<T> response = new Response<>();
        response.setStatus(Status.TOKEN_EXPIRED);
        return response;
    }

    public static <T> Response<T> conflict() {
        Response<T> response = new Response<>();
        response.setStatus(Status.CONFLICT);
        return response;
    }

    public static <T> Response<T> unprocessableEntity() {
        Response<T> response = new Response<>();
        response.setStatus(Status.UNPROCESSABLE_ENTITY);
        return response;
    }

    public static <T> Response<T> payloadTooLarge() {
        Response<T> response = new Response<>();
        response.setStatus(Status.PAYLOAD_TOO_LARGE);
        return response;
    }

    public static <T> Response<T> exception() {
        Response<T> response = new Response<>();
        response.setStatus(Status.EXCEPTION);
        return response;
    }

    public enum Status {
        OK, CREATED, DELETED,
        BAD_REQUEST, UNAUTHORIZED, ACCESS_DENIED, NOT_FOUND,
        DUPLICATE_ENTITY, DUPLICATE_EMAIL, VALIDATION_EXCEPTION,
        WRONG_CREDENTIALS, DISABLED_ACCOUNT, INVALID_TOKEN, TOKEN_EXPIRED,
        CONFLICT, UNPROCESSABLE_ENTITY, PAYLOAD_TOO_LARGE, EXCEPTION
    }

    @Getter
    @Accessors(chain = true)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    @Builder
    public static class PageMetadata {
        private final int size;
        private final long totalElements;
        private final int totalPages;
        private final int number;

        public PageMetadata(int size, long totalElements, int totalPages, int number) {
            this.size = size;
            this.totalElements = totalElements;
            this.totalPages = totalPages;
            this.number = number;
        }
    }
}
