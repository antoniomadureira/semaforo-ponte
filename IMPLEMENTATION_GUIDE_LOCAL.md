# Guia de Implementação das Melhorias para o Projeto 'semaforo-ponte' (Alternativas Locais)

Este guia detalha os passos necessários para implementar as melhorias sugeridas no projeto `semaforo-ponte`, focando em soluções de armazenamento de dados locais, sem a necessidade de um serviço externo como o Supabase. Serão apresentadas duas opções: **SQLite** (base de dados em ficheiro) e **Ficheiro JSON** (armazenamento simples em ficheiro).

## 1. Escolha da Solução de Armazenamento Local

Ambas as opções abaixo centralizam o histórico da ponte num servidor local, mas com diferentes características:

| Característica        | SQLite (`server_monitor_sqlite.js`)                               | Ficheiro JSON (`server_monitor_json.js`)                               |
| :-------------------- | :---------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **Tipo de Armazenamento** | Base de dados relacional em ficheiro (`.db`)                      | Ficheiro de texto simples (`.json`)                                    |
| **Complexidade**      | Moderada (requer `better-sqlite3`)                                | Baixa (usa módulos `fs` e `JSON` nativos)                              |
| **Performance**       | Boa para grandes volumes de dados e queries complexas             | Suficiente para volumes pequenos a médios de dados                     |
| **Integridade dos Dados** | Alta (esquema definido, transações)                               | Depende da implementação (sem validação de esquema inerente)           |
| **Uso Recomendado**   | Quando se prevê um histórico extenso ou futuras funcionalidades de pesquisa/filtragem mais avançadas. | Para um histórico simples e direto, com menor sobrecarga de configuração. |

Escolha a opção que melhor se adapta às suas necessidades.

## 2. Configuração das Variáveis de Ambiente (`.env`)

Crie um ficheiro `.env` na raiz do seu projeto (`/home/ubuntu/semaforo-ponte/.env`) com as seguintes variáveis. **Apenas as variáveis da solução escolhida são necessárias.**

```dotenv
# Credenciais para Notificações WhatsApp (CallMeBot)
WHATSAPP_PHONE="[O SEU NÚMERO DE TELEFONE WHATSAPP COM CÓDIGO DO PAÍS, ex: 351912345678]"
WHATSAPP_API_KEY="[A SUA API KEY DO CALLMEBOT]"

# Porta para o servidor de monitorização (opcional, padrão é 3000)
PORT=3000

# --- APENAS PARA SQLite ---
# Nome do ficheiro da base de dados SQLite (opcional, padrão é historico_ponte.db)
DB_FILE="historico_ponte.db"

# --- APENAS PARA FICHEIRO JSON ---
# Nome do ficheiro JSON para o histórico (opcional, padrão é historico_ponte.json)
JSON_FILE="historico_ponte.json"
```

**Importante:** Nunca exponha estas chaves publicamente. O ficheiro `.env` deve ser adicionado ao `.gitignore`.

## 3. Instalação de Dependências

No diretório raiz do projeto, instale as dependências necessárias. O `package.json` já foi atualizado para incluir `better-sqlite3` (para a opção SQLite), `dotenv`, `express` e `node-fetch`.

```bash
cd /home/ubuntu/semaforo-ponte
npm install
```

## 4. Executar o Servidor de Monitorização

Escolha o script correspondente à sua solução de armazenamento:

### Opção 1: SQLite

Para iniciar o servidor de monitorização com SQLite:

```bash
node server_monitor_sqlite.js
```

Este comando criará (se não existir) um ficheiro `historico_ponte.db` no diretório raiz do projeto e começará a registar os eventos da ponte.

### Opção 2: Ficheiro JSON

Para iniciar o servidor de monitorização com Ficheiro JSON:

```bash
node server_monitor_json.js
```

Este comando criará (se não existir) um ficheiro `historico_ponte.json` no diretório raiz do projeto e começará a registar os eventos da ponte.

Para manter o servidor a correr em produção, considere usar ferramentas como `pm2` ou implementá-lo como um serviço numa plataforma de hospedagem.

## 5. Atualização do Frontend (Aplicação React)

O ficheiro `src/App.tsx` foi atualizado para:

-   Remover a lógica de scraping direto da APDL.
-   Remover a lógica de armazenamento local (`localStorage`).
-   Consumir o histórico de eventos através da nova API `/api/historico` exposta pelo servidor de monitorização (seja ele SQLite ou JSON).

### 5.1. Executar a Aplicação Frontend

No diretório raiz do projeto, inicie a aplicação React:

```bash
npm run dev
```

Certifique-se de que o servidor de monitorização (passo 4) está a correr antes de iniciar o frontend, para que a API `/api/historico` esteja disponível.

## 6. Melhoria da Documentação do Projeto (`README.md`)

É altamente recomendável atualizar o `README.md` do projeto para refletir estas mudanças, incluindo:

-   Uma descrição clara do projeto e do seu objetivo.
-   Instruções detalhadas sobre como configurar e executar o frontend e o backend.
-   Explicação da arquitetura atualizada (frontend, backend local).
-   Como configurar as variáveis de ambiente.

## 7. Próximos Passos e Considerações

-   **Persistência:** O ficheiro `.db` (SQLite) ou `.json` deve ser persistido se a aplicação for reiniciada ou movida.
-   **Segurança:** Garanta que as suas chaves de API do CallMeBot são mantidas em segurança e nunca expostas no código-fonte ou em repositórios públicos.
-   **Escalabilidade:** Para um uso mais intensivo, estas soluções locais podem não ser ideais. Considere soluções de base de dados mais robustas para grandes volumes de dados ou múltiplos utilizadores.
-   **Testes:** Implemente testes unitários e de integração para garantir a robustez da aplicação.
