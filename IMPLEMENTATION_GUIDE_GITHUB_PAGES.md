# Guia de Implementação para GitHub Pages

Este guia detalha como configurar o projeto `semaforo-ponte` para ser alojado no GitHub Pages, superando as limitações de processamento em segundo plano e persistência de dados através do uso de **GitHub Actions**.

## 1. Conceito da Solução

O GitHub Pages é ideal para sites estáticos. Para adicionar a funcionalidade de monitorização e histórico, utilizaremos a seguinte abordagem:

-   **Frontend (React)**: Será alojado no GitHub Pages como um site estático. Irá ler o histórico da ponte de um ficheiro JSON (`historico_ponte.json`) que estará no próprio repositório.
-   **Monitorização e Persistência de Dados**: Um **GitHub Action** será configurado para executar um script Node.js (`monitor_action.js`) periodicamente (ex: a cada 5 minutos). Este script irá:
    1.  Verificar o estado atual da ponte.
    2.  Atualizar o ficheiro `historico_ponte.json` no repositório com o novo estado.
    3.  Fazer `commit` e `push` das alterações para o repositório.
    4.  Enviar notificações WhatsApp, se configurado.

Esta abordagem garante que o histórico é persistente e que o frontend no GitHub Pages tem sempre acesso aos dados mais recentes.

## 2. Configuração do Repositório GitHub

### 2.1. Criar um Repositório (se ainda não o fez)

Certifique-se de que o seu projeto está num repositório GitHub. Se for um novo repositório, clone-o localmente e copie os ficheiros do projeto para lá.

### 2.2. Ativar GitHub Pages

1.  No seu repositório GitHub, vá para **Settings**.
2.  Na barra lateral esquerda, clique em **Pages**.
3.  Em "Build and deployment", selecione **Deploy from a branch**.
4.  Em "Branch", escolha a branch onde o seu código compilado será publicado (geralmente `gh-pages` ou `main` / `master` com uma pasta `docs`). Para projetos React com Vite, a pasta de build padrão é `dist`. Pode configurar o GitHub Pages para servir a pasta `dist` da sua branch `main`.

### 2.3. Configurar Segredos do Repositório

Para as notificações WhatsApp, precisará de configurar os seus segredos no GitHub:

1.  No seu repositório GitHub, vá para **Settings**.
2.  Na barra lateral esquerda, clique em **Secrets and variables** -> **Actions**.
3.  Clique em **New repository secret** e adicione:
    -   `WHATSAPP_PHONE`: O seu número de telefone WhatsApp com código do país (ex: `351912345678`).
    -   `WHATSAPP_API_KEY`: A sua API Key do CallMeBot.

## 3. Ficheiros do Projeto

Os seguintes ficheiros foram preparados para esta solução:

-   **`monitor_action.js`**: Este é o script Node.js que será executado pelo GitHub Action. Ele verifica o estado da ponte, atualiza `historico_ponte.json` e faz o `commit` e `push` para o repositório.
-   **`.github/workflows/monitor.yml`**: Define o workflow do GitHub Actions que executa `monitor_action.js` periodicamente.
-   **`src/App.tsx`**: O frontend React atualizado para ler os dados do `historico_ponte.json` diretamente do caminho relativo do site.
-   **`package.json`**: Atualizado com as dependências necessárias (`dotenv`, `node-fetch`).

## 4. Passos de Implementação

### 4.1. Copiar Ficheiros para o seu Repositório

1.  Crie a pasta `.github/workflows` na raiz do seu repositório, se ainda não existir.
2.  Copie o ficheiro `monitor.yml` para dentro de `.github/workflows/`.
3.  Copie o ficheiro `monitor_action.js` para a raiz do seu repositório.
4.  Substitua o seu `src/App.tsx` pelo ficheiro fornecido.
5.  Substitua o seu `package.json` pelo ficheiro fornecido.

### 4.2. Instalar Dependências

No diretório raiz do seu projeto local, instale as dependências:

```bash
npm install
```

### 4.3. Inicializar o Ficheiro de Histórico

Crie um ficheiro vazio chamado `historico_ponte.json` na raiz do seu repositório. O GitHub Action irá preenchê-lo na primeira execução.

```bash
touch historico_ponte.json
```

### 4.4. Primeiro Commit e Push

Faça o `commit` de todos os novos ficheiros e alterações para o seu repositório GitHub:

```bash
git add .
git commit -m "feat: Implementar monitorização com GitHub Actions para GitHub Pages"
git push origin main # ou a sua branch principal
```

### 4.5. Configurar o Build do Frontend

Para que o GitHub Pages sirva a sua aplicação React, precisa de garantir que a build é feita corretamente. O Vite, por padrão, gera os ficheiros estáticos na pasta `dist`.

Se o seu repositório for `username/repo-name`, o GitHub Pages será servido em `https://username.github.io/repo-name/`. Para que o Vite gere os caminhos corretos, pode ser necessário configurar a `base` no `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/semaforo-ponte/', // Substitua 'semaforo-ponte' pelo nome do seu repositório
})
```

Após esta alteração, faça uma nova build e `commit`:

```bash
npm run build
git add .
git commit -m "feat: Configurar base do Vite para GitHub Pages"
git push origin main
```

### 4.6. Monitorizar o GitHub Action

1.  No seu repositório GitHub, vá para a aba **Actions**.
2.  Verá o workflow "Monitor Bridge Status" a ser executado periodicamente (a cada 5 minutos, ou pode acioná-lo manualmente via "Run workflow").
3.  Verifique os logs para garantir que o script está a funcionar corretamente e a atualizar o `historico_ponte.json`.

## 5. Aceder à Aplicação

Após a primeira execução bem-sucedida do GitHub Action e a publicação do seu site no GitHub Pages, poderá aceder à sua aplicação em `https://[SEU_USERNAME].github.io/[NOME_DO_REPOSITORIO]/`.

## 6. Considerações Finais

-   **Frequência de Monitorização**: O `cron` no GitHub Actions pode ser ajustado. Tenha em mente que GitHub Actions têm limites de uso gratuitos.
-   **Segurança**: Mantenha os seus segredos do WhatsApp seguros no GitHub Secrets.
-   **Cache**: O frontend foi ajustado para adicionar um timestamp à requisição do `historico_ponte.json` para evitar problemas de cache do navegador, garantindo que os dados mais recentes são sempre carregados.

Esta solução oferece uma forma eficaz de ter a sua aplicação de monitorização da ponte a funcionar no GitHub Pages com persistência de dados e notificações, aproveitando a infraestrutura gratuita do GitHub.
