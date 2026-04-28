-- Criação da Tabela Funcionarios
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT UNIQUE NOT NULL,
    cargo TEXT,
    horario_tipo TEXT,
    horario_previsto TEXT
);

-- Ativar RLS (Row Level Security) se desejar, mas vamos permitir tudo para o App por enquanto
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- Política para permitir qualquer operação
CREATE POLICY "Permitir leitura para todos" ON public.funcionarios
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção" ON public.funcionarios
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir update" ON public.funcionarios
    FOR UPDATE USING (true);
