FROM eclipse-temurin:17-jdk AS build
WORKDIR /workspace

COPY gradlew gradlew
COPY gradlew.bat gradlew.bat
COPY gradle gradle
COPY settings.gradle build.gradle ./
COPY docker/HttpHealthcheck.java docker/HttpHealthcheck.java

RUN chmod +x ./gradlew

COPY src src
RUN ./gradlew bootJar --no-daemon \
    && mkdir -p /workspace/healthcheck \
    && javac -d /workspace/healthcheck docker/HttpHealthcheck.java \
    && JAR_PATH="$(find build/libs -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar')" \
    && test "$(printf '%s\n' "$JAR_PATH" | sed '/^$/d' | wc -l)" = "1" \
    && cp "$JAR_PATH" /workspace/app.jar

FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app

COPY --from=build /workspace/app.jar /app/app.jar
COPY --from=build /workspace/healthcheck /opt/healthcheck

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
