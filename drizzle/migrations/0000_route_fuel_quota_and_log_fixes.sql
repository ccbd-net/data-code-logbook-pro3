ALTER TABLE public.master_data ADD COLUMN fuel_allowance numeric;
ALTER TABLE public.master_data ADD COLUMN serial integer;

COMMENT ON COLUMN public.fuel_settings.allowance IS 'DEPRECATED: replaced by route-based fuel_allowance on public.master_data (round trip = up + down route quota).';

CREATE OR REPLACE FUNCTION public.add_log(p_kind text, p_date date, p_vehicle uuid, p_supervisor uuid, p_driver uuid, p_quantity numeric DEFAULT 0, p_confirm boolean DEFAULT false, p_time time without time zone DEFAULT NULL::time without time zone, p_route uuid DEFAULT NULL::uuid, p_night_hold boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE acc text; n integer; saved public.log_entries; price numeric; allowed numeric; base numeric; opp numeric; dir text;
BEGIN
 acc := public.staff_access();
 IF acc IS NULL THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF p_kind NOT IN ('trip','fuel') OR p_quantity IS NULL OR p_quantity<0 THEN RAISE EXCEPTION 'Invalid entry'; END IF;
 IF (p_kind='trip' AND acc NOT IN ('admin','trip_operator')) OR (p_kind='fuel' AND acc NOT IN ('admin','fuel_manager')) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.master_data WHERE id=p_vehicle AND kind='vehicle') OR NOT EXISTS(SELECT 1 FROM public.master_data WHERE id=p_supervisor AND kind='supervisor') OR NOT EXISTS(SELECT 1 FROM public.master_data WHERE id=p_driver AND kind='driver') THEN RAISE EXCEPTION 'Invalid master data'; END IF;
 IF p_kind='fuel' THEN
  IF p_route IS NULL OR NOT EXISTS(SELECT 1 FROM public.master_data WHERE id=p_route AND kind='route') THEN RAISE EXCEPTION 'Invalid route'; END IF;
  SELECT direction INTO dir FROM public.master_data WHERE id=p_route AND kind='route';
 ELSE
  IF p_route IS NOT NULL THEN
   SELECT direction INTO dir FROM public.master_data WHERE id=p_route AND kind='route';
   IF NOT FOUND THEN RAISE EXCEPTION 'Invalid route'; END IF;
  END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_kind||p_date::text||p_vehicle::text,0));
 SELECT COALESCE(MAX(ordinal),0)+1 INTO n FROM public.log_entries WHERE kind=p_kind AND entry_date=p_date AND vehicle_id=p_vehicle AND (p_kind='fuel' OR direction IS NOT DISTINCT FROM dir);
 IF n>1 AND NOT p_confirm THEN RETURN jsonb_build_object('duplicate',true,'ordinal',n); END IF;
 SELECT unit_price INTO price FROM public.fuel_settings WHERE id=true;
 IF p_kind='fuel' AND price IS NULL THEN RAISE EXCEPTION 'Set fuel price first'; END IF;
 IF p_kind='fuel' THEN
  SELECT COALESCE(r.fuel_allowance,0) INTO base FROM public.master_data r WHERE r.id=p_route;
  SELECT COALESCE(r2.fuel_allowance,0) INTO opp
   FROM public.log_entries le JOIN public.master_data r2 ON r2.id=le.route_id
   WHERE le.kind='trip' AND le.vehicle_id=p_vehicle
     AND le.direction = CASE WHEN dir='down' THEN 'up' ELSE 'down' END
     AND le.entry_date BETWEEN p_date - 1 AND p_date + 1
   ORDER BY le.entry_date DESC, le.entry_time DESC LIMIT 1;
  allowed := base + opp;
 END IF;
 INSERT INTO public.log_entries(kind,entry_date,entry_time,vehicle_id,supervisor_id,driver_id,ordinal,quantity,unit_price,allowance,created_by,route_id,direction,night_hold)
 VALUES(p_kind,p_date,COALESCE(p_time,(now() AT TIME ZONE 'Asia/Dhaka')::time),p_vehicle,p_supervisor,p_driver,n,CASE WHEN p_kind='fuel' THEN p_quantity ELSE 0 END,CASE WHEN p_kind='fuel' THEN price ELSE 0 END,CASE WHEN p_kind='fuel' THEN allowed ELSE 0 END,auth.uid(),p_route,dir,COALESCE(p_night_hold,false))
 RETURNING * INTO saved;
 RETURN jsonb_build_object('duplicate',false,'id',saved.id,'ordinal',n);
END $function$;

CREATE OR REPLACE FUNCTION public.update_log(p_id uuid, p_date date, p_time time without time zone, p_vehicle uuid, p_supervisor uuid, p_driver uuid, p_quantity numeric, p_route uuid DEFAULT NULL::uuid, p_night_hold boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE acc text; k text; dir text; allowed numeric; base numeric; opp numeric;
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
 END IF;
 IF k='fuel' THEN
  IF p_route IS NULL THEN RAISE EXCEPTION 'Invalid route'; END IF;
  SELECT COALESCE(r.fuel_allowance,0) INTO base FROM public.master_data r WHERE r.id=p_route;
  SELECT COALESCE(r2.fuel_allowance,0) INTO opp
   FROM public.log_entries le JOIN public.master_data r2 ON r2.id=le.route_id
   WHERE le.kind='trip' AND le.vehicle_id=p_vehicle
     AND le.direction = CASE WHEN dir='down' THEN 'up' ELSE 'down' END
     AND le.entry_date BETWEEN p_date - 1 AND p_date + 1
   ORDER BY le.entry_date DESC, le.entry_time DESC LIMIT 1;
  allowed := base + opp;
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
  allowance=CASE WHEN k='fuel' THEN allowed ELSE allowance END
 WHERE id=p_id;
END $function$;