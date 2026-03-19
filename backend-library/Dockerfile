# ---- Stage 1: Build ----
FROM maven:3.9.6-eclipse-temurin-17 AS builder

WORKDIR /app

# 先复制 pom.xml 利用 Docker 层缓存，加速依赖下载
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw mvnw.cmd ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B --settings /dev/null || true

# 复制源代码并构建（跳过测试以加快速度）
COPY src ./src
RUN ./mvnw package -DskipTests -B

# ---- Stage 2: Run ----
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 创建非 root 用户以提升安全性
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8089

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
