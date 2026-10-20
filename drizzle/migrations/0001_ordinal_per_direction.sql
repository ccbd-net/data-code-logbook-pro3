CREATE OR REPLACE FUNCTION public.add_log(p_kind text, p_date date, p_vehicle uuid, p_supervisor uuid, p_driver uuid, p_quantity numeric DEFAULT 0, p_confirm boolean DEFAULT false, p_time time without time zone DEFAULT NULL::time without time zone, p_route uuid DEFAULT NULL::uuid, p_night_hold boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n integer; saved public.log_entries; price numeric; allowed numeric; acc text; dir text; cdir text;
BEGIN
 acc := public.staff_access();
 IF acc IS NULL THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF p_kind NOT IN ('trip','fuel') OR p_quantity IS NULL OR p_quantity<0 THEN RAISE EXCEPTION 'Invalid entry'; END IF;
 IF (p_kind='trip' AND acc NOT IN ('admin','trip_operator')) OR (p_kind='fuel' AND acc NOT IN ('admin','fuel_manager')) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.master_data WHERE id=p_vehicle AND kind='vehicle') OR NOT EXISTS(SELECT 1 FROM public.master_data WHERE id=p_supervisor AND kind='supervisor') OR NOT EXISTS(SELECT 1 FROM public.master_data WHERE id=p_driver AND kind='driver') THEN RAISE EXCEPTION 'Invalid master data'; END IF;
 IF p_route IS NOT NULL THEN
  SELECT direction INTO dir FROM public.master_data WHERE id=p_route AND kind='route';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid route'; END IF;
  IF acc<>'admin' THEN
   SELECT c.direction INTO cdir FROM public.staff_accounts s JOIN public.master_data c ON c.id=s.counter_id WHERE s.user_id=auth.uid();
   IF cdir IS NOT NULL AND dir IS DISTINCT FROM cdir THEN RAISE EXCEPTION 'Route direction not allowed for counter'; END IF;
  END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_kind||p_date::text||p_vehicle::text,0));
 -- One-way rule: 2nd/3rd trip counts only within the same direction (up counts with up, down with down).
 SELECT COALESCE(MAX(ordinal),0)+1 INTO n FROM public.log_entries WHERE kind=p_kind AND entry_date=p_date AND vehicle_id=p_vehicle AND (p_kind='fuel' OR direction IS NOT DISTINCT FROM dir);
 IF n>1 AND NOT p_confirm THEN RETURN jsonb_build_object('duplicate',true,'ordinal',n); END IF;
 SELECT unit_price,allowance INTO price,allowed FROM public.fuel_settings WHERE id=true;
 IF p_kind='fuel' AND price IS NULL THEN RAISE EXCEPTION 'Set fuel price and allowance first'; END IF;
 INSERT INTO public.log_entries(kind,entry_date,entry_time,vehicle_id,supervisor_id,driver_id,ordinal,quantity,unit_price,allowance,created_by,route_id,direction,night_hold)
 VALUES(p_kind,p_date,COALESCE(p_time,(now() AT TIME ZONE 'Asia/Dhaka')::time),p_vehicle,p_supervisor,p_driver,n,CASE WHEN p_kind='fuel' THEN p_quantity ELSE 0 END,CASE WHEN p_kind='fuel' THEN price ELSE 0 END,CASE WHEN p_kind='fuel' THEN allowed ELSE 0 END,auth.uid(),p_route,dir,COALESCE(p_night_hold,false))
 RETURNING * INTO saved;
 RETURN jsonb_build_object('duplicate',false,'id',saved.id,'ordinal',n);
END $function$;