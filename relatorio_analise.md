# Relatório de Análise e Propostas de Melhoria para o Projeto 'semaforo-ponte'

**Autor:** Manus AI
**Data:** 22 de Fevereiro de 2026

## 1. Introdução

Este relatório apresenta uma análise detalhada do repositório `antoniomadureira/semaforo-ponte`, com o objetivo de identificar a arquitetura do projeto, o método de armazenamento de dados e propor melhorias para a sua estrutura e funcionalidade. O projeto consiste numa aplicação web que monitoriza o estado da ponte móvel de Leixões, apresentando um semáforo visual e um histórico de eventos.

## 2. Análise da Arquitetura e Código-Fonte

A aplicação é construída com **React, TypeScript e Vite**, uma combinação moderna para o desenvolvimento de interfaces web. A estilização é feita com **TailwindCSS**. A análise do código revelou dois componentes principais: um frontend em React e um script de monitorização em Node.js.

### 2.1. Frontend (Aplicação React)

O componente principal da aplicação é o `src/App.tsx`. Este ficheiro é responsável por:

- **Monitorização em tempo real:** A cada 15 segundos, a aplicação contacta a página da APDL (`https://siga.apdl.pt/AberturaPonteMovel/`) para obter o estado atual da ponte. Para contornar as restrições de CORS (Cross-Origin Resource Sharing) do navegador, a aplicação utiliza serviços de proxy como `api.allorigins.win`, `corsproxy.io` e `api.codetabs.com`.
- **Interface do utilizador:** Apresenta um semáforo visual (verde, amarelo, vermelho) que reflete o estado da ponte e um painel com o histórico de eventos.
- **Armazenamento de dados (local):** O histórico de alterações de estado da ponte é guardado no `localStorage` do navegador do utilizador, sob a chave `historico_ponte_local`. Isto significa que os dados são persistidos apenas no dispositivo do utilizador.
- **Notificações:** A aplicação pode enviar notificações por WhatsApp através da API `api.callmebot.com` sempre que o estado da ponte muda para 'ABERTA' or 'PREPARAÇÃO'. As credenciais para esta API são carregadas a partir de variáveis de ambiente (`VITE_WHATSAPP_PHONE` e `VITE_WHATSAPP_API_KEY`).

### 2.2. Script de Monitorização (Node.js)

O ficheiro `monitor_ponte.js` é um script Node.js que parece ter sido concebido para ser executado num ambiente de servidor. A sua funcionalidade é semelhante à do frontend:

- **Monitorização:** Verifica o estado da ponte a partir da mesma fonte de dados (APDL).
- **Armazenamento de dados (servidor):** Regista as alterações de estado num ficheiro CSV chamado `historico_ponte.csv`. Este ficheiro é criado e atualizado no servidor onde o script é executado.
- **Notificações:** Também envia notificações por WhatsApp, utilizando as mesmas credenciais de API.

É importante notar que, no estado atual do repositório, este script não está a ser utilizado pela aplicação React nem parece estar configurado para ser executado de forma contínua.

## 3. Armazenamento de Dados

A questão central desta análise é determinar onde os dados recolhidos são alojados. A resposta depende do componente da aplicação que está a ser considerado:

- **Aplicação Frontend (React):** Os dados são armazenados **localmente, no navegador do utilizador**, através do `localStorage`. Isto significa que cada utilizador tem o seu próprio histórico, e não há uma base de dados centralizada.
- **Script de Monitorização (Node.js):** Os dados são armazenados num **ficheiro CSV (`historico_ponte.csv`) no servidor** onde o script é executado. No entanto, como mencionado, este script não parece estar ativo no projeto tal como está configurado.

Em suma, a versão da aplicação que é implementada e acedida pelos utilizadores **não possui um armazenamento de dados centralizado**. O histórico é local e volátil (pode ser apagado pelo utilizador).

## 4. Propostas de Melhoria

Com base na análise efetuada, são propostas as seguintes melhorias para o projeto:

### 4.1. Centralização do Armazenamento de Dados

A melhoria mais significativa seria a implementação de uma base de dados centralizada para armazenar o histórico de eventos da ponte. Isto traria várias vantagens:

- **Consistência dos dados:** Todos os utilizadores teriam acesso ao mesmo histórico completo.
- **Persistência dos dados:** O histórico não seria perdido se o utilizador limpasse os dados do seu navegador.
- **Análise de dados:** Com uma base de dados, seria possível realizar análises mais complexas sobre o funcionamento da ponte (e.g., tempos médios de abertura, frequência, etc.).

**Sugestão de implementação:**

- **Backend:** Desenvolver um pequeno backend (e.g., com Node.js e Express) que seria responsável por monitorizar a ponte e guardar os dados numa base de dados.
- **Base de dados:** Utilizar uma solução de base de dados simples e de baixo custo, como **Supabase** (PostgreSQL), **Firebase Realtime Database** ou **MongoDB Atlas** (na sua versão gratuita).
- **API:** O backend exporia uma API REST para o frontend consultar o histórico de eventos.

### 4.2. Refatoração do Código e Unificação da Lógica

Atualmente, a lógica de monitorização está duplicada no frontend e no script `monitor_ponte.js`. Com a criação de um backend, esta lógica seria centralizada, simplificando o código do frontend.

**Sugestão de implementação:**

- O frontend passaria a ser um cliente 'puro', responsável apenas por apresentar os dados obtidos a partir da API do backend.
- O script `monitor_ponte.js` seria a base para o serviço de backend, que seria executado de forma contínua (e.g., com um gestor de processos como o PM2 ou num serviço de 'serverless functions').

### 4.3. Melhoria da Documentação

O ficheiro `README.md` atual é o template padrão do Vite. Seria muito benéfico para o projeto ter uma documentação que explique:

- O objetivo do projeto.
- Como configurar e executar a aplicação localmente (incluindo as variáveis de ambiente necessárias).
- A arquitetura da aplicação.

### 4.4. Gestão de Dependências e Segurança

O ficheiro `package-lock.json` está presente no repositório, o que é uma boa prática para garantir a consistência das dependências. No entanto, seria recomendável:

- **Auditoria de dependências:** Executar regularmente `npm audit` para identificar e corrigir vulnerabilidades nas dependências.
- **Variáveis de ambiente:** Garantir que as chaves de API e outros dados sensíveis nunca são expostos no código-fonte, utilizando sempre variáveis de ambiente (o que já está a ser feito corretamente).

## 5. Conclusão

O projeto 'semaforo-ponte' é uma ferramenta útil e com uma interface bem concebida. A sua principal limitação é a ausência de um armazenamento de dados centralizado, o que impede a criação de um histórico persistente e partilhado. A implementação de um backend com uma base de dados resolveria esta questão e abriria portas para novas funcionalidades e análises de dados. A refatoração do código para eliminar a duplicação de lógica e a melhoria da documentação são também passos importantes para a evolução e manutenção do projeto.
