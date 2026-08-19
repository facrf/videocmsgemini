# AGENTS.md - Regras e Diretrizes para Agentes e Desenvolvedores

Este documento estabelece as regras obrigatórias de operação para qualquer agente de IA, desenvolvedor ou automação que atue neste repositório.

---

## 1. Scope (Escopo e Limites de Atuação)

* **Escopo Estritamente Local:** Todo o trabalho deve permanecer exclusivamente dentro desta pasta raiz (`PROJECT_ROOT`) e suas subpastas.
* **Proibição de Acesso Externo:** Nunca criar, editar, excluir ou mover arquivos fora do projeto. Não acesse ou altere diretórios do sistema como `/etc`, `/usr`, `/opt`, `/var`, `/tmp` ou `$HOME` (fora da pasta do projeto).
* **Sem Permissões Elevadas:** **NUNCA** execute `sudo` ou qualquer comando com privilégios administrativos.
* **Sem Alterações Globais:** Nunca instale pacotes ou dependências globalmente nem modifique configurações do sistema operacional.
* **Preservação de Dados:** Não sobrescreva nem apague arquivos existentes sem antes inspecioná-los cuidadosamente. Não descarte código existente apenas para simplificar uma implementação.
* **Isolamento de Repositórios:** Nunca inicialize, modifique ou opere outros repositórios Git externos.
* **Proibição de Comandos Destrutivos:** Nunca execute comandos destrutivos fora da pasta do projeto.
* **Não fazer Git Commit/Push automático:** Commits e pushes devem ser solicitados ou revisados pelo usuário.
* **Proibição de Navegação Ascendente:** Não utilize `cd ..` para operar em diretórios pais.
* **Dependências Locais:** Todas as dependências, caches locais e binários auxiliares específicos do projeto devem residir dentro de `PROJECT_ROOT`.

---

## 2. Segurança

* **Sem Credenciais no Código:** Nunca colocar senhas, chaves, tokens, credenciais reais ou dados sensíveis de câmeras no Git ou código-fonte.
* **Sanitização de Logs:** Nunca escrever passwords, tokens, chaves secretas ou cabeçalhos Authorization em logs ou mensagens de erro.
* **Criptografia em Repouso:** Senhas de câmeras devem ser criptografadas em repouso com chave externa (`CMS_SECRET_KEY`).
* **URLs Sanitizadas:** Nunca persistir senhas em texto puro dentro de URLs RTSP salvas no banco. Armazenar credenciais e caminhos separadamente.
* **Sem Ataques ou Exploits:** Nunca fazer brute force de senhas em câmeras. Nunca explorar vulnerabilidades ou utilizar payloads de teste.
* **Varredura Restrita:** Nunca escanear automaticamente a Internet ou redes públicas. O scanner deve operar exclusivamente em redes privadas autorizadas (RFC 1918) ou CIDRs explicitamente fornecidos pelo administrador.
* **Proteção contra SSRF:** Todos os endpoints e IPs fornecidos por usuários devem ser validados contra a política de redes permitidas antes de conexões de rede de saída serem abertas.

---

## 3. Qualidade e Arquitetura

* **Preservação e Simplicidade:** Preservar arquivos existentes, evitar alterações desnecessariamente grandes e preferir código simples e idiomático.
* **Organização Modular:** Manter separação clara de responsabilidades entre backend (`cmd/`, `internal/`), banco de dados (`migrations/`), frontend (`web/`) e documentação (`docs/`).
* **Tratamento Contextual de Erros:** Todos os erros devem ser tratados contextualmente (sem `panic` em fluxo normal). Utilizar logs estruturados sem vazar dados sensíveis.
* **Ciclo de Vida e Recursos:** Goroutines de longa duração devem respeitar `context.Context` e cancelamento gracioso. Canais devem ser limitados para evitar vazamento de memória.
* **Documentação Contínua:** Ao alterar a arquitetura, protocolos ou endpoints, atualizar a documentação técnica correspondente (`README.md`, `docs/architecture.md`, `docs/protocols.md`).

---

## 4. Definition of Done (Critérios de Conclusão)

Uma tarefa ou funcionalidade só é considerada concluída quando:

- [ ] O código **compila** sem erros no backend e no frontend;
- [ ] Os **testes unitários e de integração relevantes passam** com sucesso;
- [ ] As validações de **linter e formatação** passam;
- [ ] **Não há credenciais ou segredos hardcoded** no código ou nos arquivos comitáveis;
- [ ] Todos os **erros são tratados** com contexto e sem panics indevidos;
- [ ] A **documentação** (`README.md`, `docs/`) foi devidamente atualizada para refletir as alterações;
- [ ] O desenvolvedor/agente conferiu a saída de `git diff` para garantir que apenas as alterações pretendidas foram feitas;
- [ ] **Nenhum arquivo fora de `PROJECT_ROOT` foi criado ou modificado**.
