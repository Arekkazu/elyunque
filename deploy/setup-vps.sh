#!/usr/bin/env bash
# Prepara un VPS Ubuntu/Debian para recibir despliegues de El Yunque.
# Uso (como root o con sudo):  sudo bash setup-vps.sh <usuario_despliegue>
set -euo pipefail
USUARIO="${1:?Indique el usuario de despliegue, ej.: deploy}"

# Docker y Compose
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
id "$USUARIO" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$USUARIO"
usermod -aG docker "$USUARIO"

# Firewall básico: SSH, HTTP y HTTPS (la API queda detrás de Nginx, no se publica)
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# SSH solo con llave (agregue la llave pública en ~/.ssh/authorized_keys del usuario)
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh || systemctl reload sshd

mkdir -p "/home/$USUARIO/elyunque"
chown -R "$USUARIO:$USUARIO" "/home/$USUARIO/elyunque"
echo "Listo. Cree /home/$USUARIO/elyunque/.env (ver deploy/.env.production.example)."
