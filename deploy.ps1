$ip = "147.93.179.208"
$user = "root"
$remotePath = "/var/www/contabilidade"
$localDist = ".\frontend\dist"
$localNginx = ".\nginx.conf"

Write-Host "--- Iniciando Deploy para Contabo ($ip) ---" -ForegroundColor Cyan

# 1. Preparar pastas no servidor
Write-Host "Step 1: Limpando pasta antiga no servidor..." -ForegroundColor Yellow
ssh "$user@$ip" "rm -rf $remotePath ; mkdir -p $remotePath"

# 2. Enviar arquivos do Build
Write-Host "Step 2: Enviando arquivos do dashboard (dist)..." -ForegroundColor Yellow
# Copiando o CONTEUDO de dist para o servidor
scp -r "$localDist\*" "$user@$ip:$remotePath"

# 3. Enviar configuração do Nginx
Write-Host "Step 3: Enviando configuração do Nginx..." -ForegroundColor Yellow
scp $localNginx "$user@$ip:/etc/nginx/sites-available/contabilidade"

# 4. Configurar Servidor (Nginx vs Apache)
Write-Host "Step 4: Desativando conflitos e iniciando site..." -ForegroundColor Yellow
ssh "$user@$ip" "
    systemctl stop apache2 ; 
    rm -f /etc/nginx/sites-enabled/default ; 
    ln -sf /etc/nginx/sites-available/contabilidade /etc/nginx/sites-enabled/ ; 
    chown -R www-data:www-data $remotePath ; 
    chmod -R 755 $remotePath ; 
    nginx -t ;
    systemctl restart nginx
"

Write-Host "--- DEPLOY FINALIZADO! ---" -ForegroundColor Green
Write-Host "Acesse: http://$ip" -ForegroundColor Cyan
pause
