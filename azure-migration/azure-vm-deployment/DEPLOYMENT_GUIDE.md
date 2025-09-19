# Azure VM Deployment Guide
## Nexus Knowledge Copilot - Plan C: Linux Virtual Machine

This guide provides step-by-step instructions for deploying the Nexus Knowledge Copilot application to an Azure Linux VM with SQL Server.

## 📋 Prerequisites

### Local Requirements
- Azure CLI installed and configured
- SSH key pair generated
- Git repository access
- Domain name (optional, for SSL)

### Azure Subscription
- Active Azure subscription
- Resource group creation permissions
- VM creation permissions

---

## 🚀 Quick Deployment

### Option 1: One-Click ARM Template Deployment

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fyour-repo%2Fnexus-knowledge-copilot%2Fmain%2Fazure-migration%2Fazure-vm-deployment%2Fazure-arm-template.json)

1. Click the "Deploy to Azure" button above
2. Fill in the required parameters:
   - **VM Name**: `nexus-copilot-vm`
   - **Admin Username**: Your SSH username
   - **SSH Public Key**: Your public SSH key
   - **SQL Server Password**: Strong password for SA account
   - **Domain Name**: Your domain (optional)
3. Review and create the deployment

### Option 2: Azure CLI Deployment

```bash
# Clone the repository
git clone https://github.com/your-username/nexus-knowledge-copilot.git
cd nexus-knowledge-copilot/azure-migration/azure-vm-deployment

# Login to Azure
az login

# Create resource group
az group create --name nexus-copilot-rg --location eastus

# Deploy the ARM template
az deployment group create \
  --resource-group nexus-copilot-rg \
  --template-file azure-arm-template.json \
  --parameters vmName=nexus-copilot-vm \
               adminUsername=azureuser \
               adminPasswordOrKey="$(cat ~/.ssh/id_rsa.pub)" \
               sqlServerPassword="YourStrongPassword123!" \
               domainName="yourdomain.com"
```

---

## 🔧 Manual VM Setup

If you prefer to set up the VM manually or customize the installation:

### Step 1: Create Ubuntu VM

```bash
# Create VM
az vm create \
  --resource-group nexus-copilot-rg \
  --name nexus-copilot-vm \
  --image Ubuntu2004 \
  --size Standard_D2s_v5 \
  --admin-username azureuser \
  --ssh-key-values ~/.ssh/id_rsa.pub \
  --public-ip-sku Standard

# Open required ports
az vm open-port --resource-group nexus-copilot-rg --name nexus-copilot-vm --port 22 --priority 1001
az vm open-port --resource-group nexus-copilot-rg --name nexus-copilot-vm --port 80 --priority 1002
az vm open-port --resource-group nexus-copilot-rg --name nexus-copilot-vm --port 443 --priority 1003
az vm open-port --resource-group nexus-copilot-rg --name nexus-copilot-vm --port 3001 --priority 1004
```

### Step 2: Connect and Run Setup Script

```bash
# Get VM public IP
VM_IP=$(az vm show -d -g nexus-copilot-rg -n nexus-copilot-vm --query publicIps -o tsv)

# Connect to VM
ssh azureuser@$VM_IP

# Download and run setup script
wget https://raw.githubusercontent.com/your-repo/nexus-knowledge-copilot/main/azure-migration/azure-vm-deployment/azure-vm-setup.sh
chmod +x azure-vm-setup.sh
sudo ./azure-vm-setup.sh
```

---

## 📦 Application Deployment

### Step 3: Deploy Application Code

```bash
# SSH into your VM
ssh azureuser@your-vm-ip

# Switch to application user
sudo su - nexusapp

# Clone the repository
git clone https://github.com/your-username/nexus-knowledge-copilot.git
cd nexus-knowledge-copilot

# Copy backend files to application directory
sudo cp -r azure-migration/backend/* /opt/nexus-copilot/

# Set proper ownership
sudo chown -R nexusapp:nexusapp /opt/nexus-copilot

# Navigate to app directory
cd /opt/nexus-copilot

# Install dependencies
npm ci --only=production
```

