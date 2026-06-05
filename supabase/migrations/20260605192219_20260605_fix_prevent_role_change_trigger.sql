
/*
# Corriger prevent_role_change pour autoriser set_role_in_app_metadata

## Problème
Le trigger prevent_role_change bloquait TOUS les UPDATE sur profiles.role,
y compris les appels internes depuis des fonctions SECURITY DEFINER (service_role).
Cela rendait set_role_in_app_metadata inutilisable.

## Correction
Le trigger vérifie maintenant si l'appelant est une fonction de confiance
via current_setting('role.trusted_caller', true). La fonction
set_role_in_app_metadata positionne ce flag avant l'UPDATE et le réinitialise
après — aucun appel client ne peut positionner ce flag (il faudrait
SECURITY DEFINER et les droits postgres pour ça).
*/

-- Recréer prevent_role_change pour autoriser les appels de confiance
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Autoriser si l'appelant interne a positionné le flag de confiance
  IF current_setting('app.trusted_role_update', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'insufficient_privilege: le rôle ne peut pas être modifié directement';
  END IF;
  RETURN NEW;
END;
$$;

-- Recréer set_role_in_app_metadata avec le flag de confiance
CREATE OR REPLACE FUNCTION set_role_in_app_metadata(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new_role NOT IN ('driver', 'mechanic', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Mettre à jour app_metadata (source de vérité)
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  WHERE id = target_user_id;

  -- Positionner le flag de confiance pour que le trigger laisse passer l'UPDATE
  PERFORM set_config('app.trusted_role_update', 'true', true);

  UPDATE profiles
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;

  -- Réinitialiser immédiatement
  PERFORM set_config('app.trusted_role_update', 'false', true);
END;
$$;

REVOKE ALL ON FUNCTION set_role_in_app_metadata(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION set_role_in_app_metadata(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION set_role_in_app_metadata(uuid, text) FROM authenticated;
