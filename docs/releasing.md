# Guia de Releases e Versionamento Semântico

Este documento estabelece o processo padronizado para controle de versões, geração de releases oficiais e publicação de novas imagens do **VideoCMS**.

---

## 1. Versionamento Semântico (SemVer)

O projeto adota o padrão [Semantic Versioning 2.0.0](https://semver.org/lang/pt-BR/):

$$\text{v}\mathbf{MAJOR}.\mathbf{MINOR}.\mathbf{PATCH}$$

- **MAJOR (ex: 1.0.0):** Modificações incompatíveis na API REST, quebras de compatibilidade no schema do banco de dados ou reestruturações fundamentais de arquitetura.
- **MINOR (ex: 0.2.0):** Adição de novas funcionalidades retrocompatíveis (novos adaptadores de câmeras, novos layouts de mosaico, novos endpoints).
- **PATCH (ex: 0.1.1):** Correções de bugs, ajustes de estabilidade e patches de segurança que não alteram a assinatura das APIs.

Durante a fase inicial de desenvolvimento, versões da série `0.x.y` refletem a evolução contínua da plataforma.

---

## 2. Checklist Pré-Release

Antes de criar qualquer tag de release oficial, verifique cada um dos itens abaixo:

- [ ] **Working Tree Limpa:** Todas as alterações pretendidas foram devidamente revisadas (`git status` limpo).
- [ ] **Linter e Formatação:** `make lint` executado com sucesso (sem avisos no `go vet` ou `tsc --noEmit`).
- [ ] **Testes com Race Detector:** `make test` (`go test -v -race ./...`) executado com 100% de aprovação.
- [ ] **Compilação do Frontend:** Build do React em `web/dist` gerado sem erros (`make frontend`).
- [ ] **Compilação do Backend:** Binário `./bin/cms` gerado com sucesso (`make backend`).
- [ ] **Build da Imagem Docker:** Imagem construída com sucesso localmente (`make docker-build`).
- [ ] **Migrações de Banco de Dados:** Novos arquivos em `migrations/` testados e sem instruções destrutivas que impeçam a inicialização.
- [ ] **Ausência de Segredos:** Nenhuma senha, token ou chave privada inserida em arquivos do repositório.
- [ ] **CHANGELOG Atualizado:** Arquivo [`CHANGELOG.md`](../CHANGELOG.md) atualizado com a lista de itens sob a versão a ser lançada.
- [ ] **Documentação Sincronizada:** Manuais em `docs/` e `README.md` refletindo os novos recursos.

---

## 3. Passo a Passo para Lançamento de Release

```bash
# 1. Certifique-se de estar no branch main atualizado
git checkout main
git pull origin main

# 2. Crie a tag anotada do Git com a versão desejada
git tag -a v0.1.0 -m "Release v0.1.0 - Suporte inicial a CCTV, ONVIF e Portainer"

# 3. Envie a tag para o repositório remoto no GitHub
git push origin v0.1.0
```

---

## 4. Pós-Lançamento e Validação

Após o envio da tag:

1. **Acompanhar GitHub Actions:** Verifique a conclusão bem-sucedida do workflow `.github/workflows/docker-publish.yml`.
2. **Verificar Imagem no GHCR:** Confirme a publicação das tags semânticas no GitHub Packages:
   - `ghcr.io/facrf/videocmsgemini:0.1.0`
   - `ghcr.io/facrf/videocmsgemini:0.1`
   - `ghcr.io/facrf/videocmsgemini:0`
   - `ghcr.io/facrf/videocmsgemini:latest`
3. **Validar no Portainer:** Atualize uma instância de homologação do Portainer apontando para a nova tag e confirme o status `healthy`.

---

## 5. Procedimento de Rollback

Caso uma release recém-lançada apresente um comportamento inesperado em produção:

1. **Reversão no Portainer / Docker:** Altere a tag da Stack imediatamente para a versão estável anterior (ex: `0.2.0` $\rightarrow$ `0.1.0`).
2. **Avaliação do Schema:** Verifique se novas migrações foram aplicadas. Como o VideoCMS aplica migrações aditivas (sem deleção destrutiva de tabelas existentes), a versão anterior continuará operando normalmente.
3. **Publicação de Patch (Hotfix):** Desenvolva a correção necessária e publique uma nova versão PATCH (ex: `0.2.1`).
