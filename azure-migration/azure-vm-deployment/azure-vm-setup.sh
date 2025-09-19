#!/bin/bash

# =====================================================
# Azure Linux VM Setup Script for Nexus Knowledge Copilot
# Plan C: Linux Virtual Machine Configuration
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

# Configuration variables
APP_NAME="nexus-knowledge-copilot"
APP_USER="nexusapp"
APP_DIR="/opt/nexus-copilot"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
SYSTEMD_DIR="/etc/systemd/system"

log "🚀 Starting Azure VM setup for Nexus Knowledge Copilot..."

# =====================================================
# 1. SYSTEM UPDATES AND BASIC PACKAGES
# =====================================================

log "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

log "🔧 Installing essential packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    htop \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    build-essential \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw

success "System packages updated"

# =====================================================
# 2. NODE.JS INSTALLATION
# =====================================================

log "📦 Installing Node.js 18 LTS..."

# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)

success "Node.js $NODE_VERSION and npm $NPM_VERSION installed"

# Install PM2 globally for process management
log "📦 Installing PM2 for process management..."
sudo npm install -g pm2

success "PM2 installed"

# =====================================================
# 3. SQL SERVER INSTALLATION
# =====================================================

log "🗄️  Installing Microsoft SQL Server 2019..."

# Import Microsoft signing key
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -

# Add Microsoft SQL Server repository
sudo add-apt-repository "$(wget -qO- https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2019.list)"

# Update package cache
sudo apt update

# Install SQL Server
sudo apt install -y mssql-server

# Configure SQL Server
log "🔧 Configuring SQL Server..."
sudo /opt/mssql/bin/mssql-conf setup << EOF
2
Y
nexus2024!
nexus2024!
EOF

# Enable and start SQL Server service
sudo systemctl enable mssql-server
sudo systemctl start mssql-server

success "SQL Server 2019 installed and configured"

# =====================================================
# 4. SQL SERVER COMMAND LINE TOOLS
# =====================================================

log "🔧 Installing SQL Server command line tools..."

# Add Microsoft repository for tools
curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list

# Update package cache
sudo apt update

# Install SQL Server tools
sudo ACCEPT_EULA=Y apt install -y mssql-tools unixodbc-dev

# Add tools to PATH
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> ~/.bashrc
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' | sudo tee -a /etc/environment

success "SQL Server tools installed"

# =====================================================
# 5. DOCKER INSTALLATION (Optional for containerized deployment)
# =====================================================

log "🐳 Installing Docker..."

# Add Docker's GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package cache
sudo apt update

# Install Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER

success "Docker and Docker Compose installed"

# =====================================================
# 6. REDIS INSTALLATION (for caching and sessions)
# =====================================================

log "📦 Installing Redis..."

sudo apt install -y redis-server

# Configure Redis
sudo sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf

# Enable and start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

success "Redis installed and configured"

# =====================================================
# 7. CREATE APPLICATION USER AND DIRECTORIES
# =====================================================

log "👤 Creating application user and directories..."

# Create application user
sudo useradd -r -s /bin/bash -d $APP_DIR $APP_USER

# Create application directory
sudo mkdir -p $APP_DIR
sudo mkdir -p $APP_DIR/logs
sudo mkdir -p $APP_DIR/uploads
sudo mkdir -p $APP_DIR/backups

# Set ownership
sudo chown -R $APP_USER:$APP_USER $APP_DIR

success "Application user and directories created"

# =====================================================
# 8. CONFIGURE FIREWALL
# =====================================================

log "🔥 Configuring firewall..."

# Enable UFW
sudo ufw --force enable

# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow specific ports for our application
sudo ufw allow 3001/tcp  # Backend API
sudo ufw allow 1433/tcp  # SQL Server (be careful with this in production)

# Allow Redis (localhost only)
sudo ufw allow from 127.0.0.1 to any port 6379

success "Firewall configured"

# =====================================================
# 9. NGINX CONFIGURATION
# =====================================================

log "🌐 Configuring Nginx..."

# Create Nginx configuration for the application
sudo tee $NGINX_AVAILABLE/$APP_NAME > /dev/null << 'EOF'
# Nexus Knowledge Copilot Nginx Configuration

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

