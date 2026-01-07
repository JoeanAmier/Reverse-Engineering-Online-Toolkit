# REOT Dockerfile
# 使用 nginx 作为静态文件服务器

FROM nginx:alpine

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 删除默认的 nginx 静态文件
RUN rm -rf ./*

# 复制项目文件
COPY . .

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露 80 端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
