# ARM64 (鲲鹏/飞腾/麒麟) Java 8 运行环境
# 前端 dist 是纯静态文件、jar 是 Java 字节码，与架构无关；
# 唯一与 ARM 相关的是基础镜像，这里显式用 arm64v8 变体。
FROM arm64v8/eclipse-temurin:8-jre

WORKDIR /opt/l7vp

COPY app.jar /opt/l7vp/app.jar

EXPOSE 3001

# 时区与 jar 内 spring.jackson.time-zone=GMT+8 保持一致
ENTRYPOINT ["java", "-jar", "-Duser.timezone=GMT+8", "/opt/l7vp/app.jar"]
