# JSX Loader 部署指南（Linux + Docker Compose）

本文档用于将 `jsx_loader` 项目部署到 Linux 服务器，并通过 Docker Compose 运行。  
适用于当前项目架构：前端静态站点（Vite build）+ Nginx 容器托管。

---

## 1. 部署目标
- 使用 `docker compose` 一键构建和启动服务。
- 通过 `http://<服务器IP>:8080` 访问站点。
- 支持后续接入域名与 HTTPS（可选章节）。

---

## 2. 先决条件

在服务器上先安装以下组件：
- Docker Engine（建议 24+）
- Docker Compose Plugin（`docker compose` 命令）

验证命令：

```bash
docker --version
docker compose version
```

如果命令可用，即可继续。

---

## 3. 项目内关键部署文件（已就位）

当前项目已经包含以下部署文件：
- [Dockerfile](file:///Users/chenji/Desktop/CodeSpace/jsx_loader/Dockerfile)
- [docker-compose.yml](file:///Users/chenji/Desktop/CodeSpace/jsx_loader/docker-compose.yml)
- [nginx.conf](file:///Users/chenji/Desktop/CodeSpace/jsx_loader/nginx.conf)
- [.dockerignore](file:///Users/chenji/Desktop/CodeSpace/jsx_loader/.dockerignore)

这套文件对应逻辑：
- 第 1 阶段：Node 镜像执行 `npm ci` + `npm run build`
- 第 2 阶段：Nginx 镜像托管 `dist` 静态文件
- Compose 将容器 80 端口映射到主机 8080

---

## 4. 部署步骤（推荐）

### Step 1. 上传项目到服务器

任选一种方式：
- `git clone`（如果项目已托管）
- `scp/rsync` 上传项目目录

目标目录示例：

```bash
/opt/jsx_loader
```

### Step 2. 进入项目目录

```bash
cd /opt/jsx_loader
```

### Step 3. 构建并启动容器

```bash
docker compose up -d --build
```

### Step 4. 检查运行状态

```bash
docker compose ps
docker compose logs --tail=100
```

预期：
- `jsx-loader-web` 状态为 `Up`
- 日志出现 Nginx startup 信息，无异常报错

### Step 5. 验证访问

浏览器打开：

```text
http://<服务器IP>:8080
```

应看到 `JSX Asset Loader` 页面，并可正常进行：
- Load Project Sample
- Load/Unload
- Open Manager

---

## 5. 常用运维命令

### 查看状态

```bash
docker compose ps
```

### 查看日志

```bash
docker compose logs -f
```

### 重启服务

```bash
docker compose restart
```

### 停止服务

```bash
docker compose down
```

### 重新构建并启动（代码更新后）

```bash
docker compose up -d --build
```

### 清理旧镜像（可选）

```bash
docker image prune -f
```

---

## 6. 放通防火墙端口

若服务器有防火墙，需要放通 `8080`：

### UFW 示例

```bash
sudo ufw allow 8080/tcp
sudo ufw status
```

### firewalld 示例

```bash
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

---

## 7. 域名接入（可选）

如果你希望通过域名访问（如 `app.example.com`），推荐在服务器再加一层反向代理（Nginx/Caddy/Traefik）：
- 对外监听 80/443
- 转发到 `127.0.0.1:8080`
- 配置 TLS 证书（Let's Encrypt）

最简单策略：
- 当前 `jsx_loader` 容器保持不变（8080）
- 额外部署一个网关 Nginx 负责域名与证书

---

## 8. HTTPS（可选）

可选方案：
- **方案 A（推荐）**：在外层网关 Nginx/Caddy 上做 HTTPS，`jsx_loader` 内部仍走 HTTP
- **方案 B**：将证书挂载到当前容器并改造 `nginx.conf`（不推荐，维护成本高）

如果你后续需要，我可以再给你补一份“网关 Nginx + Certbot”的完整配置模板。

---

## 9. 回滚与恢复

### 回滚到上一版镜像（如果你做了镜像版本管理）
- 使用指定 tag 重新 `docker compose up -d`

### 紧急恢复（当前版本）

```bash
docker compose down
docker compose up -d
```

---

## 10. 常见问题排查

### Q1: 页面打不开
- 检查 `docker compose ps` 是否 `Up`
- 检查防火墙是否放通 8080
- 检查云厂商安全组是否放通 8080

### Q2: 容器不断重启
- 先看日志：

```bash
docker compose logs --tail=200
```

- 常见原因：构建失败、配置文件语法错误、端口冲突

### Q3: 访问空白或 404
- 检查 [nginx.conf](file:///Users/chenji/Desktop/CodeSpace/jsx_loader/nginx.conf) 中是否保留 SPA fallback：
`try_files $uri $uri/ /index.html;`

### Q4: 更新代码后页面没变化
- 确认执行了带构建参数的启动：

```bash
docker compose up -d --build
```

---

## 11. 推荐上线流程（团队实践）

每次发版建议固定执行：
1. 本地 `npm run test`  
2. 本地 `npm run build`  
3. 推送代码到服务器  
4. 服务器执行 `docker compose up -d --build`  
5. 验证核心 smoke test（Load/Unload）  
6. 观察 5 分钟日志无异常

---

## 12. 当前项目验证结论

本项目已在本地完成以下验证：
- `npm run test` 通过
- `npm run build` 通过
- `docker compose up -d --build` 成功
- `http://localhost:8080` 页面可访问并通过 smoke test

因此按本文档迁移到 Linux 服务器后，可按同样流程完成部署。
