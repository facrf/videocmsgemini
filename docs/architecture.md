# Arquitetura do VideoCMS

O **VideoCMS** é uma solução moderna e modular de *Content Management System / Video Management System* (CMS/VMS) desenvolvida em Go e React + TypeScript, projetada especificamente para descoberta em rede local, cadastro, diagnóstico técnico profundo, gerenciamento e monitoramento de câmeras IP e feeds RTSP.

---

## 1. Visão Geral da Arquitetura

O sistema opera como um servidor autônomo (Single-Origin) que roda por padrão em `http://localhost:15000` (`CMS_PORT=15000`). Ele agrupa a API REST, o corretor de eventos em tempo real Server-Sent Events (SSE), o gerenciador de streams de vídeo (`StreamManager`) e os arquivos estáticos compilados da interface web.

```mermaid
flowchart TD
    subgraph Browser ["Navegador / Cliente Web"]
        UI["React + TypeScript SPA"]
        SSEHook["SSE Event Consumer"]
        LiveGrid["Mosaico CCTV (1 a 32 slots)"]
    end

    subgraph Backend ["Servidor VideoCMS (Go) - Porta 15000"]
        API["REST Router & Middleware"]
        SSEBroker["SSE Event Broker (Pub/Sub)"]
        
        subgraph Services ["Camada de Serviços & Domínio"]
            CamService["Camera Service"]
            DiagRunner["Diagnostics Runner (10 Etapas)"]
            HealthWorker["Health Checker (Background)"]
            DiscService["Discovery Service"]
            StreamMgr["Stream Manager (Shared Ingest 1:N)"]
        end

        subgraph Adapters ["Protocol & Vendor Adapters"]
            Registry["Adapter Registry (Priority Chain)"]
            ONVIF["ONVIF Profile S/G/T (SOAP WS-Security)"]
            Dahua["Dahua Adapter (CGI / Digest)"]
            Intelbras["Intelbras Adapter (CGI / Auth)"]
            GenericRTSP["Generic RTSP Adapter"]
        end

        subgraph Security ["Segurança & Rede"]
            SSRFShield["SSRF Network Validator (RFC 1918)"]
            AESCrypto["AES-256-GCM Crypto (CMS_SECRET_KEY)"]
            LogRedactor["Sensitive Log Redactor"]
        end

        subgraph Persistence ["Persistência"]
            SQLite["SQLite Driver (WAL Mode & Migrations)"]
        end
    end

    subgraph NetworkCameras ["Câmeras IP / Gravadores na Rede Local"]
        Cam1["Câmera ONVIF 1 (192.168.1.100)"]
        Cam2["Câmera Dahua (192.168.1.101)"]
        Cam3["Câmera Intelbras (192.168.1.102)"]
        CamN["Câmera RTSP Genérica (192.168.1.103)"]
    end

    UI -->|HTTP REST Requests| API
    SSEBroker -->|Server-Sent Events| SSEHook
    LiveGrid -->|MJPEG Live Streams| StreamMgr
    
    API --> CamService
    API --> DiscService
    API --> StreamMgr
    
    CamService --> Registry
    CamService --> DiagRunner
    CamService --> SQLite
    
    HealthWorker --> CamService
    HealthWorker --> SSEBroker
    
    DiscService --> SSRFShield
    DiscService --> Registry
    DiscService --> SSEBroker
    
    Registry --> ONVIF
    Registry --> Dahua
    Registry --> Intelbras
    Registry --> GenericRTSP

    ONVIF --> SSRFShield
    Dahua --> SSRFShield
    Intelbras --> SSRFShield
    GenericRTSP --> SSRFShield

    SSRFShield --> Cam1
    SSRFShield --> Cam2
    SSRFShield --> Cam3
    SSRFShield --> CamN

    StreamMgr --> SSRFShield
    CamService --> AESCrypto
```

---

## 2. Componentes Principais

### 2.1 Backend (Go)

- **`internal/config`**: Carregamento contextual de variáveis de ambiente com defaults seguros (`CMS_PORT=15000`, `CMS_ALLOWED_NETWORKS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.0/8`, `CMS_CAMERA_HEALTH_INTERVAL=30s`).
- **`internal/security`**:
  - `crypto.go`: Criptografia de senhas em repouso com algoritmo padrão **AES-256-GCM** com chave de 32 bytes derivada via SHA-256 de `CMS_SECRET_KEY` e vetor de inicialização aleatório (*nonce* de 12 bytes).
  - `redactor.go`: Sanitização rigorosa de logs, credenciais em URLs RTSP (`rtsp://admin:***@host:554/...`), payloads JSON e cabeçalhos `Authorization`.
