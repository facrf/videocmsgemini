# Guia de Resolução de Problemas (Troubleshooting)

Este documento reúne diagnósticos e soluções para os cenários mais comuns de falha em conexões, descoberta de dispositivos e streaming no **VideoCMS**.

---

## 1. Interpretando o Diagnóstico em 10 Etapas

O modal de diagnóstico técnico (`GET /api/cameras/:id/diagnostics`) executa 10 testes sequenciais sobre a câmera:

| Etapa | Significado | O que fazer em caso de falha |
| :--- | :--- | :--- |
| **1. Resolução DNS / IP** | Validação de sintaxe e resolução de nome | Verifique se o endereço IP está correto e não contém caracteres inválidos. |
| **2. Política SSRF** | Validação contra a allowlist de redes | Confirme se o IP pertence às faixas configuradas em `CMS_ALLOWED_NETWORKS`. |
| **3. Conectividade TCP (Porta HTTP)** | Abertura de socket TCP na porta 80/8080 | Verifique se a câmera está ligada e o cabo de rede conectado. |
| **4. Conectividade TCP (Porta RTSP)** | Abertura de socket TCP na porta 554/8554 | Confirme se o serviço RTSP está habilitado na configuração web da câmera. |
| **5. Banner / Resposta HTTP** | Leitura de cabeçalhos de resposta HTTP | Verifique se o serviço web da câmera não travou ou necessita de reboot. |
| **6. Autenticação ONVIF** | Troca de credenciais via WS-Security | Verifique usuário e senha no modal de edição da câmera. |
| **7. Device Information ONVIF** | Leitura de modelo, fabricante e firmware | A câmera pode ter ONVIF desabilitado ou versão incompatível. |
| **8. Descoberta de Perfis de Vídeo** | Leitura das URIs de mainstream e substream | Verifique se os fluxos de vídeo estão configurados e ativos no dispositivo. |
| **9. Captura de Snapshot** | Requisição de imagem instantânea JPEG | Verifique se o endpoint de snapshot HTTP está ativo. |
| **10. Conexão do Stream de Vídeo** | Validação do fluxo de vídeo contínuo | Verifique se há saturação de banda ou perda de pacotes entre o servidor e a câmera. |

---

## 2. Problemas Frequentes e Soluções

### 2.1 Câmera é Descoberta mas Falha na Autenticação (Auth Required)
- **Causa:** Câmeras Intelbras, Dahua ou Hikvision frequentemente exigem a criação de um **usuário específico para ONVIF** com privilégios de administrador nas configurações web da câmera, que pode ser diferente do usuário web principal.
- **Solução:** Acesse a interface web da câmera, navegue em *Configurações > Sistema > Segurança > ONVIF* (ou *Acesso à Plataforma*) e certifique-se de que o usuário ONVIF está criado e habilitado.

### 2.2 Descoberta Automática (WS-Discovery) não Localiza Câmeras
- **Causa 1 (Docker em Bridge):** Conforme detalhado em [`docs/deployment.md`](file:///storage/www/projetos/videocms/gemini/docs/deployment.md), pacotes multicast UDP não atravessam a bridge padrão do Docker.
  - **Solução:** No Linux, habilite `network_mode: host` no `docker-compose.yml`. No macOS/Windows, execute a varredura informando a sub-rede CIDR (ex: `192.168.1.0/24`).
- **Causa 2 (Câmeras em VLANs Diferentes):** Roteadores corporativos bloqueiam pacotes multicast entre VLANs.
  - **Solução:** Utilize a varredura por CIDR apontando para a faixa da VLAN das câmeras.

### 2.3 Mosaico Exibe Caixa com Alerta de "Offline"
- **Causa:** A câmera perdeu conexão TCP ou a sessão de streaming foi interrompida.
- **Comportamento:** O VideoCMS ativará o **backoff exponencial** de reconexão automática e exibirá o quadro de aviso com o identificador da câmera.
- **Ação:** O stream se restabelecerá automaticamente assim que a câmera responder novamente na rede. Você também pode clicar no botão **Recarregar Streams** no cabeçalho do mosaico.

### 2.4 Erro de SQLite "Database is Locked"
- **Causa:** Concorrência excessiva em sistemas com disco lento ou ausência de modo WAL.
- **Solução:** O VideoCMS configura automaticamente `PRAGMA journal_mode=WAL;` e `PRAGMA busy_timeout=5000;`. Certifique-se de que o diretório de dados está em um disco local com permissões adequadas de leitura e escrita.
