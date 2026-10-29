-- =====================================================================
-- INVENTAPRO - Esquema de base de datos (Supabase / PostgreSQL)
-- Proyecto individual DI 0488 - Aarón Hernández Moreno
--
-- ANTES de ejecutarlo crea en Authentication -> Users -> Add user
-- (marcando "Auto Confirm User") estos dos usuarios de PRUEBA:
--     admin@inventapro.com   -> será Administrador
--     user@inventapro.com    -> será Usuario estándar
-- Después pega TODO este script en SQL Editor y pulsa Run.
--
-- ATENCIÓN: la PARTE 0 borra las tablas de este script si ya existían.
-- Todos los datos son inventados (datos sintéticos).
-- =====================================================================


-- ---------------------------------------------------------------------
-- PARTE 0: limpieza (para poder ejecutar el script varias veces)
-- ---------------------------------------------------------------------
DROP TRIGGER  IF EXISTS on_auth_user_created ON auth.users;
DROP TABLE    IF EXISTS public.movimientos CASCADE;
DROP TABLE    IF EXISTS public.productos   CASCADE;
DROP TABLE    IF EXISTS public.proveedores CASCADE;
DROP TABLE    IF EXISTS public.categorias  CASCADE;
DROP TABLE    IF EXISTS public.perfiles    CASCADE;
DROP FUNCTION IF EXISTS public.es_admin() CASCADE;
DROP FUNCTION IF EXISTS public.crear_perfil() CASCADE;
DROP FUNCTION IF EXISTS public.aplicar_movimiento() CASCADE;
DROP TYPE     IF EXISTS public.rol_usuario CASCADE;


-- ---------------------------------------------------------------------
-- PARTE 1: roles y perfiles (vinculados a Supabase Auth)
-- ---------------------------------------------------------------------
CREATE TYPE public.rol_usuario AS ENUM ('admin', 'user');

CREATE TABLE public.perfiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  nombre     TEXT,
  rol        public.rol_usuario NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- PARTE 2: tablas de negocio
