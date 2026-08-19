# VideoCMS - Central de Videomonitoramento e Gestão de Câmeras IP

O **VideoCMS** é uma plataforma profissional de CMS/VMS (Content & Video Management System) desenvolvida em **Go** e **React com TypeScript**, criada para descoberta automatizada em rede local, cadastro, diagnóstico técnico em 10 etapas, gerenciamento e visualização de transmissões de vídeo ao vivo de câmeras IP e gravadores (NVR/DVR).

---

## 1. Destaques e Funcionalidades

- **Descoberta Inteligente em Rede Local:**
  - Sondagem multicast automática **WS-Discovery (ONVIF)** na porta UDP 3702 (`239.255.255.250`).
  - Varredura controlada por faixa CIDR (ex: `192.168.1.0/24`) com portas candidatas e detecção de banners.
  - Progresso da varredura e dispositivos descobertos transmitidos em tempo real via **Server-Sent Events (SSE)**.
  - Rastreamento por MAC/UUID e alerta de alteração de IP (**DHCP**) para atualização sem duplicação de cadastros.
- **Mosaico CCTV Adaptativo (1 a 32 Câmeras):**
  - Grades flexíveis com presets para **1, 4, 6, 9, 12, 16, 25 e 32 câmeras**.
  - **Shared Ingest (1:N):** Mantém apenas 1 conexão de ingestão com a câmera para múltiplos visualizadores web.
  - **Seleção Adaptativa de Perfis:** Utiliza automaticamente o perfil de *substream* (baixa resolução e baixo consumo de banda) para mosaicos densos e comuta para o *mainstream* ao ampliar uma câmera.
  - Gaveta lateral para atribuição rápida de câmeras a qualquer slot.
  - Salvamento e carregamento de layouts persistidos no banco de dados.
- **Diagnóstico Técnico Profundo (10 Etapas):**
  - Checklist automatizado com medição de latência:
    1. Resolução do Host
    2. Conectividade TCP
    3. Serviço HTTP
    4. Endpoint ONVIF
    5. Autenticação WS-Security (UsernameToken PasswordDigest)
    6. Informações do Dispositivo (Fabricante, Modelo, Firmware)
    7. Extração de Perfis de Mídia (Mainstream / Substream)
    8. Conectividade RTSP
    9. Codec & Substream
    10. Captura de Snapshot Instantâneo
- **Segurança Reforçada:**
  - **Criptografia em Repouso:** Senhas de câmeras criptografadas com **AES-256-GCM** via `CMS_SECRET_KEY`.
  - **Proteção contra SSRF e DNS Rebinding:** Validação estrita de IPs (`CMS_ALLOWED_NETWORKS`) bloqueando redes públicas e endpoints de metadados em nuvem (`169.254.169.254`).
  - **Sanitização de Logs:** Redação automática de senhas em URLs RTSP, cabeçalhos `Authorization` e payloads JSON.
- **Persistência e Confiabilidade:**
  - Banco de dados SQLite embarcado com modo **WAL (Write-Ahead Logging)**, `busy_timeout=5000` e migrações versionadas.

---

## 2. Documentação Técnica Completa

Para aprofundamento em tópicos específicos, consulte a documentação dedicada:

- 📐 [**Arquitetura & Diagramas**](docs/architecture.md): Visão detalhada de componentes e fluxos Mermaid.
- 📡 [**Matriz de Protocolos**](docs/protocols.md): Status e suporte ONVIF, Dahua, Intelbras e RTSP genérico.
- 🚀 [**Guia de Implantação (Deployment)**](docs/deployment.md): Build local, Docker, Docker Compose, volumes e backups.
- ⚙️ [**Manual de Configuração**](docs/configuration.md): Referência completa de todas as variáveis de ambiente.
- 🔍 [**Guia de Descoberta (Discovery)**](docs/discovery.md): Detalhes sobre WS-Discovery, scanner CIDR e DHCP.
- 🎥 [**Arquitetura de Streaming**](docs/streaming.md): StreamManager, ingestão compartilhada e seleção de perfis.
- 🛡️ [**Diretrizes de Segurança**](docs/security.md): Criptografia, SSRF, redação de logs e proteção na LAN.
- 🩺 [**Resolução de Problemas**](docs/troubleshooting.md): Diagnósticos, causas e correções de problemas comuns.
- 💻 [**Guia de Desenvolvimento**](docs/development.md): Instruções para desenvolvedores, novos adaptadores e testes.
- 📄 [**Especificação OpenAPI 3.0**](docs/openapi.yaml): Definição de todos os endpoints REST e schemas.

---

## 3. Como Executar

### 3.1 Execução com Docker e Docker Compose (Recomendado)

#### Build da Imagem
```bash
docker build -t videocms .
# ou: make docker-build
```

#### Execução com Docker CLI
```bash
docker run -d \
  --name videocms \
  -p 15000:15000 \
  -v videocms-data:/app/data \
  --env-file .env \
  --restart unless-stopped \
  videocms:latest
```

#### Execução com Docker Compose
```bash
# Iniciar em background
docker compose up -d
# ou: make docker-up

# Acompanhar logs
docker compose logs -f cms
# ou: make docker-logs

# Parar serviços (mantendo o volume de dados)
docker compose down
# ou: make docker-down
```

---

### 3.2 Execução Local (Bare Metal / VM)

```bash
# 1. Executar testes unitários com race detector
make test

# 2. Compilar frontend e backend
make build

# 3. Iniciar o servidor
make dev
```

A interface web estará disponível em:
👉 **`http://localhost:15000`**

---

## 4. Comandos Utilitários CLI

O binário do VideoCMS inclui comandos utilitários integrados:

```bash
# Verificação de saúde (utilizado pelo healthcheck do Docker)
./bin/cms healthcheck

# Backup online consistente do banco SQLite (sem parar o servidor)
./bin/cms backup ./data/backup_$(date +%Y%m%d_%H%M%S).db

# Exibir versão e metadados de build
./bin/cms version
```

---

## 5. Recomendações de Produção e Segurança

- **Destinação Inicial em Rede Local (LAN):** O VideoCMS é destinado prioritariamente ao uso em rede local privada. **Nunca exponha a porta 15000 diretamente para a Internet pública.**
- **Acesso Remoto Seguro:** Caso necessite de acesso remoto fora da empresa/residência, utilize:
  1. **VPN Privada** (WireGuard, Tailscale ou OpenVPN); ou
  2. **Reverse Proxy Seguro** (Nginx/Caddy/Traefik) com certificado SSL/TLS (HTTPS) e autenticação de borda (OAuth2, OIDC ou Cloudflare Access).
