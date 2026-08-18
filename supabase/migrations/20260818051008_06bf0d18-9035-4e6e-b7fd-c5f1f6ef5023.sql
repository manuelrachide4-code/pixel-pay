-- 1. Withdrawals
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  fee_percent numeric NOT NULL DEFAULT 12,
  fee_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MZN',
  method text NOT NULL,
  destination text NOT NULL,
  account_name text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own withdrawals" ON public.withdrawals
  FOR SELECT TO authenticated
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update withdrawals" ON public.withdrawals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER withdrawals_updated_at BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX withdrawals_seller_idx ON public.withdrawals(seller_id, created_at DESC);
CREATE INDEX withdrawals_status_idx ON public.withdrawals(status, created_at DESC);

-- 2. Platform earnings
CREATE TABLE public.platform_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid REFERENCES public.withdrawals(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'MZN',
  source text NOT NULL DEFAULT 'withdrawal_fee',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_earnings TO authenticated;
GRANT ALL ON public.platform_earnings TO service_role;
ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view platform earnings" ON public.platform_earnings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Credit seller balance when payment becomes paid
CREATE OR REPLACE FUNCTION public.credit_seller_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND COALESCE(OLD.status, '') <> 'paid' AND NEW.seller_id IS NOT NULL THEN
    UPDATE public.profiles
    SET available_balance = available_balance + NEW.amount,
        total_revenue = total_revenue + NEW.amount,
        updated_at = now()
    WHERE id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.credit_seller_on_paid() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER payments_credit_seller
AFTER UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.credit_seller_on_paid();

-- 4. Request withdrawal (seller)
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount numeric,
  _method text,
  _destination text,
  _account_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _balance numeric;
  _fee numeric;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  IF _amount IS NULL OR _amount < 100 THEN RAISE EXCEPTION 'Valor minimo de saque e 100 MZN'; END IF;
  IF _method NOT IN ('mpesa','emola','mkesh','bank') THEN RAISE EXCEPTION 'Metodo invalido'; END IF;
  IF _destination IS NULL OR length(trim(_destination)) < 6 THEN RAISE EXCEPTION 'Conta de destino invalida'; END IF;

  SELECT available_balance INTO _balance FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _amount THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;

  _fee := round(_amount * 0.12, 2);

  UPDATE public.profiles
  SET available_balance = available_balance - _amount,
      blocked_balance = blocked_balance + _amount,
      updated_at = now()
  WHERE id = _uid;

  INSERT INTO public.withdrawals (seller_id, amount, fee_percent, fee_amount, net_amount, method, destination, account_name)
  VALUES (_uid, _amount, 12, _fee, _amount - _fee, _method, trim(_destination), _account_name)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text) TO authenticated;

-- 5. Admin resolves withdrawal
CREATE OR REPLACE FUNCTION public.resolve_withdrawal(_id uuid, _status text, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _w public.withdrawals;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissao'; END IF;
  IF _status NOT IN ('paid','rejected') THEN RAISE EXCEPTION 'Estado invalido'; END IF;

  SELECT * INTO _w FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF _w.id IS NULL THEN RAISE EXCEPTION 'Saque nao encontrado'; END IF;
  IF _w.status <> 'pending' THEN RAISE EXCEPTION 'Saque ja processado'; END IF;

  IF _status = 'paid' THEN
    UPDATE public.profiles
    SET blocked_balance = blocked_balance - _w.amount,
        total_withdrawn = total_withdrawn + _w.amount,
        updated_at = now()
    WHERE id = _w.seller_id;

    INSERT INTO public.platform_earnings (withdrawal_id, seller_id, amount, currency, source)
    VALUES (_w.id, _w.seller_id, _w.fee_amount, _w.currency, 'withdrawal_fee');
  ELSE
    UPDATE public.profiles
    SET blocked_balance = blocked_balance - _w.amount,
        available_balance = available_balance + _w.amount,
        updated_at = now()
    WHERE id = _w.seller_id;
  END IF;

  UPDATE public.withdrawals
  SET status = _status, admin_note = _note, processed_at = now()
  WHERE id = _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_withdrawal(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_withdrawal(uuid, text, text) TO authenticated;

-- 6. Admin account
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'neliocriar@gmail.com'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, country, document)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NEW.phone),
    COALESCE(NEW.raw_user_meta_data ->> 'country', 'MZ'),
    NEW.raw_user_meta_data ->> 'document'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'seller')
  ON CONFLICT DO NOTHING;

  IF lower(COALESCE(NEW.email, '')) = 'neliocriar@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;