# Upstream backend servers
upstream backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    # Add more backend servers here for load balancing
    # server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name _;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name _;

    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' wss:; frame-ancestors 'none';";

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Client body size
    client_max_body_size 10M;

    # API routes with rate limiting
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        access_log off;
    }

    # Static file serving for uploads
    location /uploads/ {
        alias /opt/nexus-copilot/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Frontend static files (if serving from same server)
    location / {
        root /var/www/nexus-copilot;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public";
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;

    location = /50x.html {
        root /var/www/html;
    }
}
EOF

# Enable the site
sudo ln -sf $NGINX_AVAILABLE/$APP_NAME $NGINX_ENABLED/$APP_NAME

# Remove default site
sudo rm -f $NGINX_ENABLED/default

# Test Nginx configuration
sudo nginx -t

success "Nginx configured"

# =====================================================
# 10. SYSTEMD SERVICE CONFIGURATION
# =====================================================

log "⚙️  Creating systemd service..."

# Create systemd service file
sudo tee $SYSTEMD_DIR/$APP_NAME.service > /dev/null << EOF
[Unit]
Description=Nexus Knowledge Copilot Backend API
Documentation=https://github.com/nexus/knowledge-copilot
After=network.target mssql-server.service redis-server.service
Wants=mssql-server.service redis-server.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
KillMode=mixed
TimeoutStopSec=5
SyslogIdentifier=$APP_NAME

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

# Resource limits
LimitNOFILE=65535
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

success "Systemd service created"

# =====================================================
# 11. LOG ROTATION CONFIGURATION
# =====================================================

log "📝 Configuring log rotation..."

# Create logrotate configuration
sudo tee /etc/logrotate.d/$APP_NAME > /dev/null << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        systemctl reload $APP_NAME
    endscript
}
EOF

success "Log rotation configured"

# =====================================================
# 12. MONITORING AND HEALTH CHECKS
# =====================================================

log "📊 Setting up monitoring..."

# Create health check script
sudo tee /usr/local/bin/nexus-health-check.sh > /dev/null << 'EOF'
#!/bin/bash

# Health check script for Nexus Knowledge Copilot

HEALTH_URL="http://localhost:3001/health"
LOG_FILE="/var/log/nexus-health-check.log"

# Check API health
response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$response" == "200" ]; then
    echo "$(date): ✅ API is healthy" >> $LOG_FILE
    exit 0
else
    echo "$(date): ❌ API is unhealthy (HTTP $response)" >> $LOG_FILE
    # Restart the service if unhealthy
    systemctl restart nexus-knowledge-copilot
    exit 1
fi
EOF

sudo chmod +x /usr/local/bin/nexus-health-check.sh

# Create cron job for health checks (every 5 minutes)
echo "*/5 * * * * root /usr/local/bin/nexus-health-check.sh" | sudo tee -a /etc/crontab

success "Health monitoring configured"

# =====================================================
# 13. BACKUP CONFIGURATION
# =====================================================

log "💾 Setting up backup system..."

# Create backup script
sudo tee /usr/local/bin/nexus-backup.sh > /dev/null << 'EOF'
#!/bin/bash

# Backup script for Nexus Knowledge Copilot

BACKUP_DIR="/opt/nexus-copilot/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="NexusKnowledgeCopilot"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
sqlcmd -S localhost -U sa -P 'nexus2024!' -Q "BACKUP DATABASE [$DB_NAME] TO DISK = '$BACKUP_DIR/database_$DATE.bak'"

# Application files backup
tar -czf $BACKUP_DIR/app_files_$DATE.tar.gz -C /opt/nexus-copilot uploads logs

# Remove backups older than 7 days
find $BACKUP_DIR -name "*.bak" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "$(date): Backup completed - database_$DATE.bak, app_files_$DATE.tar.gz" >> /var/log/nexus-backup.log
EOF

sudo chmod +x /usr/local/bin/nexus-backup.sh

# Create daily backup cron job (at 2 AM)
echo "0 2 * * * root /usr/local/bin/nexus-backup.sh" | sudo tee -a /etc/crontab

success "Backup system configured"

# =====================================================
# 14. SSL CERTIFICATE SETUP
# =====================================================

log "🔒 SSL certificate setup instructions..."

warning "To set up SSL certificates with Let's Encrypt:"
warning "1. Point your domain to this server's IP address"
warning "2. Update the server_name in /etc/nginx/sites-available/$APP_NAME"
warning "3. Run: sudo certbot --nginx -d yourdomain.com"
warning "4. Certbot will automatically update the Nginx configuration"

# =====================================================
# 15. FINAL SYSTEM CONFIGURATION
# =====================================================

log "🔧 Final system configuration..."

# Increase file limits
echo "* soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65535" | sudo tee -a /etc/security/limits.conf

# Configure kernel parameters for better network performance
sudo tee -a /etc/sysctl.conf > /dev/null << 'EOF'

# Network performance tuning for Node.js applications
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr
EOF

