
CREATE OR REPLACE FUNCTION public.get_my_profile()
 RETURNS public.profiles
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$function$;
