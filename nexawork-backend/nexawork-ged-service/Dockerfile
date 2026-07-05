# Contexte de build attendu : ./nexawork-backend (racine du multi-module Maven)
# Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build
# Copie du réacteur complet : le parent POM référence tous les modules
COPY . .
RUN mvn -pl nexawork-ged-service -am package -DskipTests --no-transfer-progress

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/nexawork-ged-service/target/*.jar app.jar
EXPOSE 8087
ENTRYPOINT ["java", "-jar", "app.jar"]
