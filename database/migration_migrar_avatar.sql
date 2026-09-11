-- =====================================================
-- Migration: Foto migrada do user_metadata para perfil_foto
-- Executa APÓS criar a tabela perfil_foto
-- =====================================================

CREATE TABLE IF NOT EXISTS public.perfil_foto (
  usuario_id TEXT PRIMARY KEY,
  avatar_base64 TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.perfil_foto ENABLE ROW LEVEL SECURITY;

INSERT INTO public.perfil_foto (usuario_id, avatar_base64)
SELECT id::text, raw_user_meta_data ->> 'avatar_url'
FROM auth.users
WHERE raw_user_meta_data ? 'avatar_url'
  AND raw_user_meta_data ->> 'avatar_url' LIKE 'data:image/%'
ON CONFLICT (usuario_id) DO NOTHING;

-- Remove a foto pesada do metadata (para o JWT/cookie ficar leve)
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'avatar_url' - 'avatar_path'
WHERE raw_user_meta_data ? 'avatar_url';