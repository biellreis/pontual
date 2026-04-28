-- Script para criar a tabela de funcionarios no Supabase

CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    cargo TEXT,
    horario_tipo TEXT,
    horario_previsto TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permite leitura e escrita anônima caso o RLS (Row Level Security) esteja ativado no seu projeto
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública" ON public.funcionarios
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública" ON public.funcionarios
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização pública" ON public.funcionarios
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir exclusão pública" ON public.funcionarios
    FOR DELETE USING (true);
