ALTER TABLE public.assemblies REPLICA IDENTITY FULL;
ALTER TABLE public.assembly_attendance REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.assemblies; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.assembly_attendance; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;