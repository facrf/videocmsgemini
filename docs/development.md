# Guia de Desenvolvimento e Extensão do VideoCMS

Este guia orienta engenheiros e desenvolvedores sobre a arquitetura interna, como executar o ambiente de desenvolvimento local, como adicionar novos adaptadores de fabricantes e como rodar a suíte de testes.

---

## 1. Estrutura do Código-Fonte

```text
videocms/
├── cmd/
│   └── server/          # Entrypoint do executável principal (main.go e CLI)
├── internal/
│   ├── api/             # Servidor HTTP, Handlers REST, Middlewares, SSE
│   ├── camera/          # Modelos de câmera, repositório SQLite, diagnósticos
│   ├── config/          # Carregamento e validação de variáveis de ambiente
│   ├── database/        # Inicialização do SQLite, migrações versionadas
│   ├── discovery/       # Scanner de sub-rede CIDR e WS-Discovery multicast
│   ├── events/          # Broker pub/sub em memória para eventos em tempo real
│   ├── network/         # Validador SSRF, SafeDialer, SafeHTTPClient
│   ├── onvif/           # Cliente SOAP ONVIF (Device, Media, Snapshot, Profiles)
│   ├── security/        # Criptografia AES-256-GCM e redator de credenciais
│   ├── streaming/       # StreamManager (Shared Ingest, MJPEG, backoff exponencial)
│   ├── vendors/         # Adaptadores específicos (Dahua, Intelbras, Genérico)
│   └── testutil/        # Servidores falsos e utilitários de teste automatizado
├── migrations/          # Arquivos SQL de migração de esquema embarcados
├── web/                 # Frontend SPA em React 18, TypeScript e Vite
├── docs/                # Especificações e documentação técnica detalhada
├── Dockerfile           # Build multi-stage oficial
├── docker-compose.yml   # Orquestração para containers
└── Makefile             # Automação de compilação, testes e linters
```

---

## 2. Configurando o Ambiente de Desenvolvimento

### 2.1 Backend (Go)
```bash
# Executar testes unitários com detector de race conditions
go test -v -race ./...

# Validar com o linter oficial do Go
go vet ./...

# Formatar código
gofmt -s -w internal/ cmd/
```

### 2.2 Frontend (React + TypeScript)
```bash
cd web
npm install

# Executar servidor de desenvolvimento Vite com Hot Module Replacement
npm run dev

# Checagem estrita de tipos
npm run lint

# Compilar build de produção
npm run build
```

---

## 3. Adicionando um Novo Adaptador de Fabricante

O VideoCMS utiliza uma arquitetura extensível baseada na interface `VendorAdapter` ([`internal/camera/adapter.go`](file:///storage/www/projetos/videocms/gemini/internal/camera/adapter.go)):

```go
type VendorAdapter interface {
    Name() string
    CanHandle(ctx context.Context, dev DeviceInfo) bool
    DiscoverCapabilities(ctx context.Context, dev DeviceInfo, creds Credentials) (CameraCapabilities, error)
    TestConnection(ctx context.Context, cam *Camera, password string) error
    GetStreamURI(ctx context.Context, cam *Camera, profile string) (string, error)
}
```

### Passos para registrar novo fabricante:
1. Crie o arquivo `internal/vendors/<fabricante>.go`.
2. Implemente a interface `VendorAdapter`.
3. Registre a nova instância no construtor `vendors.NewRegistry()` em [`internal/vendors/registry.go`](file:///storage/www/projetos/videocms/gemini/internal/vendors/registry.go).
4. Adicione testes correspondentes em [`internal/vendors/vendor_test.go`](file:///storage/www/projetos/videocms/gemini/internal/vendors/vendor_test.go).

---

## 4. Padrões de API e Tratamento de Erros

Todas as respostas de erro da REST API devem utilizar o envelope padronizado:

```json
{
  "error": {
    "code": "CAMERA_NOT_FOUND",
    "message": "Câmera informada não foi localizada no catálogo"
  }
}
```

- **Sem Panics:** Nunca utilize `panic` em fluxo de execução regular. Trate todos os erros contextualmente.
- **Sanitização:** Nunca inclua credenciais ou strings com tokens em mensagens de log ou retornos de erro.