### Step 4: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

Update the `.env` file with your configuration:

```bash
# Database Configuration
DB_SERVER=localhost
DB_DATABASE=NexusKnowledgeCopilot
DB_USER=sa
DB_PASSWORD=YourStrongPassword123!

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secret-jwt-key-256-bits-minimum

# Email Configuration (configure with your SMTP provider)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-app-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Canva Integration
CANVA_CLIENT_ID=your-canva-client-id
CANVA_CLIENT_SECRET=your-canva-client-secret
CANVA_REDIRECT_URI=https://yourdomain.com/api/canva/callback

# Production settings
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Step 5: Initialize Database

```bash
# Run the database schema creation
sqlcmd -S localhost -U sa -P 'YourStrongPassword123!' -i /home/azureuser/nexus-knowledge-copilot/azure-migration/sql-server-schema.sql

# Run any additional migrations
node src/migrations/run-migrations.js
```

### Step 6: Start the Application

```bash
# Enable and start the systemd service
sudo systemctl enable nexus-knowledge-copilot
sudo systemctl start nexus-knowledge-copilot

# Check service status
sudo systemctl status nexus-knowledge-copilot

# View logs
sudo journalctl -u nexus-knowledge-copilot -f
```

### Step 7: Configure Nginx and SSL

```bash
# Update Nginx configuration with your domain
sudo nano /etc/nginx/sites-available/nexus-knowledge-copilot

# Replace server_name _ with your domain:
# server_name yourdomain.com www.yourdomain.com;

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Set up SSL certificate with Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verify SSL renewal
sudo certbot renew --dry-run
```

---

## 🐳 Docker Deployment (Alternative)

If you prefer using Docker for easier deployment and management:

### Deploy with Docker Compose

```bash
# Copy Docker Compose configuration
scp docker-compose.yml azureuser@your-vm-ip:~/

# SSH into VM
ssh azureuser@your-vm-ip

# Start the full stack
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

---

## 🔍 Verification and Testing

### Health Checks

```bash
# Test API health endpoint
curl -f http://localhost:3001/health

# Test detailed health check
curl -f http://localhost:3001/health/detailed

# Test database connection
sqlcmd -S localhost -U sa -P 'YourStrongPassword123!' -Q "SELECT 1"

# Test Redis connection
redis-cli ping
```

### Service Status

```bash
# Check all services
sudo systemctl status nexus-knowledge-copilot
sudo systemctl status nginx
sudo systemctl status mssql-server
sudo systemctl status redis-server

# Check open ports
sudo netstat -tlnp | grep -E ':(80|443|3001|1433|6379)'

# Check firewall status
sudo ufw status
```

### Application Testing

```bash
# Test API endpoints
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "displayName": "Test User"
  }'

# Test authentication
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

---

## 📊 Monitoring and Maintenance

### Log Files Locations

```bash
# Application logs
tail -f /opt/nexus-copilot/logs/app.log
tail -f /opt/nexus-copilot/logs/error.log

# System logs
sudo journalctl -u nexus-knowledge-copilot -f
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# SQL Server logs
sudo tail -f /var/opt/mssql/log/errorlog
```

### Performance Monitoring

```bash
# System resources
htop
df -h
free -h

# Database performance
sqlcmd -S localhost -U sa -P 'YourStrongPassword123!' -Q "
  SELECT
    DB_NAME(database_id) as DatabaseName,
    COUNT(*) as Connections
  FROM sys.dm_exec_sessions
  WHERE database_id > 0
  GROUP BY database_id"

# Application metrics
curl -s http://localhost:3001/health/detailed | jq .
```

### Backup Procedures

```bash
# Manual backup
sudo /usr/local/bin/nexus-backup.sh

# View backup files
ls -la /opt/nexus-copilot/backups/

# Restore database backup (if needed)
sqlcmd -S localhost -U sa -P 'YourStrongPassword123!' -Q "
  RESTORE DATABASE [NexusKnowledgeCopilot]
  FROM DISK = '/opt/nexus-copilot/backups/database_YYYYMMDD_HHMMSS.bak'
  WITH REPLACE"
