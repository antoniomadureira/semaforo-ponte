# Guia de Implementação das Melhorias para o Projeto 'semaforo-ponte'

Este guia detalha os passos necessários para implementar as melhorias sugeridas no projeto `semaforo-ponte`, focando na centralização do armazenamento de dados com Supabase e na unificação da lógica de monitorização num backend Node.js.

## 1. Configuração do Supabase

O primeiro passo é configurar a sua base de dados no Supabase. Se ainda não tem uma conta, pode criar uma gratuitamente em [supabase.com](https://supabase.com/).

### 1.1. Criar um Novo Projeto

1.  Aceda ao seu painel de controlo do Supabase.
2.  Clique em "New project".
3.  Preencha os detalhes do projeto (nome, palavra-passe da base de dados, região).

### 1.2. Configurar a Tabela `historico_ponte`

1.  No painel do seu projeto Supabase, navegue para "Table Editor" (ou "SQL Editor").
2.  Execute o script SQL fornecido (`supabase_schema.sql`) para criar a tabela `historico_ponte` e configurar as políticas de Row Level Security (RLS).

    ```sql
    CREATE TABLE IF NOT EXISTS historico_ponte (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        timestamp TIMESTAMPTZ DEFAULT now(),
        estado TEXT NOT NULL
    );

    -- Opcional: Criar uma função para garantir que o estado é sempre um dos valores permitidos
    CREATE TYPE estado_ponte_enum AS ENUM (
        'FECHADA',
        'ABERTA',
        'PREPARAÇÃO'
    );

    ALTER TABLE historico_ponte
    ALTER COLUMN estado TYPE estado_ponte_enum USING estado::estado_ponte_enum;

    -- Opcional: Adicionar RLS (Row Level Security) para Supabase
    ALTER TABLE historico_ponte ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Enable read access for all users" ON historico_ponte FOR SELECT USING (TRUE);
    CREATE POLICY "Enable insert for authenticated users only" ON historico_ponte FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    ```

### 1.3. Obter Credenciais do Supabase

1.  No painel do seu projeto Supabase, navegue para "Settings" -> "API".
2.  Anote os seguintes valores:
    -   **Project URL (URL da API)**: `SUPABASE_URL`
    -   **Project API Key (anon public)**: `SUPABASE_ANON_KEY`

## 2. Configuração das Variáveis de Ambiente (`.env`)

Crie um ficheiro `.env` na raiz do seu projeto (`/home/ubuntu/semaforo-ponte/.env`) com as seguintes variáveis:

```dotenv
# Credenciais do Supabase
SUPABASE_URL="[O SEU SUPABASE PROJECT URL]"
SUPABASE_ANON_KEY="[A SUA SUPABASE ANON PUBLIC KEY]"

# Credenciais para Notificações WhatsApp (CallMeBot)
WHATSAPP_PHONE="[O SEU NÚMERO DE TELEFONE WHATSAPP COM CÓDIGO DO PAÍS, ex: 351912345678]"
WHATSAPP_API_KEY="[A SUA API KEY DO CALLMEBOT]"

# Porta para o servidor de monitorização (opcional, padrão é 3000)
PORT=3000
```

**Importante:** Nunca exponha estas chaves publicamente. O ficheiro `.env` deve ser adicionado ao `.gitignore`.

## 3. Instalação de Dependências

No diretório raiz do projeto, instale as novas dependências do Node.js:

```bash
cd /home/ubuntu/semaforo-ponte
npm install
```

## 4. Executar o Servidor de Monitorização

O novo script `server_monitor.js` atua como um backend que monitoriza o estado da ponte e guarda os dados no Supabase. Ele também expõe uma API para o frontend.

Para iniciar o servidor:

```bash
node server_monitor.js
```

Para manter o servidor a correr em produção, considere usar ferramentas como `pm2` ou implementá-lo como um serviço numa plataforma como Vercel (usando Serverless Functions) ou um VPS.

## 5. Atualização do Frontend (Aplicação React)

O ficheiro `src/App.tsx` foi atualizado para:

-   Remover a lógica de scraping direto da APDL.
-   Remover a lógica de armazenamento local (`localStorage`).
-   Consumir o histórico de eventos através da nova API `/api/historico` exposta pelo `server_monitor.js`.

### 5.1. Executar a Aplicação Frontend

No diretório raiz do projeto, inicie a aplicação React:

```bash
npm run dev
```

Se estiver a usar o Vercel para deploy, certifique-se de que o `server_monitor.js` é implementado como uma Serverless Function ou que a API `/api/historico` é redirecionada corretamente para o seu backend.

## 6. Melhoria da Documentação do Projeto (`README.md`)

É altamente recomendável atualizar o `README.md` do projeto para refletir estas mudanças, incluindo:

-   Uma descrição clara do projeto e do seu objetivo.
-   Instruções detalhadas sobre como configurar e executar o frontend e o backend.
-   Explicação da arquitetura atualizada (frontend, backend, Supabase).
-   Como configurar as variáveis de ambiente.

## 7. Próximos Passos e Considerações

-   **Segurança:** Garanta que as suas chaves de API do Supabase e CallMeBot são mantidas em segurança e nunca expostas no código-fonte ou em repositórios públicos.
-   **Escalabilidade:** Para um uso mais intensivo, considere otimizar as queries do Supabase e a infraestrutura do backend.
-   **Testes:** Implemente testes unitários e de integração para garantir a robustez da aplicação.

Com estas melhorias, o projeto `semaforo-ponte` terá um armazenamento de dados centralizado e persistente, uma arquitetura mais robusta e escalável, e uma base para futuras expansões.
