CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- AFFILIATES
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  code text NOT NULL UNIQUE,
  commission_percent numeric NOT NULL DEFAULT 20 CHECK (commission_percent >= 0 AND commission_percent <= 90),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers manage own affiliates" ON public.affiliates FOR ALL TO authenticated
  USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Admins view affiliates" ON public.affiliates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER affiliates_updated_at BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS affiliate_commission numeric NOT NULL DEFAULT 0;

-- API KEYS
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers view own api keys" ON public.api_keys FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);
CREATE POLICY "Sellers delete own api keys" ON public.api_keys FOR DELETE TO authenticated
  USING (auth.uid() = seller_id);
CREATE TRIGGER api_keys_updated_at BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.create_api_key(_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _raw text;
  _key text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  IF _name IS NULL OR length(trim(_name)) < 2 THEN RAISE EXCEPTION 'Nome invalido'; END IF;
  IF (SELECT count(*) FROM public.api_keys WHERE seller_id = _uid AND revoked_at IS NULL) >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 chaves ativas';
  END IF;

  _raw := encode(extensions.gen_random_bytes(24), 'hex');
  _key := 'dpp_live_' || _raw;

  INSERT INTO public.api_keys (seller_id, name, key_prefix, key_hash)
  VALUES (_uid, trim(_name), left(_key, 17), encode(extensions.digest(_key, 'sha256'), 'hex'));

  RETURN _key;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_api_key(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_api_key(text) TO authenticated;

-- WEBHOOK ENDPOINTS
CREATE TABLE public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(20), 'hex'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers manage own webhooks" ON public.webhook_endpoints FOR ALL TO authenticated
  USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE TRIGGER webhook_endpoints_updated_at BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();