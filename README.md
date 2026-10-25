# NexoStock

Aplicación de gestión de inventario (PWA / híbrida) desarrollada con **Ionic + Angular (standalone)** y **Supabase**.
Proyecto individual del módulo Desarrollo de Interfaces (DAM2) – Aarón Hernández Moreno.

## Funcionalidades
- Login con dos roles: **Administrador** y **Usuario estándar**.
- Menú lateral con carga diferida (lazy loading) y rutas protegidas con guards según el rol.
- Inventario de productos conectado a Supabase (PostgreSQL) con seguridad RLS.
- Cuadro de mando (solo Administrador) *(en desarrollo)*.
- Exportación de informes en PDF y CSV *(en desarrollo)*.

## Tecnologías
Ionic · Angular · Supabase · Sass · Vercel

## Instalación en local
```bash
npm install
ionic serve
```
Configura `src/environments/environment.ts` y `environment.prod.ts` con la URL y la clave pública (publishable/anon) de Supabase.

## Flujo de trabajo Git
- `main`: versión en producción (Vercel despliega automáticamente).
- `develop`: integración.
- `feature/*`: una rama por funcionalidad, unida a `develop` mediante Pull Request.

## Credenciales de prueba
| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@nexostock.com | *(ver PDF de entrega)* |
| Usuario estándar | user@nexostock.com | *(ver PDF de entrega)* |

> Todos los datos de la aplicación son ficticios.