```

---

## 🔧 Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check detailed error logs
sudo journalctl -u nexus-knowledge-copilot --no-pager

# Check configuration
node -c /opt/nexus-copilot/server.js

# Check database connection
sqlcmd -S localhost -U sa -P 'YourStrongPassword123!' -Q "SELECT 1"
```

#### Database Connection Issues

```bash
# Check SQL Server status
sudo systemctl status mssql-server

# Check if SQL Server is listening
sudo netstat -tlnp | grep 1433

# Test connection with different tools
telnet localhost 1433
```

#### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test SSL configuration
sudo nginx -t
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

#### High Resource Usage

```bash
# Check resource usage
htop
iotop
free -h
df -h

# Optimize SQL Server memory (if needed)
sqlcmd -S localhost -U sa -P 'YourStrongPassword123!' -Q "
  EXEC sp_configure 'max server memory', 4096;
  RECONFIGURE;"
```

### Getting Help

- Check the application logs first
- Review the setup log: `/var/log/nexus-setup.log`
- Verify all services are running
- Check firewall and network connectivity
- Ensure environment variables are correctly set

---

## 💰 Cost Optimization

### Azure VM Specifications (Plan C)
- **VM Size**: Standard_D2s_v5
- **vCPUs**: 2
- **RAM**: 8GB
- **Storage**: 64GB Premium SSD
- **Estimated Cost**: ~$19.60/day (~$588/month)

### Cost Reduction Tips

1. **Auto-shutdown**: Configure VM to shut down during non-business hours
2. **Reserved Instances**: Use Azure Reserved VM Instances for long-term savings
3. **Storage Optimization**: Use Standard SSD for non-critical data
4. **Monitoring**: Set up Azure Cost Management alerts

```bash
# Set up auto-shutdown (Azure CLI)
az vm auto-shutdown -g nexus-copilot-rg -n nexus-copilot-vm --time 1900 --email your-email@example.com
```

---

## 🔄 Updates and Maintenance

### Application Updates

```bash
# Create update script
sudo tee /usr/local/bin/nexus-update.sh > /dev/null << 'EOF'
#!/bin/bash
set -e

echo "🔄 Starting application update..."

# Backup current version
sudo systemctl stop nexus-knowledge-copilot
cp -r /opt/nexus-copilot /opt/nexus-copilot-backup-$(date +%Y%m%d)

# Pull latest changes
cd /opt/nexus-copilot
git pull origin main

# Install dependencies
npm ci --only=production

# Run migrations
node src/migrations/run-migrations.js

# Start service
sudo systemctl start nexus-knowledge-copilot

echo "✅ Update completed successfully!"
EOF

sudo chmod +x /usr/local/bin/nexus-update.sh
```

### System Updates

```bash
# Regular system maintenance script
sudo tee /usr/local/bin/system-maintenance.sh > /dev/null << 'EOF'
#!/bin/bash

echo "🔧 Starting system maintenance..."

# Update packages
apt update && apt upgrade -y

# Clean up logs
journalctl --vacuum-time=7d

# Clean up old backups
find /opt/nexus-copilot/backups -mtime +30 -delete

# Restart services if needed
systemctl daemon-reload

echo "✅ System maintenance completed!"
EOF

sudo chmod +x /usr/local/bin/system-maintenance.sh

# Schedule weekly maintenance
echo "0 3 * * 0 root /usr/local/bin/system-maintenance.sh" | sudo tee -a /etc/crontab
```

---

## 📚 Additional Resources

- [Azure Virtual Machines Documentation](https://docs.microsoft.com/en-us/azure/virtual-machines/)
- [SQL Server on Linux Documentation](https://docs.microsoft.com/en-us/sql/linux/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Let's Encrypt SSL Setup](https://letsencrypt.org/getting-started/)

---

**🎉 Congratulations!** Your Nexus Knowledge Copilot application is now successfully deployed on Azure VM with high availability, security, and monitoring capabilities.