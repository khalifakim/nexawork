package com.nexawork.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class NexaworkProjectApplication {
    public static void main(String[] args) {
        SpringApplication.run(NexaworkProjectApplication.class, args);
    }
}
