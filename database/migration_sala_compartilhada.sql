-- Sala da 11: chat compartilhado único tipo grupo de WhatsApp
-- Todos os usuários logados veem e escrevem na mesma sala.
INSERT INTO chats (id, title, created_by_user, created_by_uid, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  'Sala da 11',
  '11',
  NULL,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Garante que mensagens antigas de qualquer chat ainda são legíveis
-- (RLS já permite SELECT para authenticated)

-- Habilita Realtime na tabela messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
