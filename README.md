

# 配置环境变量  
2. 配置 GitHub Secrets（仓库 Settings → Secrets and variables → Actions）：

Secret	获取方式:

SERVER_HOST / SERVER_USER	服务器 IP 和 SSH 用户名
SSH_PRIVATE_KEY	可以在自己的电脑上 ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" 生成，公钥追加到服务器的 ~/.ssh/authorized_keys，私钥内容贴进去 SSH_PRIVATE_KEY 的 value 里去

# 装 Docker
curl -fsSL https://get.docker.com | sh

# 放 compose 文件
> mkdir -p /opt/app && cd /opt/app
# 把仓库里的 docker-compose.yml 拷过来（workflow 的 sed 会自动改镜像 tag）

# Nginx 反代（/etc/nginx/conf.d/one-dragon.conf）

server {
    listen 80;
    server_name one-dragon.cn www.one-dragon.cn;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
然后 certbot --nginx -d one-dragon.cn 配 HTTPS，腾讯云防火墙放行 80/443。

之后每次 git push 到 GitHub main 分支：测试 → 构建镜像 → 推 TCR → 服务器自动更新，Vercel 同步部署，一条流水线两个平台。