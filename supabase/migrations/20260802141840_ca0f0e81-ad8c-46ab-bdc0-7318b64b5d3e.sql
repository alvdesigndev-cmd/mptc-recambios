CREATE TABLE public.gpa_config (
  id text PRIMARY KEY DEFAULT 'default',
  url_base text NOT NULL DEFAULT 'https://svc-test.gpautomocion.com:4433',
  usuario text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  activa boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT ALL ON public.gpa_config TO service_role;
ALTER TABLE public.gpa_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.gpa_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;