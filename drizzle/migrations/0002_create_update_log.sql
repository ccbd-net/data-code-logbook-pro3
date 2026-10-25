CREATE OR REPLACE FUNCTION public.update_log(p_id uuid, p_date date, p_time time without time zone, p_vehicle uuid, p_supervisor uuid, p_driver uuid, p_quantity numeric, p_route uuid DEFAULT NULL::uuid, p_night_hold boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE acc text; k text; dir text; cdir text;
BEGIN
 acc := public.staff_access();
 SELECT kind INTO k FROM public.log_entries WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
 IF acc IS NULL OR NOT (acc='admin' OR (k='trip' AND acc='trip_operator') OR (k='fuel' AND acc='fuel_manager')) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF p_quantity IS NULL OR p_quantity<0 THEN RAISE EXCEPTION 'Invalid entry'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.master_data WHERE id=p_vehicle AND kind='vehicle') OR NOT EXISTS(SELECT 1 FROM public.master_data WHERE id=p_supervisor AND kind='supervisor') OR NOT EXISTS(SELECT 1 FROM public.master_data WHERE id=p_driver AND kind='driver') THEN RAISE EXCEPTION 'Invalid master data'; END IF;
 IF p_route IS NOT NULL THEN
  SELECT direction INTO dir FROM public.master_data WHERE id=p_route AND kind='route';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid route'; END IF;
  IF acc<>'admin' THEN
   SELECT c.direction INTO cdir FROM public.staff_accounts s JOIN public.master_data c ON c.id=s.counter_id WHERE s.user_id=auth.uid();
   IF cdir IS NOT NULL AND dir IS DISTINCT FROM cdir THEN RAISE EXCEPTION 'Route direction not allowed for counter'; END IF;
  END IF;
 END IF;
 UPDATE public.log_entries SET
  entry_date=p_date,
  entry_time=COALESCE(p_time, entry_time),
  vehicle_id=p_vehicle,
  supervisor_id=p_supervisor,
  driver_id=p_driver,
  route_id=p_route,
  direction=CASE WHEN k='trip' THEN dir ELSE direction END,
  night_hold=CASE WHEN k='trip' THEN COALESCE(p_night_hold,false) ELSE night_hold END,
  quantity=CASE WHEN k='fuel' THEN p_quantity ELSE quantity END,
  total=CASE WHEN k='fuel' THEN p_quantity*unit_price ELSE total END,
  excess=CASE WHEN k='fuel' THEN p_quantity-allowance ELSE excess END
 WHERE id=p_id;
END $function$