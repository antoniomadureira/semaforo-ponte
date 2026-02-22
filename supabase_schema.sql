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
