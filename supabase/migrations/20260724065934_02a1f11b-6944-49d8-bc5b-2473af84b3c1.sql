DROP POLICY IF EXISTS "familias pena/admin insert" ON public.familias;
DROP POLICY IF EXISTS "familias pena/admin update" ON public.familias;
DROP POLICY IF EXISTS "familias pena/admin delete" ON public.familias;
DROP POLICY IF EXISTS "subfamilias pena/admin insert" ON public.subfamilias;
DROP POLICY IF EXISTS "subfamilias pena/admin update" ON public.subfamilias;
DROP POLICY IF EXISTS "subfamilias pena/admin delete" ON public.subfamilias;

CREATE POLICY "familias app settings insert"
ON public.familias
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_role(auth.uid()) IS NOT NULL
  AND public.get_user_role(auth.uid()) <> 'pena'::public.app_role
);

CREATE POLICY "familias app settings update"
ON public.familias
FOR UPDATE
TO authenticated
USING (
  public.get_user_role(auth.uid()) IS NOT NULL
  AND public.get_user_role(auth.uid()) <> 'pena'::public.app_role
)
WITH CHECK (
  public.get_user_role(auth.uid()) IS NOT NULL
  AND public.get_user_role(auth.uid()) <> 'pena'::public.app_role
);

CREATE POLICY "familias app settings delete"
ON public.familias
FOR DELETE
TO authenticated
USING (
  public.get_user_role(auth.uid()) IS NOT NULL
  AND public.get_user_role(auth.uid()) <> 'pena'::public.app_role
);

CREATE POLICY "subfamilias app settings insert"
ON public.subfamilias
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_role(auth.uid()) IS NOT NULL
  AND public.get_user_role(auth.uid()) <> 'pena'::public.app_role
);

CREATE POLICY "subfamilias app settings update"
ON public.subfamilias
FOR UPDATE
TO authenticated
USING (
  public.get_user_role(auth.uid()) IS NOT NULL
  AND public.get_user_role(auth.uid()) <> 'pena'::public.app_role
)
WITH CHECK (
  public.get_user_role(auth.uid()) IS NOT NULL
  AND public.get_user_role(auth.uid()) <> 'pena'::public.app_role
);

CREATE POLICY "subfamilias app settings delete"
ON public.subfamilias
FOR DELETE
TO authenticated
USING (
  public.get_user_role(auth.uid()) IS NOT NULL
  AND public.get_user_role(auth.uid()) <> 'pena'::public.app_role
);