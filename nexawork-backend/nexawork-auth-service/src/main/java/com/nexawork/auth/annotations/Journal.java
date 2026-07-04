package com.nexawork.auth.annotations;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marque une mutation sensible à tracer dans audit_trail (clone Smart-Mifin).
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Journal {

    String actionType();

    String entityName() default "";
}
