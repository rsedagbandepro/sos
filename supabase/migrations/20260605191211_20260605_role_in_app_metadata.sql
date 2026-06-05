
/*
# Déplacer le rôle vers auth.users.app_metadata (source de vérité unique)

## Problème corrigé
Le rôle était lu depuis `raw_user_meta_data` lors du signup, que le client peut
écrire librement. Un attaquant pouvait s'inscrire avec `role: 'admin'` et obtenir
des privilèges élevés. De plus, `is_admin()` lisait depuis `profiles.role`,
une table accessible côté client.

## Changements

### 1. `handle_new_user` (trigger SECURITY DEFINER)
- Ignore complètement `raw_user_meta_data->>'role'` — le client ne peut plus
  injecter un rôle au signup.
- Force toujours `role = 'driver'` dans `app_metadata` pour les nouveaux inscrits.
- Le rôle n'est promu (mechanic/admin) que par des fonctions serveur dédiées.

### 2. `set_role_in_app_metadata` (nouvelle fonction SECURITY DEFINER)
- Seule fonction autorisée à modifier le rôle dans `app_metadata`.
- Appelable uniquement par des triggers ou le service_role, jamais par le client anon.
- Synchronise aussi `profiles.role` comme cache dénormalisé.

### 3. `is_admin()` 
- Lit désormais depuis `auth.jwt() -> 'app_metadata' -> 'role'` au lieu de `profiles`.
- Le JWT est signé côté serveur et non falsifiable par le client.

### 4. RLS profiles : durcissement INSERT
- Interdit au client de fournir un `role` différent de 'driver' à l'insertion.
- Seul le trigger (SECURITY DEFINER) peut écrire le rôle réel.

### Note importante
Les utilisateurs existants gardent leur rôle dans `profiles.role`.
La migration synchronise `app_metadata` pour les comptes existants.
*/

-- ============================================================
-- 1. Recréer handle_new_user sans lire raw_user_meta_data->>'role'
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Toujours forcer 'driver' — le client ne peut pas choisir son rôle au signup
  INSERT INTO profiles (user_id, role, full_name, phone)
  VALUES (
    NEW.id,
    'driver',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Écrire le rôle dans app_metadata (non modifiable par le client)
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'driver')
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Fonction dédiée pour promouvoir un rôle (service_role only)
--    Usage : SELECT set_role_in_app_metadata('<user_id>', 'mechanic');
-- ============================================================
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

  -- Synchroniser profiles.role comme cache
  UPDATE profiles
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;

-- Révoquer l'accès public — seul le service_role peut appeler cette fonction
REVOKE ALL ON FUNCTION set_role_in_app_metadata(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION set_role_in_app_metadata(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION set_role_in_app_metadata(uuid, text) FROM authenticated;

-- ============================================================
-- 3. Recréer is_admin() pour lire depuis app_metadata (JWT)
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ============================================================
-- 4. Durcir la policy INSERT sur profiles
--    Le client ne peut insérer que role = 'driver'
-- ============================================================
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'driver'
);

-- ============================================================
-- 5. Synchroniser app_metadata pour les utilisateurs existants
--    (migration one-shot des comptes déjà créés)
-- ============================================================
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT user_id, role FROM profiles LOOP
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', rec.role)
    WHERE id = rec.user_id;
  END LOOP;
END;
$$;
