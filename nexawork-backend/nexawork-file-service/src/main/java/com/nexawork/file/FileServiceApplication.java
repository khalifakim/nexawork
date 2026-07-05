package com.nexawork.file;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * NexaWork File Service (port 8086) — stockage binaire MinIO : upload multipart
 * avec calcul SHA-256 en streaming, routage contextuel vers 3 buckets, download
 * (stream ou URL présignée), suppression (V5.1 §4.3, §5.3, §13.3).
 *
 * <p>Comme les autres services métier, l'identité provient des headers injectés
 * par l'API Gateway (pas de secret JWT). Le scan de composants se limite aux
 * sous-packages commons réutilisables (config, exceptions).</p>
 */
@SpringBootApplication(scanBasePackages = {
        "com.nexawork.file",
        "com.nexawork.commons.config",
        "com.nexawork.commons.exceptions"
})
@ConfigurationPropertiesScan
public class FileServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(FileServiceApplication.class, args);
    }
}
