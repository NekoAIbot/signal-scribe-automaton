CREATE OR REPLACE FUNCTION public.prevent_invalid_broker_activation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  last_test jsonb;
  missing_scopes jsonb;
  test_ok boolean;
BEGIN
  IF COALESCE(NEW.is_active, false) IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  last_test := COALESCE(NEW.metadata, '{}'::jsonb) -> 'last_test';
  IF last_test IS NULL THEN
    RETURN NEW;
  END IF;

  test_ok := COALESCE((last_test ->> 'ok')::boolean, false);
  missing_scopes := COALESCE(last_test -> 'missing_scopes', '[]'::jsonb);

  IF test_ok IS FALSE AND jsonb_array_length(missing_scopes) > 0 THEN
    RAISE EXCEPTION 'Broker account cannot be activated until its connection test passes with required permissions.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_invalid_broker_activation_trigger ON public.broker_credentials;
CREATE TRIGGER prevent_invalid_broker_activation_trigger
BEFORE INSERT OR UPDATE OF is_active, metadata ON public.broker_credentials
FOR EACH ROW
EXECUTE FUNCTION public.prevent_invalid_broker_activation();