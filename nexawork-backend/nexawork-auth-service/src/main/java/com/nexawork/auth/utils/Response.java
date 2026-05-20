package com.nexawork.auth.utils;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class Response<T> {

    private String status;
    private T payload;
    private String message;
    private Object metadata;

    public static <T> Response<T> success(T payload) {
        return Response.<T>builder().status("SUCCESS").payload(payload).build();
    }

    public static <T> Response<T> success(T payload, String message) {
        return Response.<T>builder().status("SUCCESS").payload(payload).message(message).build();
    }

    public static <T> Response<T> ok(T payload, String message) {
        return Response.<T>builder().status("SUCCESS").payload(payload).message(message).build();
    }

    public static <T> Response<T> ok(T payload) {
        return Response.<T>builder().status("SUCCESS").payload(payload).build();
    }

    public static <T> Response<T> created(T payload, String message) {
        return Response.<T>builder().status("CREATED").payload(payload).message(message).build();
    }

    public static <T> Response<T> created(T payload) {
        return Response.<T>builder().status("CREATED").payload(payload).build();
    }

    public static <T> Response<T> error(String message) {
        return Response.<T>builder().status("ERROR").message(message).build();
    }

    public static <T> Response<T> error(String message, T payload) {
        return Response.<T>builder().status("ERROR").message(message).payload(payload).build();
    }
}
