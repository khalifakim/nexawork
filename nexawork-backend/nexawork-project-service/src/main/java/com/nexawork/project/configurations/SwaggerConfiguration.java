package com.nexawork.project.configurations;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI 3 / springdoc 2.x (adaptation Smart-Mifin springfox → springdoc).
 */
@Configuration
public class SwaggerConfiguration {

    @Bean
    public OpenAPI nexaworkProjectOpenAPI() {
        final String securitySchemeName = "bearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("NexaWork Project Service API")
                        .description("Projets, équipes, workflow Kanban FSM, tâches, tableau de bord (V5.1 §13.2)")
                        .version("v1"))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components().addSecuritySchemes(securitySchemeName,
                        new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