# Apply sysctl changes
sudo sysctl -p

success "System configuration completed"

# =====================================================
# 16. SECURITY HARDENING
# =====================================================

log "🔐 Applying security hardening..."

# Disable root login via SSH
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Enable key-based authentication only
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Restart SSH service
sudo systemctl restart ssh

# Set up fail2ban for additional security
sudo apt install -y fail2ban

# Configure fail2ban
sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

# Enable and start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

success "Security hardening applied"

# =====================================================
# 17. DEPLOYMENT PREPARATION
# =====================================================

log "📦 Preparing for application deployment..."

# Create deployment script
sudo tee $APP_DIR/deploy.sh > /dev/null << 'EOF'
#!/bin/bash

# Deployment script for Nexus Knowledge Copilot

set -e

APP_DIR="/opt/nexus-copilot"
REPO_URL="https://github.com/your-username/nexus-knowledge-copilot.git"
BRANCH="main"

echo "🚀 Starting deployment..."

# Stop the service
sudo systemctl stop nexus-knowledge-copilot

# Backup current version
if [ -d "$APP_DIR/current" ]; then
    mv $APP_DIR/current $APP_DIR/backup-$(date +%Y%m%d_%H%M%S)
fi

# Clone or update repository
if [ ! -d "$APP_DIR/repo" ]; then
    git clone $REPO_URL $APP_DIR/repo
else
    cd $APP_DIR/repo
    git fetch --all
    git reset --hard origin/$BRANCH
fi

# Copy backend files
cp -r $APP_DIR/repo/azure-migration/backend $APP_DIR/current

# Install dependencies
cd $APP_DIR/current
npm ci --only=production

# Copy environment file
if [ ! -f "$APP_DIR/current/.env" ]; then
    cp $APP_DIR/current/.env.example $APP_DIR/current/.env
    echo "⚠️  Please configure .env file before starting the service"
fi

# Set permissions
sudo chown -R nexusapp:nexusapp $APP_DIR

# Run database migrations
node src/migrations/run-migrations.js

# Start the service
sudo systemctl start nexus-knowledge-copilot
sudo systemctl enable nexus-knowledge-copilot

# Restart Nginx
sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "📊 Check service status: sudo systemctl status nexus-knowledge-copilot"
echo "📝 Check logs: sudo journalctl -u nexus-knowledge-copilot -f"
EOF

sudo chmod +x $APP_DIR/deploy.sh
sudo chown $APP_USER:$APP_USER $APP_DIR/deploy.sh

success "Deployment script created"

# =====================================================
# COMPLETION
# =====================================================

success "🎉 Azure VM setup completed successfully!"

echo ""
echo "==============================================="
echo "🎯 NEXT STEPS:"
echo "==============================================="
echo ""
echo "1. 🔧 Configure environment variables:"
echo "   - Edit $APP_DIR/.env with your database and API credentials"
echo ""
echo "2. 🗄️  Set up the database:"
echo "   - Run: sqlcmd -S localhost -U sa -P 'nexus2024!' -i azure-migration/sql-server-schema.sql"
echo ""
echo "3. 📦 Deploy your application:"
echo "   - Run: sudo -u $APP_USER $APP_DIR/deploy.sh"
echo ""
echo "4. 🔒 Configure SSL certificate:"
echo "   - Point your domain to this server"
echo "   - Update server_name in Nginx config"
echo "   - Run: sudo certbot --nginx -d yourdomain.com"
echo ""
echo "5. 🔐 Configure SSH keys (disable password auth):"
echo "   - Add your public key to ~/.ssh/authorized_keys"
echo "   - Test key-based login before closing this session"
echo ""
echo "6. 📊 Monitor the system:"
echo "   - Service status: sudo systemctl status nexus-knowledge-copilot"
echo "   - View logs: sudo journalctl -u nexus-knowledge-copilot -f"
echo "   - Nginx status: sudo systemctl status nginx"
echo "   - Database status: sudo systemctl status mssql-server"
echo ""
echo "==============================================="
echo "📋 INSTALLED COMPONENTS:"
echo "==============================================="
echo "✅ Node.js $(node --version)"
echo "✅ SQL Server 2019"
echo "✅ Redis server"
echo "✅ Nginx web server"
echo "✅ Docker & Docker Compose"
echo "✅ PM2 process manager"
echo "✅ UFW firewall"
echo "✅ Fail2ban security"
echo "✅ Certbot for SSL"
echo "✅ Automated backups"
echo "✅ Health monitoring"
echo "✅ Log rotation"
echo ""

success "Setup script completed. Server is ready for deployment!"