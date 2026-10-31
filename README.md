# InventaPro

**Aplicación de gestión de inventario multiplataforma (PWA / híbrida)** desarrollada con **Ionic + Angular (standalone)**, **Supabase** (PostgreSQL, Auth y Storage) y **Firebase Firestore** (tiempo real).

Proyecto individual del módulo *Desarrollo de Interfaces* (0488) · DAM2 · Aarón Hernández Moreno.

> Todos los datos de la aplicación son **ficticios** (datos sintéticos). No contiene datos personales reales.

---

## Índice
1. [Funcionalidades](#funcionalidades)
2. [Tecnologías](#tecnologías)
3. [Arquitectura](#arquitectura)
4. [Instalación y puesta en marcha](#instalación-y-puesta-en-marcha)
5. [Manual de usuario](#manual-de-usuario)
6. [Accesibilidad](#accesibilidad)
7. [Documentación técnica](#documentación-técnica)
8. [Flujo de trabajo Git y despliegue](#flujo-de-trabajo-git-y-despliegue)

---

## Funcionalidades

| Área | Qué incluye |
|---|---|
| **Acceso** | Inicio de sesión, **registro de cuentas** (se crean en Supabase Auth y en la tabla `perfiles`), roles **Administrador** y **Usuario estándar**, rutas protegidas con *functional guards*. |
| **Productos** | Catálogo con **imágenes en Supabase Storage**, buscador, filtros, ordenación y paginación. Alta/edición/borrado (solo admin) con **validación asíncrona del SKU**. |
| **Movimientos** | Entradas y salidas de stock; el stock se actualiza con un *trigger* y nunca queda en negativo. |
| **Tiempo real** | Registro de actividad y **alertas de stock bajo** en **Firestore** (NoSQL) con `onSnapshot`. |
| **Cuadro de mando** | Solo admin. Indicadores y gráficos de **anillo, área y radar** (Chart.js) con **filtros en tiempo real** (periodo y categoría). |
| **Informes** | Exportación a **PDF** (con diseño: cabecera, indicadores, tabla y paginación) y **CSV** (compatible con Excel). |
| **Usuarios** | Solo admin. Listado de cuentas y cambio de rol. |
| **Ayuda** | Manual de usuario integrado con **ayuda contextual** (botón `?` en cada pantalla). |
| **PWA** | Instalable, con *service worker* y caché de imágenes. |

## Tecnologías

Ionic 9 · Angular 22 (standalone, signals, zoneless) · RxJS · Supabase (PostgreSQL + RLS, Auth, Storage, API REST) · Firebase Firestore · Chart.js · jsPDF + jspdf-autotable · Sass · Vitest · Compodoc · GitHub Actions · Vercel

## Arquitectura

Patrón **MVVM** con separación de responsabilidades:

```
src/app
├── core/interceptors/   → interceptor HTTP (añade el token JWT de Supabase)
├── guards/              → authGuard, adminGuard, invitadoGuard (functional guards)
├── models/              → interfaces de datos (Model)
├── services/            → lógica y acceso a datos (Supabase, Firestore, exportación…)
├── shared/components/   → componentes reutilizables: data-table, stat-card, chart,
│                          image-picker, activity-feed, logo
├── shared/validators/   → validadores síncronos y asíncronos
└── pages/               → vistas (View + ViewModel con signals)
src/theme                → diseño en Sass: tokens, mixins y parciales (patrón 7-1)
supabase/                → scripts SQL e imágenes de prueba
```

- **Estado global predecible**: `AuthService` expone el usuario y el rol como *signals* de solo lectura.
- **Carga diferida (lazy loading)** de todas las páginas con `loadComponent`.
- **Consumo concurrente**: `Promise.all` (servicios Supabase) y `forkJoin` (API REST con `HttpClient`).
- **Componentes agnósticos**: reciben datos con `input()` y notifican con `output()`; `OnPush` en todos.
- **Sin fugas de memoria**: `takeUntilDestroyed`, `toSignal` y `ngOnDestroy` (gráficos e imágenes).

## Instalación y puesta en marcha

```bash
npm install
ionic serve          # desarrollo en http://localhost:8100
npm run build        # tests + compilación de producción + documentación
```

### 1. Supabase
1. En **Authentication → Users** crea `admin@inventapro.com` y `user@inventapro.com` (*Auto Confirm User*).
2. En **SQL Editor** ejecuta `supabase/01_esquema.sql` (solo en un proyecto nuevo) y después `supabase/02_ampliacion.sql`.
3. En **Storage → productos** sube las imágenes de `supabase/imagenes/`.
4. En **Authentication → Sign In / Providers → Email** desactiva *Confirm email* para que las cuentas nuevas entren al momento.
5. Copia la *Project URL* y la clave *publishable* en `src/environments/environment.ts` y `environment.prod.ts`.

### 2. Firebase (Firestore)
1. Crea un proyecto en Firebase y una base de datos **Firestore**.
2. Registra una app web y copia su configuración en el bloque `firebase` de los dos `environment`.
3. Reglas recomendadas (colección `actividad`: lectura libre, solo creación con campos válidos):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /actividad/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['tipo','mensaje','nivel','usuario','fecha'])
                    && request.resource.data.mensaje is string
                    && request.resource.data.mensaje.size() < 300;
      allow update, delete: if false;
    }
  }
}
```

### Credenciales de prueba
| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@inventapro.com | *ver PDF de entrega* |
| Usuario estándar | user@inventapro.com | *ver PDF de entrega* |

Las contraseñas no se publican en el repositorio por seguridad.

## Manual de usuario

### Iniciar sesión y crear cuenta
- Introduce email y contraseña y pulsa **Entrar**.
- ¿No tienes cuenta? Pulsa **Crear una cuenta**: la app comprueba al momento si el email ya existe, valida la contraseña (mín. 8 caracteres con letras y números) y crea la cuenta con rol *Usuario estándar*.

### Inicio
Resumen del inventario (productos, unidades, valor, stock bajo), productos a reponer, accesos rápidos y **actividad en directo**.

### Productos
Busca, filtra por stock o categoría, ordena por columnas y exporta a **CSV** o **PDF**. El administrador puede crear, editar (con imagen) y eliminar productos.

### Movimientos
Elige **Entrada** o **Salida**, el producto y la cantidad. El stock se actualiza solo; si queda por debajo del mínimo se genera una alerta para todos los usuarios.

### Cuadro de mando (Administrador)
Filtra por **periodo** y **categoría** y todos los indicadores y gráficos se recalculan al instante. Descarga el informe en PDF o CSV.

### Usuarios (Administrador)
Consulta las cuentas y cambia su rol con el icono de editar.

### Ayuda
Cada pantalla tiene un botón **?** que abre el manual por la sección correspondiente.

## Accesibilidad

- Contraste AA en textos y botones, tipografía en `rem` (escalable con el zoom del navegador).
- Navegación completa con teclado y **foco visible**.
- Etiquetas `aria-label`, `aria-live`, `aria-sort`, `role="progressbar"`, textos alternativos y descripción de los gráficos.
- Auditoría **Google Lighthouse**: Accessibility y Best Practices ≥ 90 (ver PDF de entrega). Sin errores en axe-core.

## Documentación técnica

Generada automáticamente con **Compodoc** a partir de los comentarios del código:
- En producción: **`/docs/index.html`** de la aplicación desplegada.
- En local: `npm run docs` (se crea en `www/docs`) o `npm run docs:serve`.

## Flujo de trabajo Git y despliegue

- `main` → producción (Vercel despliega automáticamente cada merge).
- `develop` → integración.
- `feature/*` → una rama por funcionalidad, unida a `develop` mediante **Pull Request**.
- **GitHub Actions** (`.github/workflows/ci.yml`) ejecuta tests y compilación en cada push y PR.
- El comando de build de Vercel (`npm run build`) también ejecuta los tests: **si fallan, no se despliega**.
