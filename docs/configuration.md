# Manual de Configuração e Variáveis de Ambiente

Todas as opções operacionais e de segurança do **VideoCMS** podem ser parametrizadas através de variáveis de ambiente ou arquivo `.env`.

---

## 1. Tabela Resumo das Variáveis

| Variável | Padrão | Obrigatória? | Exemplo |
| :--- | :--- | :---: | :--- |
| `CMS_PORT` | `15000` | Não | `15000` |
| `CMS_HOST` | `0.0.0.0` | Não | `0.0.0.0` ou `127.0.0.1` |
| `CMS_DB_PATH` | `./data/cms.db` | Não | `/app/data/cms.db` |
| `CMS_SECRET_KEY` | `videocms-secret-key-32bytes-long!!` | **Sim (Produção)** | `c8f391b4e2a74...` (32+ caracteres) |
| `CMS_ALLOWED_NETWORKS` | `10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.0/8` | Não | `192.168.1.0/24,10.0.0.0/16` |
| `CMS_SCAN_ENABLED` | `true` | Não | `true` ou `false` |
| `CMS_SCAN_MAX_CONCURRENCY` | `32` | Não | `16` ou `64` |
| `CMS_SCAN_TIMEOUT` | `2s` | Não | `1s`, `2s`, `3s` |
| `CMS_CAMERA_HEALTH_INTERVAL` | `30s` | Não | `15s`, `30s`, `1m` |
| `CMS_LOG_LEVEL` | `info` | Não | `debug`, `info`, `warn`, `error` |
| `CMS_STATIC_DIR` | `./web/dist` | Não | `/app/web/dist` |

---

## 2. Detalhamento de Cada Variável

### `CMS_PORT`
- **Finalidade:** Define a porta TCP na qual o servidor HTTP unificado (API REST, SSE, StreamManager e Frontend SPA) escutará requisições.
- **Valor Padrão:** `15000`
- **Obrigatória:** Não.
- **Exemplo:** `CMS_PORT=15000`
- **Impacto de Segurança:** Certifique-se de que a porta escolhida não entre em conflito com outros serviços e configure firewalls para limitar o acesso apenas a redes autorizadas.

---

### `CMS_HOST`
- **Finalidade:** Define o endereço de interface no qual o servidor fará o bind TCP.
- **Valor Padrão:** `0.0.0.0` (todas as interfaces de rede).
- **Obrigatória:** Não.
- **Exemplo:** `CMS_HOST=0.0.0.0` (em containers) ou `CMS_HOST=127.0.0.1` (para isolar localmente).
- **Impacto de Segurança:** Usar `0.0.0.0` permite conexões de qualquer dispositivo na rede local. Usar `127.0.0.1` restringe o acesso exclusivamente à máquina local.

---

### `CMS_DB_PATH`
- **Finalidade:** Caminho no sistema de arquivos para o arquivo SQLite.
- **Valor Padrão:** `./data/cms.db` (local) ou `/app/data/cms.db` (Docker).
- **Obrigatória:** Não.
- **Exemplo:** `CMS_DB_PATH=/app/data/cms.db`
- **Impacto de Segurança:** O diretório de dados deve possuir permissões restritas (apenas leitura/escrita para o usuário da aplicação `cms`), pois contém informações de cadastro e dados criptografados.

---

### `CMS_SECRET_KEY`
- **Finalidade:** Chave secreta de criptografia utilizada pelo algoritmo **AES-256-GCM** para cifrar e decifrar as senhas das câmeras IP armazenadas no banco de dados.
- **Valor Padrão:** Valor padrão inseguro de desenvolvimento.
- **Obrigatória:** **Sim, para qualquer ambiente de produção.**
- **Exemplo:** `CMS_SECRET_KEY=9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1` (uma string aleatória de alta entropia de pelo menos 32 caracteres).
- **Impacto de Segurança:** Crítico. Se a chave for perdida, as senhas de câmeras cadastradas não poderão mais ser decifradas para conexões ONVIF/RTSP. Se for exposta, senhas do banco podem ser comprometidas caso haja acesso físico ao arquivo SQLite.

---

### `CMS_ALLOWED_NETWORKS`
- **Finalidade:** Allowlist de sub-redes IPv4 em notação CIDR autorizadas para conexão de saída e descoberta automática. Implementa a proteção contra **SSRF (Server-Side Request Forgery)** e ataques de **DNS Rebinding**.
- **Valor Padrão:** `10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.0/8` (redes privadas RFC 1918 e loopback).
- **Obrigatória:** Não.
- **Exemplo:** `CMS_ALLOWED_NETWORKS=192.168.1.0/24,10.0.10.0/24`
- **Impacto de Segurança:** Fundamental. Impede que operadores ou atacantes usem o servidor VideoCMS para realizar varreduras na Internet pública, ou para atacar serviços de metadados em nuvem (`169.254.169.254`).

---

### `CMS_SCAN_ENABLED`
- **Finalidade:** Habilita ou desabilita globalmente o recurso de varredura e descoberta de rede.
- **Valor Padrão:** `true`
- **Obrigatória:** Não.
- **Exemplo:** `CMS_SCAN_ENABLED=false` (em ambientes restritos onde câmeras devem ser cadastradas estritamente de forma manual).
- **Impacto de Segurança:** Desabilitar impede qualquer geração de tráfego de varredura na rede.

---

### `CMS_SCAN_MAX_CONCURRENCY`
- **Finalidade:** Limite máximo de goroutines / conexões simultâneas durante a varredura de sub-redes CIDR.
- **Valor Padrão:** `32`
- **Obrigatória:** Não.
- **Exemplo:** `CMS_SCAN_MAX_CONCURRENCY=16`
- **Impacto de Segurança:** Evita saturação da CPU, esgotamento de descritores de arquivo (file descriptors) e sobrecarga de switches ou roteadores na rede local.

---

### `CMS_SCAN_TIMEOUT`
- **Finalidade:** Timeout máximo para tentativa de abertura de socket TCP por porta/host durante a varredura.
- **Valor Padrão:** `2s`
- **Obrigatória:** Não.
- **Exemplo:** `CMS_SCAN_TIMEOUT=1500ms`
- **Impacto de Segurança:** Valores excessivamente altos tornam a varredura lenta; valores muito baixos em redes Wi-Fi podem gerar falsos negativos.

---

### `CMS_CAMERA_HEALTH_INTERVAL`
- **Finalidade:** Intervalo do worker em background que verifica periodicamente o status de conectividade (online/offline) de todas as câmeras cadastradas.
- **Valor Padrão:** `30s`
- **Obrigatória:** Não.
- **Exemplo:** `CMS_CAMERA_HEALTH_INTERVAL=1m`
- **Impacto de Segurança:** Controla a frequência de polling sobre as câmeras físicas para evitar sobrecarga em processadores de câmeras IP de baixo custo.

---

### `CMS_LOG_LEVEL`
- **Finalidade:** Nível de granularidade dos logs estruturados em JSON emitidos no stdout.
- **Valor Padrão:** `info` (opções: `debug`, `info`, `warn`, `error`).
- **Obrigatória:** Não.
- **Exemplo:** `CMS_LOG_LEVEL=debug`
- **Impacto de Segurança:** O redator de credenciais (`internal/security/redactor.go`) atua independentemente do nível de log, garantindo que senhas e tokens nunca apareçam nos logs mesmo em modo `debug`.
