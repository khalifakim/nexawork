package com.nexawork.file.utils;

import lombok.Getter;

@Getter
public class Response<T> {
    private final int status;
    private final String message;
    private final T data;

    private Response(int status, String message, T data) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    public static <T> Response<T> ok(T data, String message) {
        return new Response<>(200, message, data);
    }

    public static <T> Response<T> created(T data, String message) {
        return new Response<>(201, message, data);
    }
}
