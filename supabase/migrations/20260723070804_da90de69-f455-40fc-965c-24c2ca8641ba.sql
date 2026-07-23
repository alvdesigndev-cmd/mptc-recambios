
CREATE TABLE IF NOT EXISTS public.plate_lookups_cache (
  plate TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plate_lookups_cache TO authenticated;
GRANT ALL ON public.plate_lookups_cache TO service_role;

ALTER TABLE public.plate_lookups_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read plate cache"
ON public.plate_lookups_cache FOR SELECT
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS plate_lookups_cache_fetched_at_idx
ON public.plate_lookups_cache (fetched_at DESC);
