# Guia de Implantação e Operação (Deployment)

Este documento descreve detalhadamente como construir, executar, atualizar, realizar backup e monitorar o **VideoCMS** tanto em ambiente local quanto através de containers Docker.

---

## 1. Implantação Local (Bare Metal / VM)

### 1.1 Requisitos
- **Go 1.22+** (para compilação do backend)
- **Node.js 18+** e **npm 10+** (para compilação do frontend)
- Sistema Operacional: Linux, macOS ou Windows

### 1.2 Compilação e Inicialização
```bash
# 1. Clonar repositório e entrar na pasta
cd /path/to/videocms

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Compilar frontend e backend
make build

# 4. Executar os testes automatizados
make test

# 5. Iniciar o servidor
make dev
# ou executar diretamente:
./bin/cms
```

O servidor inicializará escutando por padrão em `http://localhost:15000`.

---

## 2. Implantação com Docker

O VideoCMS disponibiliza um **Dockerfile multi-stage** otimizado que produz uma imagem final mínima baseada em Alpine Linux, executando como usuário não-root (`cms`).

### 2.1 Construção da Imagem Docker
```bash
docker build -t videocms:latest .
```

### 2.2 Execução com Docker CLI
```bash
docker run -d \
  --name videocms \
  -p 15000:15000 \
  -v videocms-data:/app/data \
  --env-file .env \
  --restart unless-stopped \
  videocms:latest
```

### 2.3 Execução com Docker Compose (Recomendado)
O arquivo `docker-compose.yml` pré-configurado gerencia a inicialização, o volume persistente e a leitura automática do `.env`:

```bash
# Iniciar o serviço em background
docker compose up -d

# Visualizar logs em tempo real
docker compose logs -f cms

# Verificar status e healthcheck
docker compose ps

# Parar o serviço (mantendo os dados do volume)
docker compose down
```

> ⚠️ **Atenção:** Nunca utilize `docker compose down -v` em ambientes de produção, pois o modificador `-v` apagará o volume persistente contendo o banco de dados SQLite.

---

## 3. Persistência do Banco de Dados SQLite

O VideoCMS utiliza SQLite configurado em modo **WAL (Write-Ahead Logging)** com `busy_timeout=5000` e chaves estrangeiras ativas.

- **Caminho no container:** `/app/data/cms.db`
- **Volume persistente:** `cms-data` mapeado para `/app/data`

Arquivos gerados no diretório de dados:
- `cms.db`: Arquivo principal do banco de dados relacional.
- `cms.db-wal`: Arquivo de log de escrita em modo WAL.
- `cms.db-shm`: Índice de memória compartilhada para leituras concorrentes.

---

## 4. Política de Rede e Descoberta Multicast no Docker

O protocolo **WS-Discovery** utiliza pacotes multicast UDP na porta 3702 (`239.255.255.250`). Em ambientes de rede virtualizada padrão do Docker (modo `bridge`), os pacotes multicast da LAN física não são roteados para dentro do container.

### Comportamento por Plataforma:
1. **Linux (Host Nativo):**
   Para habilitar a descoberta multicast automática na rede local física, adicione a diretiva `network_mode: host` no `docker-compose.yml` ou execute com `--network host`.
2. **Docker Desktop (macOS / Windows):**
   Devido à máquina virtual intermediária do Docker Desktop, o modo `host` não se conecta diretamente à interface física da LAN. Nestes ambientes, utilize a **varredura por sub-rede CIDR** (ex: `192.168.1.0/24`) diretamente na interface do VideoCMS.
3. **Modo Bridge Padrão:**
   A varredura CIDR controlada opera com total compatibilidade no modo bridge padrão em qualquer sistema operacional.

---

## 5. Procedimentos de Backup e Restore

### 5.1 Backup Online Atômico (Sem Parar a Aplicação)
O SQLite em modo WAL permite backups pontuais 100% consistentes através da API segura `VACUUM INTO`. O próprio binário do VideoCMS possui um comando integrado de backup:

```bash
# Executar backup via Docker
docker compose exec cms /app/cms backup /app/data/backup_$(date +%Y%m%d_%H%M%S).db

# Executar backup em instalação local
./bin/cms backup ./data/backup_$(date +%Y%m%d_%H%M%S).db
```

O comando recusa sobrescrever arquivos existentes para prevenir perda acidental de dados.

### 5.2 Restauração de Backup (Restore)
Para restaurar um backup anterior:

1. **Parar a aplicação:**
   ```bash
   docker compose stop cms
   ```
2. **Substituir o arquivo do banco de dados:**
   Copie o arquivo de backup para o destino oficial:
   ```bash
   cp /caminho/do/backup.db /var/lib/docker/volumes/videocms_cms-data/_data/cms.db
   ```
3. **Remover resíduos temporários de WAL (se existirem):**
   ```bash
   rm -f /var/lib/docker/volumes/videocms_cms-data/_data/cms.db-wal
   rm -f /var/lib/docker/volumes/videocms_cms-data/_data/cms.db-shm
   ```
4. **Reiniciar a aplicação:**
   ```bash
   docker compose start cms
   ```

---

## 6. Monitoramento, Logs e Healthcheck

### 6.1 Healthcheck Nativo
O container inclui verificação periódica de saúde através do comando `/app/cms healthcheck`, que consulta `GET /api/health` e valida o status do servidor e a conectividade com o banco SQLite.

```bash
# Teste manual do healthcheck
docker compose exec cms /app/cms healthcheck
# Saída esperada: Healthcheck OK (código de saída 0)
```

### 6.2 Consulta de Métricas e Logs
- **Logs estruturados (JSON):**
  ```bash
  docker compose logs -f cms
  ```
- **Endpoint de estatísticas operacionais:**
  ```bash
  curl -s http://localhost:15000/api/stats
  ```
- **Endpoint de streams ativos:**
  ```bash
  curl -s http://localhost:15000/api/streams
  ```
