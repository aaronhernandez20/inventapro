-- =====================================================================
-- INVENTAPRO - Script 2: ampliación de la base de datos
-- (registro de cuentas, imágenes en Storage y más datos para el dashboard)
--
-- Ejecutar UNA vez en Supabase -> SQL Editor -> New query -> Run.
-- NO borra nada de lo que ya tienes.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PARTE 1: imágenes de producto
-- Guardamos la RUTA del archivo dentro del bucket (ej. 'INF-001.png');
-- la app construye la URL pública con supabase.storage.getPublicUrl().
-- ---------------------------------------------------------------------
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS imagen_path TEXT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS descripcion TEXT;


-- ---------------------------------------------------------------------
-- PARTE 2: bucket público "productos" en Supabase Storage
-- Leer: cualquiera (las imágenes son públicas). Subir/cambiar/borrar: solo admin.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('productos', 'productos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

DROP POLICY IF EXISTS "productos_img_select" ON storage.objects;
DROP POLICY IF EXISTS "productos_img_insert" ON storage.objects;
DROP POLICY IF EXISTS "productos_img_update" ON storage.objects;
DROP POLICY IF EXISTS "productos_img_delete" ON storage.objects;

CREATE POLICY "productos_img_select" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'productos');
CREATE POLICY "productos_img_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'productos' AND public.es_admin());
CREATE POLICY "productos_img_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'productos' AND public.es_admin());
CREATE POLICY "productos_img_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'productos' AND public.es_admin());


-- ---------------------------------------------------------------------
-- PARTE 3: registro de cuentas desde la app
-- 3a) Al crear la cuenta, el perfil guarda también el nombre que se escribe
--     en el formulario (llega en raw_user_meta_data). Rol por defecto: 'user'.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_perfil() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre)
  VALUES (NEW.id, NEW.email, NULLIF(NEW.raw_user_meta_data ->> 'nombre', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3b) Validación asíncrona del formulario de registro:
--     ¿ya existe una cuenta con este email? (se puede llamar sin sesión)
CREATE OR REPLACE FUNCTION public.email_registrado(p_email TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(p_email)));
$$;
REVOKE ALL ON FUNCTION public.email_registrado(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_registrado(TEXT) TO anon, authenticated;


-- ---------------------------------------------------------------------
-- PARTE 3c: relación movimientos -> perfiles
-- Permite mostrar en el historial el nombre de quién hizo cada movimiento
-- (consulta: movimientos?select=*,perfiles(nombre)).
-- ---------------------------------------------------------------------
ALTER TABLE public.movimientos DROP CONSTRAINT IF EXISTS movimientos_usuario_perfil_fk;
ALTER TABLE public.movimientos
  ADD CONSTRAINT movimientos_usuario_perfil_fk
  FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id) ON DELETE SET NULL;


-- ---------------------------------------------------------------------
-- PARTE 4: imágenes y descripciones de los productos de prueba
-- (las imágenes se suben al bucket con el nombre <SKU>.png)
-- ---------------------------------------------------------------------
UPDATE public.productos SET imagen_path = sku || '.png' WHERE imagen_path IS NULL;

UPDATE public.productos SET descripcion = CASE sku
  WHEN 'INF-001' THEN 'Portátil de 15 pulgadas para puestos de oficina y teletrabajo.'
  WHEN 'INF-002' THEN 'Monitor de 27 pulgadas con resolución QHD para diseño y ofimática.'
  WHEN 'INF-003' THEN 'Equipo compacto de bajo consumo para recepción y puestos fijos.'
  WHEN 'PER-001' THEN 'Teclado mecánico con distribución española.'
  WHEN 'PER-002' THEN 'Ratón inalámbrico ergonómico con receptor USB.'
  WHEN 'PER-003' THEN 'Cámara Full HD para videoconferencias.'
  WHEN 'RED-001' THEN 'Switch no gestionable de 8 puertos Gigabit.'
  WHEN 'RED-002' THEN 'Router de doble banda con WiFi 6.'
  WHEN 'RED-003' THEN 'Latiguillo de red categoría 6 de 5 metros.'
  WHEN 'ALM-001' THEN 'Unidad SSD NVMe de 1 TB para ampliar equipos.'
  WHEN 'ALM-002' THEN 'Disco duro externo USB de 2 TB para copias de seguridad.'
  WHEN 'OFI-001' THEN 'Paquete de 500 folios A4 de 80 g.'
  WHEN 'OFI-002' THEN 'Silla de oficina ergonómica con soporte lumbar.'
  ELSE descripcion END
