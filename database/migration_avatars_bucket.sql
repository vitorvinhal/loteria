-- Criar bucket de avatares no Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, '{"image/jpeg","image/png","image/webp"}')
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = '{"image/jpeg","image/png","image/webp"}';

-- Policy para permitir upload autenticado
CREATE POLICY "Usuarios podem fazer upload de seus avatares"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy para permitir visualizacao publica
CREATE POLICY "Avatares sao publicamente visiveis"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy para permitir atualizacao pelo proprio usuario
CREATE POLICY "Usuarios podem atualizar seus avatares"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy para permitir exclusao pelo proprio usuario
CREATE POLICY "Usuarios podem excluir seus avatares"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
