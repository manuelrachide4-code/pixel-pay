CREATE OR REPLACE FUNCTION public.admin_set_kyc(_user_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissao'; END IF;
  IF _status NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'Estado invalido'; END IF;
  UPDATE public.profiles SET kyc_status = _status, updated_at = now() WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_balances()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.available_balance := OLD.available_balance;
  NEW.blocked_balance := OLD.blocked_balance;
  NEW.total_revenue := OLD.total_revenue;
  NEW.total_withdrawn := OLD.total_withdrawn;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.kyc_status := OLD.kyc_status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_product_active(_product_id uuid, _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissao'; END IF;
  UPDATE public.products SET is_active = _active, updated_at = now() WHERE id = _product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_kyc(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_set_product_active(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_kyc(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_product_active(uuid, boolean) TO authenticated;