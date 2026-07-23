
CREATE TABLE IF NOT EXISTS public.plate_lookups_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taller_id TEXT,
  plate TEXT NOT NULL,
  vehiculo TEXT,
  marca TEXT,
  modelo TEXT,
  ok BOOLEAN NOT NULL DEFAULT true,
  cached BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.plate_lookups_history TO authenticated;
GRANT ALL ON public.plate_lookups_history TO service_role;

ALTER TABLE public.plate_lookups_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own plate history"
ON public.plate_lookups_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete own plate history"
ON public.plate_lookups_history FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS plate_lookups_history_user_created_idx
ON public.plate_lookups_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS plate_lookups_history_plate_idx
ON public.plate_lookups_history (plate);
