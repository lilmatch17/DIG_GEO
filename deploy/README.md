# L7VP 部署包（单 jar + 并入中台 nginx，ARM64 / x86_64）

前端与后端已**打成 1 个 jar**（前端 dist 内嵌于 `BOOT-INF/classes/static/`），单一容器监听 **3001**，不再需要独立的前端 nginx 容器。浏览器统一经**中台 nginx（8081 单入口）**访问，路由 `/l7vp`。

```
deploy/
├── docker-compose.yml
├── backend/
│   ├── app.jar                     # 单 jar（后端 + 前端静态内嵌）
│   ├── Dockerfile                  # arm64v8/eclipse-temurin:8-jre
│   └── application.properties      # ★ 生产配置（挂载覆盖 jar 内配置，改它即生效）
├── config/
│   └── config.js                   # 运行时配置（window.L7VP_CONFIG，改它即生效，无需重打 jar）
├── data/
│   ├── icons/                      # 持久化：用户上传图标
│   └── thumbnails/                 # 持久化：项目缩略图
└── README.md
```

## 一、访问方式

- 中台菜单自定义链接：`/l7vp/#/project`
- 分享（DE-L7 联动嵌入）：`/l7vp/#/share/<项目id>`（**免登录**，已放开 SSO 拦截）
- 直连调试（不经中台）：`http://<服务器IP>:3001/l7vp/`

## 二、中台 nginx 配置（生产必配）

中台只开放 8081，需把以下 location 加入中台 nginx（`http{}` 块内）：

```nginx
# ===== L7VP 地理可视化（单 jar，端口 3001）=====
# ★ 必须「剥前缀」：proxy_pass 末尾带斜杠，把 /l7vp 剥掉再转发。
#   否则 SSO 回调 /l7vp/api/auth/callback 会落到静态资源处理器 → 404。
location /l7vp/ {
    proxy_pass http://<服务器IP>:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    client_max_body_size 50m;
}
# L7VP 构建产物中硬编码的根路径（SDK 资产包内嵌绝对路径，无法改动，必须透传）
location /api/        { proxy_pass http://<服务器IP>:3001; proxy_set_header Host $host; client_max_body_size 50m; }
location /data/       { proxy_pass http://<服务器IP>:3001; proxy_set_header Host $host; }
location /thumbnails/ { proxy_pass http://<服务器IP>:3001; proxy_set_header Host $host; }
location /icons/      { proxy_pass http://<服务器IP>:3001; proxy_set_header Host $host; }
```

> `<服务器IP>` 指 L7VP 容器所在宿主机的内网 IP（中台 nginx 容器内可达）。若中台 nginx 根路径已占用 `/api`、`/data`，需改用「全前缀」方案（见 §九）。

## 三、修改配置

1. **达梦连接（必改）** `backend/application.properties`
   ```properties
   spring.datasource.url=jdbc:dm://<达梦IP>:5236/DIG_GEO
   spring.datasource.username=<用户名>
   spring.datasource.password=<密码>
   ```
2. **中台 / SSO** `docker-compose.yml` → `environment`
   - `ZHONGTAI_BASE_URL`：中台内部地址，如 `http://10.16.1.6:8081`
   - `APP_FRONTEND_URL`：**必改**，`http://<中台对外IP>:8081/l7vp`（SSO 回调 + 登录后跳转）
   - `ZHONGTAI_CLIENT_ID` / `ZHONGTAI_CLIENT_SECRET`：中台 OAuth 客户端凭据
3. **底图 / 中台地址** `config/config.js`（`window.L7VP_CONFIG`）：改瓦片底图、`zhongtaiBaseUrl` 等，改完重启容器即生效。

## 四、打包流程（本机，重新发版时）

```bash
# 1. 前端构建（publicPath=/l7vp/ 已在 config/config.ts 设置）
cd website && NODE_OPTIONS="--max-old-space-size=8192" npm run build
#    构建后检查并修正 dist/index.html 里 /config.js、/favicon.ico 为 /l7vp/ 前缀

# 2. 拷贝前端产物到后端 static
rm -rf java-server/src/main/resources/static
mkdir -p java-server/src/main/resources/static
cp -r website/dist/* java-server/src/main/resources/static/

# 3. 后端打单 jar（含前端静态）
cd java-server && mvn clean package -DskipTests

# 4. 拷贝到部署包
cp java-server/target/l7vp-server-1.0.0.jar deploy/backend/app.jar
cp website/dist/config.js deploy/config/config.js
```

## 五、离线镜像（在可联网 ARM 机器上先做好）

服务器拉不到基础镜像时，先在能联网的 ARM 机器上执行：

```bash
docker build -t l7vp-single:latest ./backend
docker save l7vp-single:latest arm64v8/eclipse-temurin:8-jre | gzip > l7vp-single-arm64.tar.gz
# 拷入内网后：docker load < l7vp-single-arm64.tar.gz
```

## 六、内网启动

```bash
docker compose up -d
docker compose ps
```

## 七、首次建表（后端不自动建表）

```bash
docker run --rm --entrypoint sh l7vp-single:latest \
  -c "unzip -p /opt/l7vp/app.jar BOOT-INF/classes/schema.sql" > schema.sql
# 在达梦中手动执行该脚本
```

## 八、验证

```bash
# 直连容器
curl http://localhost:3001/l7vp/                   # 返回 index.html
curl http://localhost:3001/l7vp/config.js          # 返回运行时配置
curl http://localhost:3001/api/auth/status         # 登录态 JSON
# 经中台（配置好 §二 后）
curl http://localhost:8081/l7vp/                   # 返回 index.html
```

浏览器：

- `http://<服务器IP>:3001/l7vp/#/project`（直连）
- 中台菜单 → L7VP → `/l7vp/#/project`（SSO 登录）
- `/l7vp/#/share/<id>` 免登录直开地图

## 九、兜底：中台已占用 /api 时的全前缀方案

若中台 nginx 根路径已有 `location /api`、`location /data`，本方案的根路径透传会冲突。此时需把 L7VP 所有路径挂到 `/l7vp` 下（后端 context-path 化 + 前端 API base 改 `/l7vp/api` + 4 个资产包 `/api`、`/data` 改前缀并 father 重编译），改动大，仅在中台确已占用时采用。

## 十、常见问题

- **本机直接跑 jar（开发调试）**：不要从 `deploy/backend` 目录启动——Spring Boot 会自动加载同目录的 `deploy/backend/application.properties`（生产占位达梦地址 `192.168.1.100`）。应从仓库 `java-server` 目录启动，走 jar 内置开发配置（`jdbc:dm://localhost:5236`）：
  ```bash
  cd java-server
  java -jar ../deploy/backend/app.jar
  ```
  或加参数覆盖：`--spring.datasource.url=jdbc:dm://<达梦IP>:5236 --spring.datasource.username=SYSDBA --spring.datasource.password=xxx`。
- 直连 `:3001/l7vp/` 404：jar 里没打进前端（检查 §四 第 2 步后再打 jar）。
- 经中台登录后回调 404：中台 nginx `/l7vp/` 未用「剥前缀」（`proxy_pass ...3001/` 缺末尾斜杠）。
- 达梦连不上：确认 URL/账号密码、达梦是否允许该服务器 IP 接入。
- 端口冲突：改 compose 里 `ports` 左侧宿主机端口即可，容器内 3001 不动。