-- ---------------------------------------------------------------------
CREATE TABLE public.categorias (
  id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE public.proveedores (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre   TEXT NOT NULL,
  email    TEXT NOT NULL UNIQUE,
  telefono TEXT
);

CREATE TABLE public.productos (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku          TEXT NOT NULL UNIQUE,              -- código único del producto
  nombre       TEXT NOT NULL,
  categoria_id BIGINT REFERENCES public.categorias(id)  ON DELETE SET NULL,
  proveedor_id BIGINT REFERENCES public.proveedores(id) ON DELETE SET NULL,
  precio       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.movimientos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad    INTEGER NOT NULL CHECK (cantidad > 0),
  usuario_id  UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- PARTE 3: funciones y triggers
-- ---------------------------------------------------------------------
-- ¿El usuario conectado es administrador? (SECURITY DEFINER evita
-- que las políticas RLS se llamen a sí mismas en bucle)
CREATE FUNCTION public.es_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin');
$$;

-- Al registrarse un usuario nuevo se le crea su perfil con rol 'user'
CREATE FUNCTION public.crear_perfil() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.crear_perfil();

-- Cada movimiento actualiza el stock del producto (y no deja stock negativo)
CREATE FUNCTION public.aplicar_movimiento() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.productos SET stock = stock + NEW.cantidad WHERE id = NEW.producto_id;
  ELSE
    IF (SELECT stock FROM public.productos WHERE id = NEW.producto_id) < NEW.cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para esta salida';
    END IF;
    UPDATE public.productos SET stock = stock - NEW.cantidad WHERE id = NEW.producto_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER al_insertar_movimiento
  BEFORE INSERT ON public.movimientos
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimiento();


-- ---------------------------------------------------------------------
-- PARTE 4: seguridad RLS (la seguridad real está aquí, no en Angular)
-- ---------------------------------------------------------------------
ALTER TABLE public.perfiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

-- Perfiles: cada uno ve el suyo; el admin ve y edita todos
CREATE POLICY "perfiles_select" ON public.perfiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.es_admin());
CREATE POLICY "perfiles_update_admin" ON public.perfiles FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

-- Catálogo (categorías, proveedores, productos): leer = autenticados, escribir = admin
CREATE POLICY "categorias_select" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "categorias_admin"  ON public.categorias FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

CREATE POLICY "proveedores_select" ON public.proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "proveedores_admin"  ON public.proveedores FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

CREATE POLICY "productos_select" ON public.productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "productos_admin"  ON public.productos FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

-- Movimientos: todos los autenticados leen y registran (a su nombre); solo admin borra
CREATE POLICY "movimientos_select" ON public.movimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "movimientos_insert" ON public.movimientos FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "movimientos_delete_admin" ON public.movimientos FOR DELETE TO authenticated
  USING (public.es_admin());


-- ---------------------------------------------------------------------
-- PARTE 5: perfiles de los usuarios ya creados + rol de administrador
-- ---------------------------------------------------------------------
INSERT INTO public.perfiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

UPDATE public.perfiles SET rol = 'admin', nombre = 'Administrador' WHERE email = 'admin@inventapro.com';
UPDATE public.perfiles SET nombre = 'Usuario estándar'            WHERE email = 'user@inventapro.com';


-- ---------------------------------------------------------------------
-- PARTE 6: datos de prueba (inventados)
-- ---------------------------------------------------------------------
INSERT INTO public.categorias (nombre) VALUES
  ('Informática'), ('Periféricos'), ('Redes'), ('Almacenamiento'), ('Oficina');

INSERT INTO public.proveedores (nombre, email, telefono) VALUES
  ('TecnoDistribución S.L.', 'pedidos@tecnodistribucion.test', '910000001'),
  ('Periféricos Centro',     'ventas@perifericoscentro.test',  '910000002'),
  ('RedNet Suministros',     'info@rednet.test',               '910000003'),
  ('Papelería Global',       'contacto@papeleriaglobal.test',  '910000004');

INSERT INTO public.productos (sku, nombre, categoria_id, proveedor_id, precio, stock, stock_minimo) VALUES
  ('INF-001', 'Portátil 15" i5 16GB',          1, 1, 749.00, 12, 5),
  ('INF-002', 'Monitor 27" QHD',               1, 1, 229.90,  4, 5),
  ('INF-003', 'Mini PC oficina',               1, 1, 389.00,  9, 3),
  ('PER-001', 'Teclado mecánico ES',           2, 2,  59.95, 25, 10),
  ('PER-002', 'Ratón inalámbrico',             2, 2,  19.90, 40, 15),
  ('PER-003', 'Webcam Full HD',                2, 2,  39.50,  3, 6),
  ('RED-001', 'Switch 8 puertos Gigabit',      3, 3,  34.99, 15, 5),
  ('RED-002', 'Router WiFi 6',                 3, 3,  89.00,  6, 4),
  ('RED-003', 'Cable de red Cat6 5m',          3, 3,   4.50, 80, 30),
  ('ALM-001', 'SSD NVMe 1TB',                  4, 1,  69.90, 18, 8),
  ('ALM-002', 'Disco externo 2TB',             4, 1,  74.00,  2, 5),
  ('OFI-001', 'Paquete folios A4 (500)',       5, 4,   4.20, 120, 50),
  ('OFI-002', 'Silla ergonómica',              5, 4, 159.00,  7, 3);

INSERT INTO public.movimientos (producto_id, tipo, cantidad, created_at) VALUES
  (1, 'entrada', 5,  NOW() - INTERVAL '75 days'),
  (4, 'salida',  6,  NOW() - INTERVAL '60 days'),
  (5, 'entrada', 20, NOW() - INTERVAL '45 days'),
  (9, 'salida',  10, NOW() - INTERVAL '30 days'),
  (12,'entrada', 50, NOW() - INTERVAL '20 days'),
  (2, 'salida',  2,  NOW() - INTERVAL '10 days'),
  (10,'entrada', 6,  NOW() - INTERVAL '5 days'),
  (6, 'salida',  1,  NOW() - INTERVAL '1 day');


-- ---------------------------------------------------------------------
-- PARTE 7: comprobación
-- (perfiles: admin + user | productos: 13 | movimientos: 8)
-- ---------------------------------------------------------------------
SELECT email, rol FROM public.perfiles;
SELECT COUNT(*) AS productos   FROM public.productos;
SELECT COUNT(*) AS movimientos FROM public.movimientos;