WHERE descripcion IS NULL;


-- ---------------------------------------------------------------------
-- PARTE 5: más movimientos de prueba (últimos 6 meses) para los gráficos
-- Cada salida va precedida de una entrada mayor del mismo producto,
-- así el trigger nunca deja el stock en negativo.
-- ---------------------------------------------------------------------
INSERT INTO public.movimientos (producto_id, tipo, cantidad, created_at) VALUES
  (3, 'entrada', 18, TIMESTAMPTZ '2026-05-11 09:44:00+01'),
  (3, 'salida',  4, TIMESTAMPTZ '2026-05-12 17:16:00+01'),
  (6, 'entrada', 24, TIMESTAMPTZ '2026-05-01 09:12:00+01'),
  (6, 'salida',  8, TIMESTAMPTZ '2026-05-10 17:15:00+01'),
  (7, 'entrada', 19, TIMESTAMPTZ '2026-05-02 09:45:00+01'),
  (7, 'salida',  4, TIMESTAMPTZ '2026-05-06 17:37:00+01'),
  (1, 'entrada', 24, TIMESTAMPTZ '2026-05-02 09:50:00+01'),
  (1, 'salida',  22, TIMESTAMPTZ '2026-05-06 17:47:00+01'),
  (1, 'entrada', 24, TIMESTAMPTZ '2026-05-10 09:24:00+01'),
  (1, 'salida',  3, TIMESTAMPTZ '2026-05-17 17:12:00+01'),
  (9, 'entrada', 10, TIMESTAMPTZ '2026-05-05 09:44:00+01'),
  (9, 'salida',  4, TIMESTAMPTZ '2026-05-12 17:17:00+01'),
  (9, 'entrada', 11, TIMESTAMPTZ '2026-06-02 09:33:00+01'),
  (9, 'salida',  5, TIMESTAMPTZ '2026-06-12 17:16:00+01'),
  (9, 'entrada', 8, TIMESTAMPTZ '2026-06-10 09:23:00+01'),
  (9, 'salida',  6, TIMESTAMPTZ '2026-06-11 17:41:00+01'),
  (11, 'entrada', 23, TIMESTAMPTZ '2026-06-07 09:47:00+01'),
  (11, 'salida',  16, TIMESTAMPTZ '2026-06-13 17:39:00+01'),
  (6, 'entrada', 15, TIMESTAMPTZ '2026-06-04 09:59:00+01'),
  (6, 'salida',  13, TIMESTAMPTZ '2026-06-07 17:25:00+01'),
  (2, 'entrada', 24, TIMESTAMPTZ '2026-06-05 09:31:00+01'),
  (2, 'salida',  17, TIMESTAMPTZ '2026-06-14 17:56:00+01'),
  (8, 'entrada', 15, TIMESTAMPTZ '2026-06-10 09:42:00+01'),
  (8, 'salida',  3, TIMESTAMPTZ '2026-06-12 17:36:00+01'),
  (13, 'entrada', 16, TIMESTAMPTZ '2026-07-03 09:12:00+01'),
  (13, 'salida',  8, TIMESTAMPTZ '2026-07-11 17:52:00+01'),
  (2, 'entrada', 23, TIMESTAMPTZ '2026-07-10 09:54:00+01'),
  (2, 'salida',  12, TIMESTAMPTZ '2026-07-16 17:32:00+01'),
  (10, 'entrada', 21, TIMESTAMPTZ '2026-07-10 09:15:00+01'),
  (10, 'salida',  4, TIMESTAMPTZ '2026-07-18 17:27:00+01'),
  (8, 'entrada', 8, TIMESTAMPTZ '2026-07-01 09:29:00+01'),
  (8, 'salida',  7, TIMESTAMPTZ '2026-07-13 17:51:00+01'),
  (10, 'entrada', 20, TIMESTAMPTZ '2026-07-05 09:52:00+01'),
  (10, 'salida',  14, TIMESTAMPTZ '2026-07-17 17:32:00+01'),
  (8, 'entrada', 17, TIMESTAMPTZ '2026-08-03 09:41:00+01'),
  (8, 'salida',  3, TIMESTAMPTZ '2026-08-13 17:13:00+01'),
  (4, 'entrada', 15, TIMESTAMPTZ '2026-08-03 09:35:00+01'),
  (4, 'salida',  5, TIMESTAMPTZ '2026-08-15 17:35:00+01'),
  (8, 'entrada', 8, TIMESTAMPTZ '2026-08-03 09:45:00+01'),
  (8, 'salida',  5, TIMESTAMPTZ '2026-08-11 17:27:00+01'),
  (3, 'entrada', 19, TIMESTAMPTZ '2026-08-09 09:32:00+01'),
  (3, 'salida',  15, TIMESTAMPTZ '2026-08-14 17:53:00+01'),
  (4, 'entrada', 10, TIMESTAMPTZ '2026-09-02 09:24:00+01'),
  (4, 'salida',  4, TIMESTAMPTZ '2026-09-05 17:52:00+01'),
  (4, 'entrada', 6, TIMESTAMPTZ '2026-09-08 09:26:00+01'),
  (4, 'salida',  3, TIMESTAMPTZ '2026-09-18 17:28:00+01'),
  (1, 'entrada', 10, TIMESTAMPTZ '2026-09-07 09:49:00+01'),
  (1, 'salida',  7, TIMESTAMPTZ '2026-09-16 17:46:00+01'),
  (6, 'entrada', 10, TIMESTAMPTZ '2026-09-12 09:39:00+01'),
  (6, 'salida',  2, TIMESTAMPTZ '2026-09-21 17:59:00+01'),
  (11, 'entrada', 23, TIMESTAMPTZ '2026-09-07 09:35:00+01'),
  (11, 'salida',  14, TIMESTAMPTZ '2026-09-14 17:16:00+01'),
  (8, 'entrada', 18, TIMESTAMPTZ '2026-09-01 09:23:00+01'),
  (8, 'salida',  4, TIMESTAMPTZ '2026-09-05 17:38:00+01'),
  (3, 'entrada', 9, TIMESTAMPTZ '2026-09-06 09:16:00+01'),
  (3, 'salida',  2, TIMESTAMPTZ '2026-09-16 17:10:00+01'),
  (9, 'entrada', 9, TIMESTAMPTZ '2026-10-06 09:14:00+01'),
  (9, 'salida',  2, TIMESTAMPTZ '2026-10-16 17:23:00+01'),
  (10, 'entrada', 18, TIMESTAMPTZ '2026-10-03 09:32:00+01'),
  (10, 'salida',  10, TIMESTAMPTZ '2026-10-14 17:48:00+01'),
  (6, 'entrada', 21, TIMESTAMPTZ '2026-10-02 09:39:00+01'),
  (6, 'salida',  17, TIMESTAMPTZ '2026-10-04 17:40:00+01'),
  (8, 'entrada', 15, TIMESTAMPTZ '2026-10-02 09:57:00+01'),
  (8, 'salida',  3, TIMESTAMPTZ '2026-10-05 17:31:00+01'),
  (12, 'entrada', 14, TIMESTAMPTZ '2026-10-08 09:43:00+01'),
  (12, 'salida',  4, TIMESTAMPTZ '2026-10-20 17:11:00+01');


-- ---------------------------------------------------------------------
-- PARTE 5b: umbrales de stock mínimo realistas
-- (así algunos productos aparecen en "stock bajo" en el inicio y el dashboard)
-- ---------------------------------------------------------------------
UPDATE public.productos SET stock_minimo = 25 WHERE sku = 'INF-002';
UPDATE public.productos SET stock_minimo = 35 WHERE sku = 'PER-003';
UPDATE public.productos SET stock_minimo = 20 WHERE sku = 'ALM-002';
UPDATE public.productos SET stock_minimo = 20 WHERE sku = 'OFI-002';


-- ---------------------------------------------------------------------
-- PARTE 6: comprobación
-- ---------------------------------------------------------------------
SELECT public.email_registrado('admin@inventapro.com') AS admin_existe;   -- true
SELECT COUNT(*) AS movimientos FROM public.movimientos;
SELECT sku, imagen_path FROM public.productos ORDER BY sku;
