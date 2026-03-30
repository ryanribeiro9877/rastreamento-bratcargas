-- Adicionar coluna is_principal para distinguir o master principal dos masters criados
ALTER TABLE usuarios_cooperativa
ADD COLUMN IF NOT EXISTS is_principal BOOLEAN NOT NULL DEFAULT false;

-- Marcar o primeiro usuário cooperativa (mais antigo) como principal
UPDATE usuarios_cooperativa
SET is_principal = true
WHERE id = (
  SELECT id FROM usuarios_cooperativa
  ORDER BY created_at ASC
  LIMIT 1
);

-- RLS: permitir que cooperativa veja outros usuários cooperativa
CREATE POLICY IF NOT EXISTS "cooperativa_can_view_cooperativa_users"
ON usuarios_cooperativa
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_cooperativa uc
    WHERE uc.user_id = auth.uid() AND uc.ativo = true
  )
);
