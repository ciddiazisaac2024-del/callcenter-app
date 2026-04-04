<div align="center">

# 📞 CallScript AI

### Generador inteligente de scripts para Call Center

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.3-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

**Plataforma full-stack para automatizar y estandarizar la gestión de scripts en operaciones de call center.**

[Características](#-características) · [Demo](#-demo) · [Stack](#-stack-tecnológico) · [Instalación](#-instalación) · [Arquitectura](#-arquitectura)

</div>

---

## 📋 Changelog

### v8.0.0 — Security & Robustness
- **[Security]** Verificación de sesión al iniciar la app via `GET /auth/me` — el rol del usuario se confirma desde el backend, no desde localStorage
- **[Security]** `ProtectedRoute` ahora usa el contexto de auth reactivo en lugar de leer `localStorage` directamente
- **[Security]** Endpoint `POST /api/admin/cache/flush` protegido con JWT + rol `admin`
- **[Security]** CORS configurado desde variable de entorno `ALLOWED_ORIGINS`
- **[Security]** Validación de variables de entorno obligatorias al arrancar (`JWT_SECRET`, `DATABASE_URL`)
- **[Backend]** `saveCustomization` movido del controller al `ScriptRepository` — consistencia arquitectónica
- **[Backend]** `update()` y `softDelete()` en el repository son ahora operaciones atómicas — eliminada la race condition del patrón `exists() + query()`
- **[Backend]** `logActivity()` loggea errores a stderr en lugar de silenciarlos
- **[Frontend]** `baseURL` del API leída desde `VITE_API_URL` env var
- **[Frontend]** `saveScript` y `deleteScript` en `useManage` tienen manejo completo de errores con toast

---


## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| [Documentación Técnica](./docs/TECHNICAL_DOCS.md) | Arquitectura, stack, BD, seguridad, API, caché, logging, testing y deploy |
| [Swagger UI](http://localhost:3001/api/docs) | Referencia interactiva de la API (servidor corriendo) |

---

## 🎯 El problema que resuelve

Los equipos de call center dependen de scripts para garantizar calidad y consistencia en cada llamada. Sin embargo, la mayoría los gestiona en documentos Word o Excel dispersos — sin variables dinámicas, sin control de versiones y sin métricas de uso.

**CallScript AI** centraliza todos los scripts en una plataforma web moderna:

- El agente elige un script, completa campos como `{{cliente}}` o `{{monto}}`, y el texto final se genera en tiempo real — listo para pegar en el CRM en 1 clic
- El supervisor crea y edita scripts desde la UI, ve métricas de uso y gestiona categorías
- El sistema registra toda la actividad para análisis posteriores

---

## ✨ Características

### Para Agentes
| Feature | Descripción |
|---------|-------------|
| 📋 Biblioteca centralizada | Scripts organizados por categoría con búsqueda instantánea |
| ⚡ Variables dinámicas | Campos como `{{cliente}}`, `{{monto}}`, `{{producto}}` con preview en tiempo real |
| 📋 Copiar al CRM | 1 clic — el script generado va directo al portapapeles |
| ⭐ Favoritos | Marca tus scripts más usados para acceso rápido |
| 🔍 Búsqueda `Ctrl+K` | Búsqueda full-text instantánea con historial reciente |
| 📜 Historial local | Acceso rápido a los últimos scripts usados |

### Para Supervisores y Admins
| Feature | Descripción |
|---------|-------------|
| ➕ Gestión completa | Crear, editar y eliminar scripts desde la UI |
| 🏷️ Categorías | Gestión de categorías con colores personalizados |
| 📊 Panel de métricas | Scripts más usados, actividad diaria, crecimiento semanal por categoría |
| 👥 Control de roles | `agent` / `supervisor` / `admin` con permisos granulares |

---

## 📊 Demo

### Scripts incluidos (seed)
| Script | Categoría | Variables |
|--------|-----------|-----------|
| Gestión de Incumplimiento de Pago | Soporte Técnico | cliente, monto, cuotas, producto, fecha_límite |
| Afiliación CNE — Primer Contacto | Ventas | cliente, empresa, cargo, beneficio_interés, renta |
| Retención — Solicitud de Baja | Retención | cliente, producto, tiempo_contrato, motivo_baja, oferta |
| Cierre de Venta — Seguro de Vida | Ventas | cliente, plan, beneficiario, fecha_inicio, forma_pago |
| Encuesta de Calidad Post-Llamada | Bienvenida | cliente, motivo_llamada, agente_anterior |
| Llamada de Bienvenida | Bienvenida | cliente, producto, fecha_contratación, agente_venta |

### Credenciales de prueba
| Email | Password | Rol |
|-------|----------|-----|
| `admin@callcenter.cl` | `Admin123!` | Admin |
| `supervisor@callcenter.cl` | `Agent123!` | Supervisor |
| `agente1@callcenter.cl` | `Agent123!` | Agente |

---

## 🏗️ Arquitectura

### Backend — 4 capas con responsabilidades separadas

```
src/
├── routes/          → Define URLs y middlewares. Solo eso.
├── controllers/     → Habla HTTP: lee req, llama service, responde.
├── services/        → Lógica de negocio pura. Sin Express. Testeable.
├── repositories/    → Solo SQL. Sin lógica.
├── middlewares/     → Auth JWT, rate limiting, validación, errores.
├── types/           → Interfaces y DTOs compartidos entre capas.
└── config/          → DB pool, caché, Swagger, seed, migraciones.
```

### Frontend — Componentes atómicos + hooks personalizados

```
src/
├── pages/           → Solo orquestan — sin fetch, sin lógica de negocio.
├── components/
│   ├── ui/          → Primitivos reutilizables (PageHeader, EmptyState...)
│   ├── manage/      → ScriptModal, ScriptList, VariablesEditor, CategoryManager
│   ├── metrics/     → KpiCard, ActivityChart, HorizontalBar
│   └── dashboard/   → ScriptCard, RecentActivity
├── hooks/           → useManage, useScripts, useMetrics, useAuth
├── services/        → Cliente HTTP con interceptors JWT
└── types/           → Interfaces TypeScript compartidas
```

### Base de datos

```sql
users                 → Usuarios con roles y autenticación
scripts               → Scripts con variables JSONB y soft delete
script_categories     → Categorías con color personalizado
script_customizations → Versiones por usuario
user_activity_logs    → Auditoría completa (base de métricas)
```

---

## 🔐 Seguridad implementada

| Medida | Detalle |
|--------|---------|
| Rate limiting | Máx 10 intentos de login / 15 min por IP |
| Bcrypt | Passwords hasheados (12 rounds) |
| JWT | Tokens con expiración de 24h |
| Validación | express-validator en todos los endpoints |
| Errores seguros | Sin stack traces en producción |
| UUID validation | Middleware antes de cualquier query a la BD |
| Body limit | Payloads limitados a 2MB |
| Helmet | Headers de seguridad HTTP |
| CORS | Configurado por origen |
| Soft delete | Scripts eliminados conservan historial |

---

## ⚡ Escalabilidad

| Mejora | Detalle |
|--------|---------|
| Paginación | `GET /scripts?page=1&limit=20` |
| Full-text search | `tsvector + GIN` en PostgreSQL (reemplaza `ILIKE`) |
| Caché en memoria | TTL por tipo: categorías 5min, scripts 1min, métricas 10min |
| 11 índices SQL | Eliminan full table scans en queries frecuentes |
| Pool optimizado | `max: 20`, `min: 2`, timeout configurable |

---

## 🚀 Instalación

### Prerrequisitos
- Node.js 20+
- PostgreSQL 14+

### 1 — Clonar
```bash
git clone https://github.com/ciddiazisaac2024-del/callcenter-app.git
cd callcenter-app
```

### 2 — Base de datos
```sql
-- En psql:
CREATE DATABASE callcenter_db;
\c callcenter_db;
-- Ejecutar: backend/src/config/migrations.sql
```

### 3 — Backend
```bash
cd backend
cp .env.example .env
# Editar .env con tu password de PostgreSQL
npm install
npm run seed   # Carga scripts y usuarios de prueba
npm run dev    # http://localhost:3001
```

### 4 — Frontend
```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

### Verificar
| URL | Resultado |
|-----|-----------|
| `localhost:3001/api/health` | `{"status":"ok","version":"6.0.0"}` |
| `localhost:3001/api/docs` | Swagger UI |
| `localhost:5173` | Login |

---

## 🔧 Stack Tecnológico

### Backend
| Tecnología | Uso |
|------------|-----|
| Node.js + Express | Servidor HTTP |
| TypeScript | Tipado estático en todas las capas |
| PostgreSQL + pg | Base de datos con pool de conexiones |
| JWT + bcryptjs | Autenticación |
| express-rate-limit | Anti fuerza bruta |
| express-validator | Validación y sanitización |
| Swagger UI | Documentación interactiva |
| Jest + Supertest | Tests unitarios e integración |

### Frontend
| Tecnología | Uso |
|------------|-----|
| React 18 | UI con hooks |
| TypeScript | Tipado en componentes y hooks |
| Tailwind CSS | Estilos |
| Vite | Bundler |
| Axios | HTTP con interceptors |
| React Router v6 | Navegación SPA |
| React Hot Toast | Notificaciones |
| Lucide React | Iconos |

---

## 📡 API Endpoints

```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me

GET    /api/scripts                  ?page, limit, search, category, tag
GET    /api/scripts/:id
POST   /api/scripts                  (supervisor/admin)
PUT    /api/scripts/:id              (supervisor/admin)
DELETE /api/scripts/:id              (supervisor/admin)
POST   /api/scripts/:id/generate
POST   /api/scripts/:id/customize

GET    /api/scripts/categories
POST   /api/scripts/categories       (supervisor/admin)
DELETE /api/scripts/categories/:id   (supervisor/admin)

GET    /api/scripts/metrics          (supervisor/admin)
GET    /api/health
```

Documentación completa en `http://localhost:3001/api/docs`

---


---

## 🐳 Docker

### Producción completa (BD + Backend + Frontend)

```bash
# 1. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# 2. Levantar todos los servicios
make up
# o: docker compose up -d

# 3. Cargar datos de prueba (primera vez)
make seed
```

Abre **http://localhost** — Nginx sirve el frontend y hace proxy a la API.

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend | `:80` | React + Nginx |
| Backend  | `:3001` (interno) | API REST |
| PostgreSQL | `:5432` (solo localhost) | BD |

### Desarrollo local (solo BD en Docker)

```bash
# Levantar solo la BD
make dev-db

# Backend y frontend con hot-reload
cd backend  && npm run dev   # :3001
cd frontend && npm run dev   # :5173
```

### Comandos útiles

```bash
make logs     # Ver logs en tiempo real
make ps       # Estado de contenedores
make down     # Detener servicios
make down-v   # Reset completo (borra BD)
make build    # Reconstruir imágenes
```

---
## 🗺️ Roadmap

- [ ] Gestión de usuarios desde la UI
- [ ] Refresh tokens y revocación de sesiones
- [ ] Versioning de scripts (historial de cambios)
- [ ] Exportar scripts a PDF
- [ ] Docker Compose para deploy
- [ ] Notificaciones push cuando un script cambia

---

## 👤 Autor

**Isaac Díaz**
- GitHub: [@ciddiazisaac2024-del](https://github.com/ciddiazisaac2024-del)

---

<div align="center">

Construido con TypeScript, React y PostgreSQL

**v6.0.0** — Arquitectura en capas · Caché · Índices · Componentes atómicos

</div>
