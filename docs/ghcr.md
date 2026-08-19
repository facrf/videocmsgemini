# Guia de Publicação no GitHub Container Registry (GHCR)

Este documento fornece instruções para configurar o repositório remoto no GitHub, acionar a pipeline automatizada de CI/CD e publicar imagens de container no **GitHub Container Registry (`ghcr.io`)**.

---

## 1. Repositório Oficial

- **GitHub Repository:** [`https://github.com/facrf/videocmsgemini`](https://github.com/facrf/videocmsgemini)
- **Container Registry:** `ghcr.io/facrf/videocmsgemini`
- **Tags Disponíveis:**
  - `ghcr.io/facrf/videocmsgemini:0.1.0` (Release SemVer fixa)
  - `ghcr.io/facrf/videocmsgemini:latest` (Última release estável)
  - `ghcr.io/facrf/videocmsgemini:main` (Build contínuo da branch principal)

---

## 2. Como Funciona a Pipeline do GitHub Actions

O arquivo [`.github/workflows/docker-publish.yml`](../.github/workflows/docker-publish.yml) já está configurado na raiz do repositório:

```mermaid
flowchart TD
    PushMain["Push em main / Pull Request"] --> TestJob["1. Job de Testes & Linter\n(go vet, go test -race, tsc, vite build)"]
    PushTag["Push de Tag (ex: v0.1.0)"] --> TestJob
    
    TestJob -->|Sucesso| BuildxJob["2. Build Multi-Arch com Buildx\n(linux/amd64 e linux/arm64)"]
    BuildxJob --> Meta["3. Extração de Metadata & Tags SemVer\n(0.1.0, 0.1, 0, latest)"]
    Meta --> SecScan["4. Vulnerability Scan com Trivy\n(Análise de Segurança de SO e Deps)"]
    SecScan --> PushGHCR["5. Publicação no GHCR\n(ghcr.io/facrf/videocmsgemini:0.1.0)"]
```

### Regras de Disparo:
- **Pushes na branch `main`:** Validam os testes e geram a imagem com a tag `:main` (não gera `:latest` automaticamente para evitar releases acidentais).
- **Pull Requests:** Validam testes e compilação do Dockerfile sem publicar imagens no registry.
- **Tags de Release (`v*`):** Executam a suíte completa, constroem a imagem multi-plataforma e publicam as tags semânticas e `:latest`.

---

## 3. Publicando uma Nova Release

Para criar e publicar uma nova versão (ex: `0.1.0`):

```bash
# 1. Criar a tag anotada do Git
git tag v0.1.0

# 2. Enviar a tag para o GitHub
git push origin v0.1.0
```

### Onde Acompanhar:
1. **GitHub Actions:** Acesse a aba **Actions** em [`https://github.com/facrf/videocmsgemini/actions`](https://github.com/facrf/videocmsgemini/actions) para acompanhar a execução dos testes e do build multi-plataforma.
2. **GitHub Packages:** Ao término da pipeline, a imagem estará listada na aba **Packages** em [`https://github.com/facrf/videocmsgemini/pkgs/container/videocmsgemini`](https://github.com/facrf/videocmsgemini/pkgs/container/videocmsgemini).

---

## 4. Configurando a Visibilidade do Package

Por padrão, packages publicados no GHCR podem iniciar como **Private**. Para permitir que o Portainer ou outros servidores baixem a imagem:

1. No GitHub, acesse [`https://github.com/facrf/videocmsgemini/pkgs/container/videocmsgemini`](https://github.com/facrf/videocmsgemini/pkgs/container/videocmsgemini).
2. Clique em **Package settings** (no menu lateral direito).
3. Role até a seção **Danger Zone** $\rightarrow$ **Change visibility**.
4. Selecione **Public** (se desejar distribuição livre) ou mantenha **Private** (se for para uso corporativo interno).

---

## 5. Utilizando a Imagem do GHCR no Portainer

### Cenário A: Imagem Pública
No Portainer (ou arquivo `portainer-stack.yml`), basta referenciar a imagem diretamente:

```yaml
services:
  cms:
    image: ghcr.io/facrf/videocmsgemini:0.1.0
    container_name: videocms
    # ... demais configurações ...
```

### Cenário B: Imagem Privada
Se o package for mantido como privado:
1. No Portainer, acesse **Registries** $\rightarrow$ **+ Add registry**.
2. Selecione **Custom registry**:
   - **Name:** `GitHub Container Registry`
   - **Registry URL:** `ghcr.io`
   - **Authentication:** Ative e informe seu usuário do GitHub e um **Personal Access Token (PAT)** com permissão `read:packages`.
3. Na Stack do Portainer, aponte para `ghcr.io/facrf/videocmsgemini:0.1.0`.
