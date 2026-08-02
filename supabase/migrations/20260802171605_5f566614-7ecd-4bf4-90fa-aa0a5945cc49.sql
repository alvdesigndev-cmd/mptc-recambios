DO $$
DECLARE
  _uid uuid;
  _existing uuid;
  _email text := 'grupopenamptc@gmail.com';
BEGIN
  SELECT id INTO _existing FROM auth.users WHERE email = _email;

  IF _existing IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      _uid,
      'authenticated',
      'authenticated',
      _email,
      crypt('Mptc2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"pena","taller_id":"grupo-pena","taller_name":"Grupo Peña"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), _uid, jsonb_build_object('sub', _uid::text, 'email', _email), 'email', _uid::text, now(), now(), now());
  ELSE
    _uid := _existing;
    UPDATE auth.users
      SET encrypted_password = crypt('Mptc2026', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          banned_until = NULL,
          updated_at = now()
      WHERE id = _uid;
  END IF;

  INSERT INTO public.profiles (user_id, role, taller_id, taller_name, ciudad, mecanico)
  VALUES (_uid, 'pena', 'grupo-pena', 'Grupo Peña', '', '')
  ON CONFLICT (user_id) DO UPDATE
    SET role = 'pena', taller_id = 'grupo-pena', taller_name = 'Grupo Peña';
END $$;