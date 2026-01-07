# REOT 部署文档

本文档介绍如何部署 REOT。

## 静态托管

REOT 是纯前端项目，可以部署到任何静态文件托管服务。

### GitHub Pages

1. Fork 仓库到你的 GitHub 账户
2. 进入仓库设置 Settings > Pages
3. Source 选择 `main` 分支
4. 点击 Save
5. 访问 `https://<username>.github.io/Reverse-Engineering-Online-Toolkit`

### Vercel

1. 登录 [Vercel](https://vercel.com)
2. 点击 "Import Project"
3. 导入 GitHub 仓库
4. 使用默认设置，点击 Deploy
5. 部署完成后获取 URL

### Netlify

1. 登录 [Netlify](https://netlify.com)
2. 点击 "New site from Git"
3. 选择 GitHub 仓库
4. Build command 留空
5. Publish directory 输入 `.`
6. 点击 Deploy site

### Cloudflare Pages

1. 登录 Cloudflare Dashboard
2. 进入 Pages
3. 创建项目，连接 Git
4. 选择仓库
5. Framework preset 选择 None
6. 部署

## Docker 部署

### 构建镜像

```bash
docker build -t reot:latest .
```

### 运行容器

```bash
docker run -d -p 80:80 reot:latest
```

### Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'
services:
  reot:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

运行：

```bash
docker-compose up -d
```

## Nginx 配置

如果使用自己的 Nginx 服务器：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/reot;
    index index.html;

    # 启用 gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 工具页面
    location /tools/ {
        try_files $uri $uri/ $uri/index.html /index.html;
    }

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Apache 配置

创建 `.htaccess` 文件：

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # 如果不是文件或目录，重定向到 index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# 启用 gzip
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css application/json application/javascript
</IfModule>

# 缓存设置
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

## CDN 配置

建议使用 CDN 加速静态资源：

1. 配置 CDN 回源到你的服务器
2. 设置缓存规则：
   - HTML: 不缓存或短时间缓存
   - JS/CSS: 长期缓存（1 年）
   - 图片: 长期缓存

## HTTPS 配置

强烈建议启用 HTTPS：

### Let's Encrypt (Certbot)

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 监控

建议配置以下监控：

1. **可用性监控** - 使用 UptimeRobot 等服务
2. **性能监控** - 使用 Google Analytics 或 Plausible
3. **错误监控** - 使用 Sentry（可选）

## 安全建议

1. 启用 HTTPS
2. 配置安全响应头：
   ```nginx
   add_header X-Frame-Options "SAMEORIGIN";
   add_header X-Content-Type-Options "nosniff";
   add_header X-XSS-Protection "1; mode=block";
   ```
3. 定期更新依赖
4. 禁止目录列表
