# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### Planned
- Suporte a autenticação de operadores via JWT / Sessões web no backend.
- Controle PTZ contínuo através da interface web.
- Gravação de clipes acionados por eventos ONVIF.

---

## [0.1.1] - 2026-08-19

### Fixed
- Corrigida a compilação cruzada da imagem Docker com builders executados na plataforma do runner.
- Alinhada a versão do Go usada no Docker e no GitHub Actions com o `go.mod`.
- Corrigida a referência de imagem usada pelo scanner Trivy após a publicação.

### Changed
- Publicação GHCR ampliada para `linux/amd64`, `linux/arm64`, `linux/arm/v7`, `linux/arm/v6`, `linux/386`, `linux/riscv64`, `linux/ppc64le` e `linux/s390x`.
- Instalação das dependências do frontend no CI alterada para `npm ci`, usando o lockfile como chave de cache.

---

## [0.1.0] - 2026-08-18

### Added
- **Painel de Monitoramento CCTV:** Mosaico adaptativo com suporte a grids de 1, 4, 6, 9, 12, 16, 25 e 32 câmeras simultâneas.
- **Shared Ingest (1:N):** StreamManager centralizado com 1 conexão por câmera e distribuição em memória multipart MJPEG para múltiplos visualizadores sem sobrecarga de CPU.
- **Comutação Adaptativa de Perfis:** Alternância automática entre *substream* para miniaturas e *mainstream* ao maximizar um slot de vídeo.
- **Descoberta Inteligente em Rede Local:**
  - Sondagem multicast automática via **WS-Discovery** (UDP 3702 / `239.255.255.250`).
  - Scanner de sub-rede unicast controlado por CIDR com pool de concorrência (`CMS_SCAN_MAX_CONCURRENCY=32`).
  - Notificações de progresso em tempo real via Server-Sent Events (SSE).
- **Rastreamento de Identidade & DHCP:** Deduplicação por MAC Address, Serial Number e ONVIF UUID, com detecção e atualização de IP de câmeras com 1 clique.
- **Diagnóstico Técnico em 10 Etapas:** Validação de DNS, SSRF, portas TCP, banners HTTP, autenticação WS-Security, perfis de mídia, RTSP e snapshots com medição de latência.
- **Segurança Reforçada:**
  - Criptografia em repouso com **AES-256-GCM** para todas as senhas armazenadas (`CMS_SECRET_KEY`).
  - Validador de rede contra **SSRF e DNS Rebinding** (`CMS_ALLOWED_NETWORKS`) com bloqueio estrito de endpoints de metadados em nuvem (`169.254.169.254`).
  - Sanitização automática de credenciais e tokens em URLs RTSP, payloads JSON e logs.
- **Persistência SQLite:** Banco em modo **WAL (Write-Ahead Logging)** com migrações versionadas transacionais e backups online atômicos (`VACUUM INTO`).
- **Suporte Oficial a Containers:**
  - Dockerfile multi-stage com imagem final mínima baseada em Alpine Linux.
  - Execução sob usuário não-root `cms` (`UID: 10001`).
  - Healthcheck nativo (`cms healthcheck`).
  - Stacks completas para **Portainer** (modo bridge e modo host network).
  - Workflow automatizado do GitHub Actions para publicação multi-plataforma (`linux/amd64`, `linux/arm64`) no **GitHub Container Registry (GHCR)**.
- **Documentação Técnica Completa:** Especificação OpenAPI 3.0, manuais de arquitetura, protocolos, deployment, configuração, discovery, streaming, segurança, troubleshooting e desenvolvimento.
