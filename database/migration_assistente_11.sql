-- =====================================================
-- Assistente 11 — chat colaborativo, central de
-- melhorias e placar de palpites.
-- Workspace COMPARTILHADO entre usuários cadastrados:
-- leitura liberada para qualquer usuário logado;
-- anônimos não acessam nada (RLS to authenticated).
-- =====================================================

-- Chats compartilhados -------------------------------------------------
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  created_by_user TEXT NOT NULL,
  created_by_uid UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mensagens (humanos + 11) ---------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Central de melhorias (feedback -> prompt técnico) ---------------------
CREATE TABLE IF NOT EXISTS site_improvements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requested_by TEXT NOT NULL,
  original_feedback TEXT NOT NULL,
  generated_prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'feito', 'rejeitado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Placar de acertos (ranking da galera) --------------------------------
CREATE TABLE IF NOT EXISTS lottery_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_name TEXT NOT NULL,
  game_type TEXT NOT NULL,
  numbers INTEGER[] NOT NULL,
  hits INTEGER,
  contest_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_site_improvements_status ON site_improvements(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lottery_scores_user ON lottery_scores(user_name);
CREATE INDEX IF NOT EXISTS idx_lottery_scores_game ON lottery_scores(game_type, contest_number);

-- RLS -------------------------------------------------------------------
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_scores ENABLE ROW LEVEL SECURITY;

-- chats: leitura compartilhada; criação por logado; alteração só do criador
DROP POLICY IF EXISTS "Chats leitura compartilhada" ON chats;
CREATE POLICY "Chats leitura compartilhada" ON chats
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Chats criacao por logado" ON chats;
CREATE POLICY "Chats criacao por logado" ON chats
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Chats alteracao pelo criador" ON chats;
CREATE POLICY "Chats alteracao pelo criador" ON chats
  FOR UPDATE TO authenticated
  USING (created_by_uid = auth.uid())
  WITH CHECK (created_by_uid = auth.uid());

DROP POLICY IF EXISTS "Chats exclusao pelo criador" ON chats;
CREATE POLICY "Chats exclusao pelo criador" ON chats
  FOR DELETE TO authenticated USING (created_by_uid = auth.uid());

-- messages: leitura compartilhada; escrita por logado
DROP POLICY IF EXISTS "Messages leitura compartilhada" ON messages;
CREATE POLICY "Messages leitura compartilhada" ON messages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Messages escrita por logado" ON messages;
CREATE POLICY "Messages escrita por logado" ON messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- site_improvements: qualquer logado registra; só admin altera status
DROP POLICY IF EXISTS "Melhorias leitura compartilhada" ON site_improvements;
CREATE POLICY "Melhorias leitura compartilhada" ON site_improvements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Melhorias insercao por logado" ON site_improvements;
CREATE POLICY "Melhorias insercao por logado" ON site_improvements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Melhorias atualizacao admin" ON site_improvements;
CREATE POLICY "Melhorias atualizacao admin" ON site_improvements
  FOR UPDATE TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- lottery_scores: placar aberto; inserts sempre via rota (user_name do servidor)
DROP POLICY IF EXISTS "Placar leitura compartilhada" ON lottery_scores;
CREATE POLICY "Placar leitura compartilhada" ON lottery_scores
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Placar insercao por logado" ON lottery_scores;
CREATE POLICY "Placar insercao por logado" ON lottery_scores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Storage: bucket de anexos do chat ------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('assistant-attachments', 'assistant-attachments', true, 10485760,
        '{"image/jpeg","image/png","image/webp","image/gif","application/pdf"}')
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = '{"image/jpeg","image/png","image/webp","image/gif","application/pdf"}';

DROP POLICY IF EXISTS "Anexos do chat upload por logado" ON storage.objects;
CREATE POLICY "Anexos do chat upload por logado" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assistant-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anexos do chat leitura publica" ON storage.objects;
CREATE POLICY "Anexos do chat leitura publica" ON storage.objects
  FOR SELECT USING (bucket_id = 'assistant-attachments');

DROP POLICY IF EXISTS "Anexos do chat exclusao pelo dono" ON storage.objects;
CREATE POLICY "Anexos do chat exclusao pelo dono" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'assistant-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
