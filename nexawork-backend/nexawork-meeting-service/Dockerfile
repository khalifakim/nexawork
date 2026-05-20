FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/nexawork-meeting-service-*.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]
