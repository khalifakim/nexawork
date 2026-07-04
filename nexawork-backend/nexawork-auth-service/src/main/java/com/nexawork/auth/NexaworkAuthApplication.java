package com.nexawork.auth;

import com.nexawork.commons.properties.JwtProperties;
import com.nexawork.auth.properties.MailProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * NexaWork Auth Service (port 8081) — identité, sessions JWT, workspaces,
 * membres, invitations. Template maître des microservices (plan §F.5).
 */
@SpringBootApplication(scanBasePackages = {"com.nexawork.auth", "com.nexawork.commons"})
@EnableConfigurationProperties({JwtProperties.class, MailProperties.class})
@EnableAsync
public class NexaworkAuthApplication {

    public static void main(String[] args) {
        SpringApplication.run(NexaworkAuthApplication.class, args);
    }
}
