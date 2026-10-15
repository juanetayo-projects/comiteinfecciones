-- ============================================================
-- v7: El administrador asigna la contraseña de un usuario
--     directamente (sin enlace por correo).
--
-- SECURITY DEFINER: corre con permisos del dueño para poder
-- escribir en auth.users, pero sólo si quien llama es un
-- administrador activo (is_admin()). También confirma el correo
-- para que el usuario pueda iniciar sesión de inmediato.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_password(p_user_id uuid, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede asignar contraseñas'
      USING ERRCODE = '42501';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'La contraseña debe tener mínimo 6 caracteres';
  END IF;

  UPDATE auth.users
     SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         email_confirmed_at = COALESCE(email_confirmed_at, now()),
         updated_at         = now()
   WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_password(uuid, text) TO authenticated;
