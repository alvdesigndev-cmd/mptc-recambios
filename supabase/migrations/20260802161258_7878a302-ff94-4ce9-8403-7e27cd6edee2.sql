update auth.users
set encrypted_password = crypt('admin2026', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    banned_until = null,
    updated_at = now()
where email = 'adminmptc@gmail.com';