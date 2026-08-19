# Diretrizes e Arquitetura de Segurança

O **VideoCMS** foi projetado seguindo princípios rigorosos de **Defesa em Profundidade (Defense in Depth)**, garantindo a proteção de credenciais de dispositivos, mitigação de vetores de ataque de rede como SSRF e isolamento seguro de processos.

---

## 1. Criptografia de Credenciais em Repouso

Em sistemas tradicionais de videomonitoramento, senhas de câmeras frequentemente acabam armazenadas em texto puro ou codificadas em Base64 dentro de URLs RTSP salvas no banco.

No VideoCMS:
- **Algoritmo:** **AES-256-GCM** (*Galois/Counter Mode*), fornecendo confidencialidade e integridade autenticada.
- **Derivação de Chave:** Uma chave criptográfica de 256 bits é derivada via SHA-256 a partir da variável de ambiente `CMS_SECRET_KEY`.
- **Vetor de Inicialização (Nonce):** Cada operação de criptografia gera um *nonce* criptograficamente aleatório de 12 bytes (`crypto/rand`), evitando que senhas idênticas produzam o mesmo texto cifrado.
- **URLs no Banco:** Nenhuma senha trafega em texto puro dentro de URLs RTSP ou ONVIF salvas no banco de dados.

---

## 2. Proteção contra SSRF e DNS Rebinding

Ataques de **SSRF (Server-Side Request Forgery)** ocorrem quando uma aplicação aceita endereços de rede fornecidos pelo usuário e efetua requisições HTTP/TCP em nome do atacante para alvos internos restritos ou serviços em nuvem.

O validador de rede do VideoCMS ([`internal/network/ssrf.go`](file:///storage/www/projetos/videocms/gemini/internal/network/ssrf.go)) implementa defesas ativas:

1. **Allowlist Estrita de Sub-redes (`CMS_ALLOWED_NETWORKS`):**
   Por padrão, conexões são permitidas exclusivamente para blocos de rede privada (RFC 1918) e loopback:
   - `10.0.0.0/8`
   - `172.16.0.0/12`
   - `192.168.0.0/16`
   - `127.0.0.0/8`
2. **Bloqueio de Metadados em Nuvem:**
   Endereços de metadados de provedores cloud (`169.254.169.254` e blocos *link-local*) são categoricamente bloqueados.
3. **Proteção contra DNS Rebinding:**
   O `SafeDialer` customizado resolve o endereço DNS antes da conexão e valida todos os IPs retornados. A conexão é aberta diretamente para o IP validado, eliminando a janela de vulnerabilidade de DNS Rebinding.
4. **Verificação de Redirecionamentos HTTP:**
   O cliente HTTP seguro (`NewSafeHTTPClient`) intercepta respostas HTTP 3xx e revalida o host de destino contra a allowlist antes de seguir qualquer redirecionamento.

---

## 3. Sanitização Rigorosa de Logs (Redaction)

Erros de conexão ou logs de depuração frequentemente vazam credenciais inseridas na URI ou cabeçalhos.
O módulo [`internal/security/redactor.go`](file:///storage/www/projetos/videocms/gemini/internal/security/redactor.go) intercepta e sanitiza:

- **URLs RTSP/HTTP:** `rtsp://admin:P@ssw0rd@192.168.1.100:554/cam` $\longrightarrow$ `rtsp://192.168.1.100:554/cam`
- **Cabeçalhos de Autenticação:** `Authorization: Basic ...` $\longrightarrow$ `Authorization: Basic [REDACTED]`
- **Campos JSON:** `"password": "..."` $\longrightarrow$ `"password": "[REDACTED]"`

---

## 4. Isolamento em Container (Docker Non-Root)

O container Docker do VideoCMS é construído sem privilégios de administrador:

- **Usuário Dedicado:** Executa como usuário não-root `cms` (`UID: 10001`, `GID: 10001`).
- **Sem Privilégios Elevados:** Não requer `sudo`, não necessita de `privileged: true` e não requer capabilities Linux especiais (`CAP_SYS_ADMIN`, etc.).
- **Permissões Mínimas no Filesystem:** Apenas o diretório de dados `/app/data` possui permissão de escrita.

---

## 5. Recomendações para Exposição Remota

O VideoCMS foi desenvolvido prioritariamente para **operação em rede local (LAN)**.

> ⚠️ **IMPORTANTE:** Nunca exponha a porta `15000` diretamente para a Internet pública sem proteção.

Caso seja necessário acessar o monitoramento fora da rede local:

1. **Opção 1: VPN (Recomendado)**
   - Utilize uma VPN corporativa segura (WireGuard, OpenVPN, Tailscale) para conectar o dispositivo remoto à LAN antes de abrir o VideoCMS.
2. **Opção 2: Reverse Proxy com TLS e Autenticação**
   - Utilize um proxy reverso (Nginx, Caddy, Traefik) à frente do VideoCMS com:
     - Certificado SSL/TLS válido (HTTPS);
     - Autenticação prévia (OAuth2, OIDC, HTTP Basic com HTTPS ou Cloudflare Zero Trust / Authelia);
     - Rate limiting ativo.
