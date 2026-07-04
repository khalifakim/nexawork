# Contexte de build attendu : ./nexawork-backend (racine du multi-module Maven)
# Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY pom.xml ./
COPY nexawork-commons ./nexawork-commons
COPY nexawork-config-server ./nexawork-config-server
RUN mvn -pl nexawork-config-server -am package -DskipTests --no-transfer-progress

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/nexawork-config-server/target/*.jar app.jar
EXPOSE 8888
ENTRYPOINT ["java", "-jar", "app.jar"]
