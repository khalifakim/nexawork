package com.nexawork.auth.annotations;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marque un paramètre à inclure dans le détail de la trace d'audit
 * (clone Smart-Mifin).
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.PARAMETER)
public @interface JournalAttribute {

    String value() default "";
}