- **`internal/network`**:
  - `ssrf.go`: Validação estrita de destinos de rede antes de qualquer conexão de saída. Impede varredura ou acesso a redes públicas ou endpoints de metadados em nuvem (`169.254.169.254`). Implementa `SafeDialContext` com resolução DNS segura contra ataques de DNS Rebinding.
- **`internal/database` & `migrations`**:
  - Driver puro Go SQLite (`modernc.org/sqlite`) com modo WAL (*Write-Ahead Logging*), *foreign keys* ativas e `busy_timeout` de 5 segundos.
  - Execução sequencial e transacional de migrações embutidas via `migrations.FS`.
- **`internal/onvif`**:
  - `wsdiscovery.go`: Provedor de sondagem multicast WS-Discovery (`239.255.255.250:3702`) com parser XML resiliente.
  - `soap.go` & `client.go`: Cliente ONVIF SOAP completo com autenticação **WS-Security UsernameToken PasswordDigest** (`Base64(SHA1(nonce + created + password))`). Suporte para `GetDeviceInformation`, `GetCapabilities`, `GetProfiles`, `GetStreamUri`, `GetSnapshotUri` e `FetchSnapshot`.
  - `ptz.go`: Controlador PTZ com `ContinuousMove`, `Stop`, `AbsoluteMove`, `RelativeMove`, `GetPresets`, `GotoPreset`.
- **`internal/vendors`**:
  - Cadeia de adaptadores modulares com ordem de resolução estrita:
    $$\text{ONVIF} \longrightarrow \text{Capabilities} \longrightarrow \text{Dahua} \longrightarrow \text{Intelbras} \longrightarrow \text{Generic RTSP}$$
  - Adaptação sem suposição cega: modelos Intelbras recebem tratamento específico e checam URLs próprias caso não suportem ONVIF nativo.
- **`internal/camera`**:
  - `repository.go`: Persistência parametrizada para catálogo de câmeras, layouts de mosaico, grupos e tags.
  - `diagnostics.go`: Executor de diagnóstico técnico em **10 etapas** executadas e reportadas sequencialmente com métricas em milissegundos.
  - `health.go`: Background worker de verificação periódica de conectividade com pool limitado de concorrência (`CMS_SCAN_MAX_CONCURRENCY`).
  - `service.go`: Camada de regras de negócio desacoplada.
- **`internal/discovery`**:
  - `scanner.go` & `service.go`: Gerenciador de tarefas de descoberta na rede local. Suporta cancelamento gracioso via `context.Context`, fila de concorrência limitada (máx 32 *workers* simultâneos) e emissão de eventos em tempo real via SSE.
- **`internal/streaming`**:
  - `manager.go`: Ingestão compartilhada (*Shared Ingest*): para múltiplos clientes visualizando a mesma câmera, apenas 1 conexão de ingestão é mantida com o dispositivo físico.
  - Suporte a seleção de perfil adaptativo (`substream` para grades densas de 4 a 32 câmeras e `main` para visualização ampliada/única).
  - Emissão de stream em formato multipart MJPEG compatível nativamente com todos os navegadores sem necessidade de transcodificação pesada ou dependências externas como FFmpeg.
- **`internal/events`**:
  - `broker.go`: Corretor SSE thread-safe com canais limitados (buffer de 64 mensagens) e descarte não bloqueante para evitar vazamentos de memória por clientes lentos.
- **`internal/api`**:
  - Roteamento RESTful limpo, middlewares de log estruturado, recuperação de panics (`recover`), CORS seguro e cabeçalhos de proteção (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`).

---

## 3. Interface Web (React + TypeScript)

- **Layout CCTV Dark Theme**: Interface profissional de central de segurança com paleta escura (Slate `#0b0f19`, borders `#1e293b`), indicadores de status LED (verde pulsante para online, vermelho para offline, amarelo para autenticação pendente).
- **Mosaicos Flexíveis (1 a 32 posições)**:
  - Modos de grade pré-configurados: 1, 4, 6, 9, 12, 16, 25 e 32 câmeras.
  - Suporte a ampliação de slot com comutação instantânea para o stream principal (*main stream*).
  - Gaveta lateral de câmeras com atribuição rápida de slots.
  - Salvamento e carregamento de layouts persistidos no SQLite.
- **Painel de Diagnóstico em 10 Etapas**:
  - Permite aos operadores técnicos testar a conectividade completa de uma câmera e visualizar falhas específicas de autenticação, portas bloqueadas ou falta de substream.
- **Descoberta Visual em Tempo Real**:
  - Barra de progresso ao vivo via SSE com detecção imediata de dispositivos e formulário de *probe* com credenciais para onboarding no catálogo de câmeras em 1 clique.
