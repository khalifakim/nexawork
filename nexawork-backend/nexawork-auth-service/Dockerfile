FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/nexawork-auth-service-*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
