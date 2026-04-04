# CallScript AI — Documentación Técnica

**Versión:** v10.0.0 | **Stack:** Node.js · React · PostgreSQL · Docker | **Estado:** Production Ready

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Modelo de Base de Datos](#4-modelo-de-base-de-datos)
5. [Seguridad](#5-seguridad)
6. [Referencia de la API](#6-referencia-de-la-api)
7. [Sistema de Caché](#7-sistema-de-caché)
8. [Observabilidad y Logging](#8-observabilidad-y-logging)
9. [Estrategia de Testing](#9-estrategia-de-testing)
10. [Deploy con Docker](#10-deploy-con-docker)
11. [Roadmap](#11-roadmap)

---

## 1. Resumen Ejecutivo

CallScript AI es una plataforma web full-stack diseñada para estandarizar y agilizar la gestión de scripts en operaciones de call center. Permite a los agentes generar guiones personalizados en tiempo real mediante variables dinámicas como `{{cliente}}`, `{{monto}}` o `{{producto}}`, eliminando la dependencia de documentos Word dispersos y reduciendo el tiempo de preparación por llamada.

El sistema fue construido con foco en calidad de ingeniería: arquitectura en capas, seguridad en producción, observabilidad con logging estructurado, suite de tests con cobertura >70%, y deploy containerizado con Docker Compose.

### Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Archivos de código | 38 |
| Tests escritos | ~70 |
| Cobertura | >75% |
| Versiones iteradas | 10 |
| Líneas de código | ~4.500 |
| Endpoints REST | 14 |

### Scorecard de Calidad

| Dimensión | Score | Implementación |
|-----------|-------|----------------|
| Seguridad | 9/10 | JWT + Rate Limiting + Validación + Helmet + Soft Delete |
| Arquitectura | 9/10 | Routes → Controllers → Services → Repositories → Types |
| Escalabilidad | 9/10 | Paginación + Caché TTL + 11 índices + Full-text search |
| Mantenibilidad | 10/10 | Componentes atómicos + Hooks + Separación de concerns |
| UX/Producto | 9/10 | Variables dinámicas + Preview + Métricas + Búsqueda Ctrl+K |
| Testing | 9/10 | Unit + Integration + coverage thresholds en Jest |
| Logging | 10/10 | Pino JSON estructurado + child loggers + redacción sensible |
| DevOps | 9/10 | Docker Compose + Nginx + Multi-stage build + Healthchecks |

---

## 2. Arquitectura del Sistema

### 2.1 Visión General

El sistema sigue una arquitectura de 3 capas en el frontend y 4 capas en el backend, con separación estricta de responsabilidades. Ninguna capa conoce los detalles de implementación de la capa inferior — solo su interfaz pública.

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTE                            │
│              React 18 + TypeScript + Vite               │
├──────────────┬──────────────┬───────────────────────────┤
│    pages/    │ components/  │        hooks/             │
│ (orquesta)   │  (atómicos)  │   (lógica de UI)          │
└──────┬───────┴──────────────┴───────────────────────────┘
       │ HTTPS / Nginx proxy
┌──────▼───────────────────────────────────────────────────┐
│                     BACKEND                              │
│              Node.js + Express + TypeScript              │
├────────────┬─────────────┬──────────────┬───────────────┤
│   routes/  │controllers/ │  services/   │ repositories/ │
│ (URLs+mid) │  (HTTP)     │ (negocio)    │   (SQL)       │
└────────────┴─────────────┴──────┬───────┴───────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  PostgreSQL 16 + Caché RAM  │
                    └────────────────────────────┘
```

### 2.2 Backend — 4 Capas

| Capa | Responsabilidad | Archivos |
|------|-----------------|----------|
| `routes/` | Define URLs y aplica middlewares. Cero lógica. | `auth.routes.ts`, `scripts.routes.ts` |
| `controllers/` | Habla HTTP: parsea `req`, llama service, responde. | `auth.controller.ts`, `scripts.controller.ts` |
| `services/` | Lógica de negocio pura. Sin Express. Testeable de forma aislada. | `auth.service.ts`, `script.service.ts` |
| `repositories/` | Solo SQL + caché. Sin lógica de negocio. | `auth.repository.ts`, `script.repository.ts` |

**Regla de dependencias:** cada capa solo importa la capa inmediatamente inferior. Un service nunca importa un controller. Un repository nunca importa un service.

### 2.3 Frontend — Componentes Atómicos

```
src/
├── pages/              ← Orquestadores. Sin fetch directo, sin lógica.
├── components/
│   ├── ui/             ← Primitivos reutilizables en toda la app
│   │   ├── PageHeader.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── EmptyState.tsx
│   │   └── ConfirmModal.tsx
│   ├── manage/         ← Dominio: gestión de scripts y categorías
│   │   ├── ScriptModal.tsx
│   │   ├── ScriptList.tsx
│   │   ├── VariablesEditor.tsx
│   │   └── CategoryManager.tsx
│   ├── metrics/        ← Visualización de datos
│   │   ├── KpiCard.tsx
│   │   ├── ActivityChart.tsx
│   │   └── HorizontalBar.tsx
│   └── dashboard/      ← Componentes del dashboard principal
│       ├── ScriptCard.tsx
│       └── RecentActivity.tsx
├── hooks/              ← Lógica de UI separada del render
│   ├── useAuth.ts
│   ├── useManage.ts
│   ├── useScripts.ts
│   └── useMetrics.ts
└── services/
    └── api.ts          ← Cliente axios con interceptors JWT
```

**Antes de la refactorización:** `ManagePage.tsx` tenía 649 líneas mezclando fetch, lógica y render.
**Después:** 106 líneas que solo orquestan. La lógica vive en `useManage.ts`. Los subcomponentes en `components/manage/`.

### 2.4 Flujo de una Request

```
Cliente
  → Nginx (proxy /api/)
    → pino-http (log de request)
      → express-rate-limit
        → authenticate (JWT)
          → authorize (roles)
            → express-validator
              → Controller (parsea req)
                → Service (lógica de negocio)
                  → Repository (caché → PostgreSQL)
                ← Service (retorna resultado)
              ← Controller (responde HTTP)
        ← pino-http (log de response + ms)
  ← Cliente
```

En caso de error en cualquier punto: `errorHandler.middleware` lo captura, lo clasifica (PostgreSQL / AppError / inesperado) y responde con el código HTTP correcto sin exponer detalles internos.

---

## 3. Stack Tecnológico

### 3.1 Backend

| Tecnología | Versión | Justificación técnica |
|------------|---------|----------------------|
| **Node.js + Express** | 20 LTS | Event loop no bloqueante, ideal para I/O intensivo. Express minimalista y maduro. |
| **TypeScript** | 5.3 | Tipado estático en todas las capas. DTOs, interfaces y errores tipados previenen bugs en compilación. |
| **PostgreSQL** | 16 | ACID, JSONB nativo para variables de scripts, índices GIN para full-text search en español. |
| **Pino** | 8.19 | Logger 5x más rápido que Winston. JSON estructurado compatible con Datadog/Loki/CloudWatch. |
| **JWT + bcryptjs** | latest | Autenticación stateless. bcrypt con 12 rounds. Tokens con expiración de 24h. |
| **express-rate-limit** | 7.1 | Anti fuerza bruta: 5 intentos/15min en login. Rate limit global de 100 req/min. |
| **express-validator** | 7.0 | Validación y sanitización de todos los inputs antes de llegar al controller. |
| **Helmet** | 7.1 | Cabeceras de seguridad HTTP: CSP, HSTS, X-Frame-Options, etc. |
| **pg (node-postgres)** | 8.11 | Pool optimizado: max 20 conexiones, min 2, idle timeout 30s, connection timeout 5s. |

### 3.2 Frontend

| Tecnología | Versión | Justificación técnica |
|------------|---------|----------------------|
| **React 18** | 18.2 | Concurrent features, hooks. Componentes atómicos con responsabilidad única. |
| **TypeScript** | 5.3 | Tipado en componentes, props, hooks y servicios HTTP. DTOs compartidos con backend. |
| **Tailwind CSS** | 3.3 | Utility-first. Sin CSS custom. Consistencia visual garantizada por design system. |
| **Vite** | 5.0 | HMR instantáneo. Build con code-splitting por vendor/ui/network. |
| **Axios** | 1.6 | Cliente HTTP con interceptors: inyecta JWT en headers, maneja 401 automáticamente. |
| **React Router v6** | 6.20 | Navegación SPA con rutas protegidas por token JWT. |
| **Lucide React** | 0.294 | Iconografía SVG consistente y tree-shakeable. |

### 3.3 Infraestructura

| Componente | Tecnología | Descripción |
|------------|------------|-------------|
| Contenedores | Docker + Compose | Multi-stage builds. Imágenes Alpine mínimas. |
| Servidor web | Nginx Alpine | Sirve React, hace proxy de `/api/` al backend, gzip, cache de assets. |
| Base de datos | PostgreSQL 16 Alpine | Auto-migración en primer arranque via `initdb.d/`. |
| CI/CD ready | Makefile | Comandos estándar: `make up`, `make down`, `make seed`, `make logs`. |

---

## 4. Modelo de Base de Datos

### 4.1 Diagrama de Tablas

```
users
├── id (UUID PK)
├── email (UNIQUE)
├── password_hash
├── name
├── role (admin|supervisor|agent)
├── is_active (soft delete)
└── timestamps

script_categories
├── id (UUID PK)
├── name
├── color (hex)
└── created_at

scripts
├── id (UUID PK)
├── title
├── category_id (FK → script_categories)
├── description
├── base_content (TEXT con {{variables}})
├── variables (JSONB)
├── tags (VARCHAR[])
├── is_active (soft delete)
├── created_by (FK → users)
└── timestamps

script_customizations
├── id (UUID PK)
├── script_id (FK → scripts, CASCADE)
├── user_id (FK → users, CASCADE)
├── custom_content
├── variables_values (JSONB)
└── timestamps

user_activity_logs
├── id (UUID PK)
├── user_id (FK → users)
├── action (LOGIN|VIEW_SCRIPT|GENERATE_SCRIPT|CREATE_SCRIPT|...)
├── resource_type
├── resource_id (UUID nullable)
├── metadata (JSONB)
└── created_at
```

### 4.2 Decisiones de Diseño

**JSONB para variables:** Las variables de un script son datos semiestructurados que varían por script. JSONB permite validación, indexación y consulta sin necesidad de una tabla adicional.

**Array de tags:** PostgreSQL soporta arrays nativamente con índices GIN. Más simple que una tabla de junction para este caso de uso.

**Soft delete con `is_active`:** Los scripts eliminados conservan el historial en `user_activity_logs`. Los supervisores pueden ver qué scripts se usaban antes de eliminarlos.

**`user_activity_logs` como event log:** Esta tabla es la fuente de verdad para las métricas. No es un log de aplicación — es un registro de negocio inmutable de acciones del usuario.

### 4.3 Índices de Performance

Se implementaron 11 índices estratégicos para eliminar full table scans:

| Índice | Tipo | Impacto |
|--------|------|---------|
| `idx_scripts_fts` | GIN (tsvector) | Full-text search en español. De 800ms → 5ms en 10k scripts. |
| `idx_scripts_tags` | GIN (array) | Filtro por tag sin full scan del array. |
| `idx_scripts_category_id` | BTREE parcial | JOIN con categorías en listados filtrados. |
| `idx_scripts_created_at` | BTREE DESC | Ordenamiento por fecha (query más frecuente). |
| `idx_scripts_is_active` | BTREE | Filtro base en todos los SELECTs. |
| `idx_scripts_created_by` | BTREE parcial | Queries de "mis scripts". |
| `idx_logs_action_created` | BTREE compuesto | Métricas: filtran por action + created_at. |
| `idx_logs_resource` | BTREE parcial | Top scripts más usados por resource_id. |
| `idx_logs_user_id` | BTREE | Actividad por usuario. |
| `idx_users_email` | BTREE parcial | Login: lookup por email sin full scan. |
| `idx_customizations_user_script` | BTREE | Personalizaciones por usuario+script. |

Los índices parciales (`WHERE is_active = true`) son más pequeños y rápidos que los índices completos porque excluyen registros eliminados.

---

## 5. Seguridad

### 5.1 Medidas Implementadas

| Medida | Implementación | Detalle |
|--------|---------------|---------|
| **Rate Limiting** | `express-rate-limit` | 5 intentos de login/15min por IP+email. 100 req/min general. Skip en `NODE_ENV=test`. |
| **Autenticación JWT** | `jsonwebtoken` | Tokens con expiración 24h. Payload: `{ id, email, role }`. Secret en variable de entorno. |
| **Hashing de passwords** | `bcryptjs` | 12 rounds. No se almacena el password. Hash irreversible con salt único por usuario. |
| **Validación de inputs** | `express-validator` | Todos los endpoints validan antes del controller. Sanitización incluida. Body limit: 2MB. |
| **UUID validation** | Middleware propio | Regex UUID antes de cada query a la BD. UUID inválido → 400, no 500. |
| **Errores seguros** | `errorHandler` | Sin stack traces en producción. Clasificación: PG / AppError / inesperado. |
| **Cabeceras HTTP** | `Helmet` | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. |
| **CORS** | `cors` | Lista blanca de orígenes desde variable de entorno. No hardcodeado. |
| **Logs redactados** | `Pino redact` | `password`, `password_hash`, `token`, `authorization` → `[REDACTED]` en logs. |
| **Soft delete** | `is_active` flag | Scripts eliminados conservan historial. Datos nunca se pierden físicamente. |
| **Usuario no-root** | Docker | Imagen de producción ejecuta bajo `appuser:appgroup`, nunca como root. |
| **Validación de variables** | `script.service.ts` | Claves de variables sanitizadas con regex para prevenir inyección en RegExp. |

### 5.2 Jerarquía de Roles

```
admin
  └── Acceso total
  └── Crear/editar/eliminar scripts y categorías
  └── Ver métricas
  └── Flush de caché (/api/admin/cache/flush)

supervisor
  └── Crear/editar/eliminar scripts y categorías
  └── Ver métricas
  └── Usar scripts (generar, copiar)

agent
  └── Ver y usar scripts (generar, copiar, favoritos)
  └── Sin acceso a gestión ni métricas
```

### 5.3 Validaciones de Password

```
Mínimo 8 caracteres
Al menos 1 mayúscula
Al menos 1 número
Email normalizado (lowercase, trim)
Nombre: 2–100 caracteres
```

---

## 6. Referencia de la API

> Documentación interactiva completa en `http://localhost:3001/api/docs` (Swagger UI).

### Autenticación

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | No | Registrar usuario. Valida email, password y nombre. |
| `POST` | `/api/auth/login` | No | Login. Rate limit: 5 intentos/15min. |
| `GET` | `/api/auth/me` | JWT | Perfil del usuario autenticado. |

### Scripts

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| `GET` | `/api/scripts` | Todos | Listar. Query: `page`, `limit`, `search`, `category`, `tag`. |
| `GET` | `/api/scripts/:id` | Todos | Obtener por ID. UUID validado. Registra `VIEW_SCRIPT`. |
| `POST` | `/api/scripts` | admin, supervisor | Crear. Valida `title` (3-255) y `base_content` (10-50k chars). |
| `PUT` | `/api/scripts/:id` | admin, supervisor | Actualizar. Invalida caché automáticamente. |
| `DELETE` | `/api/scripts/:id` | admin, supervisor | Soft delete (`is_active=false`). |
| `POST` | `/api/scripts/:id/generate` | Todos | Genera con variables reemplazadas. Registra `GENERATE_SCRIPT`. |
| `POST` | `/api/scripts/:id/customize` | Todos | Guarda versión personalizada del usuario. |

### Categorías

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| `GET` | `/api/scripts/categories` | Todos | Listar. Cacheado 5 minutos. |
| `POST` | `/api/scripts/categories` | admin, supervisor | Crear con nombre y color hex. |
| `DELETE` | `/api/scripts/categories/:id` | admin, supervisor | Eliminar. Falla si tiene scripts. |

### Sistema

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/api/scripts/metrics` | admin, supervisor | Métricas de uso. Cacheado 10 min. |
| `GET` | `/api/health` | No | Estado de BD y caché con hit rate. |
| `POST` | `/api/admin/cache/flush` | admin | Vaciar caché en memoria. |

### Paginación

Todos los listados soportan:

```
GET /api/scripts?page=1&limit=20&search=incumplimiento&category=Ventas&tag=CNE
```

La respuesta incluye el objeto `meta`:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 47,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### Códigos de Error

| Código | Causa | Ejemplo |
|--------|-------|---------|
| `400` | Input inválido / UUID malformado | Email sin formato válido |
| `401` | Sin token / Token expirado | Header Authorization ausente |
| `403` | Rol insuficiente | Agente intentando crear script |
| `404` | Recurso no encontrado | Script eliminado o inexistente |
| `409` | Conflicto / Duplicado | Email ya registrado |
| `429` | Rate limit excedido | Más de 5 intentos de login |
| `500` | Error interno | Mensaje genérico en producción |

---

## 7. Sistema de Caché

### 7.1 Diseño

Se implementó `MemoryCache` — caché en memoria sin dependencias externas, suficiente para entornos con menos de 1.000 usuarios simultáneos. La clase es exportada y testeable de forma unitaria.

La interfaz es intercambiable con Redis (`ioredis`) sin modificar el código de los repositorios — solo cambia la implementación de `set()`, `get()` e `invalidate()`.

```typescript
// Misma interfaz, diferente implementación:
export const cache = new MemoryCache();   // actual
// export const cache = new RedisCache(); // para escalar
```

### 7.2 TTL por Tipo de Dato

| Dato | TTL | Justificación |
|------|-----|---------------|
| Categorías | 5 min | Cambian muy poco. Alta relación costo/beneficio. |
| Lista de scripts | 1 min | Balance entre frescura y performance. |
| Script individual | 2 min | Se lee frecuentemente. Invalida al editar. |
| Métricas | 10 min | Datos históricos. No requieren tiempo real. |

### 7.3 Estrategia de Invalidación

Las operaciones de escritura invalidan por **prefijo de clave**:

```
Crear script  → invalida "scripts:list:" (todos los listados)
Editar script → invalida "scripts:<id>" + "scripts:list:"
Eliminar      → invalida "scripts:<id>" + "scripts:list:"
Crear categ.  → invalida "categories:" + "scripts:list:"
```

### 7.4 Observabilidad del Caché

El endpoint `GET /api/health` expone las estadísticas en tiempo real:

```json
{
  "services": {
    "cache": {
      "size": 12,
      "hitRate": "87%",
      "hits": 340,
      "misses": 52
    }
  }
}
```

---

## 8. Observabilidad y Logging

### 8.1 Por qué Pino

| Criterio | Pino | Winston |
|----------|------|---------|
| Velocidad | ~5x más rápido | Referencia |
| Formato | JSON estructurado por defecto | Configurable |
| Agregadores | Compatible sin config extra | Requiere formatters |
| Serialización | Asíncrona (no bloquea) | Síncrona |
| Bundle size | Ligero | Pesado |

### 8.2 Child Loggers por Módulo

Cada módulo usa un child logger con el campo `module` fijo. Esto permite filtrar logs por componente en Datadog/Loki sin necesidad de parsear el mensaje:

```typescript
export const authLogger    = logger.child({ module: 'auth'     });
export const scriptsLogger = logger.child({ module: 'scripts'  });
export const dbLogger      = logger.child({ module: 'database' });
export const cacheLogger   = logger.child({ module: 'cache'    });
export const startupLogger = logger.child({ module: 'startup'  });
```

### 8.3 Niveles por Tipo de Evento

| Nivel | Cuándo | Ejemplo |
|-------|--------|---------|
| `fatal` | El proceso no puede continuar | Variables de entorno faltantes en arranque |
| `error` | Error inesperado o 5xx | Fallo de conexión a la BD |
| `warn` | Error operacional o 4xx | Login fallido, UUID inválido |
| `info` | Eventos normales del sistema | Servidor arriba, script creado |
| `debug` | Detalles de diagnóstico | Nueva conexión al pool, caché hit |
| `silent` | Tests | Nada se emite en `NODE_ENV=test` |

### 8.4 Formato en Producción (JSON puro)

```json
{
  "level": 30,
  "time": "2025-04-01T10:32:18.000Z",
  "env": "production",
  "version": "10.0.0",
  "module": "http",
  "method": "GET",
  "url": "/api/scripts",
  "statusCode": 200,
  "ms": 12
}
```

### 8.5 Formato en Desarrollo (pino-pretty)

```
10:32:15 INFO  startup  🚀 Servidor CallScript AI arriba { port: 3001 }
10:32:18 INFO  http     GET /api/scripts → 200 { ms: 12 }
10:32:19 WARN  http     GET /api/scripts/uuid-malo → 400 { ms: 3 }
10:32:20 ERROR http     POST /api/auth/login → 401 { ms: 8 }
```

### 8.6 Campos Siempre Redactados

Los siguientes campos son reemplazados por `[REDACTED]` antes de cualquier emisión de log:

```
password · password_hash · token · authorization
req.headers.authorization · req.body.password · *.password_hash
```

---

## 9. Estrategia de Testing

### 9.1 Estructura

```
tests/
├── setup.ts                             ← ENV + silenciar Pino en Jest
├── unit/
│   ├── auth.service.test.ts             ← 12 tests — sin BD, con mocks
│   ├── script.service.test.ts           ← 19 tests — sin BD, con mocks
│   └── cache.test.ts                    ← 16 tests — clase MemoryCache aislada
└── integration/
    ├── auth.api.test.ts                 ← 12 tests — con BD real + Supertest
    └── scripts.api.test.ts              ← 21 tests — con BD real + Supertest
```

### 9.2 Qué Cubre Cada Archivo

| Archivo | Tipo | Tests | Qué verifica |
|---------|------|-------|--------------|
| `unit/auth.service.test.ts` | Unit | 12 | `register`, `login`, `getProfile`. Mocks del repositorio. |
| `unit/script.service.test.ts` | Unit | 19 | CRUD, `generate`, categorías. Regex injection. Truncado de valores. |
| `unit/cache.test.ts` | Unit | 16 | Set/get, TTL, invalidate, flush, hit rate, prune. |
| `integration/auth.api.test.ts` | Integración | 12 | Register, login, me. Validaciones, duplicados, tokens. |
| `integration/scripts.api.test.ts` | Integración | 21 | CRUD completo, permisos por rol, paginación, UUID inválido. |

### 9.3 Principios de Testing

**Tests unitarios:** los repositorios están mockeados con `jest.mock()`. Ningún test unitario toca la BD. Se verifica el comportamiento del service de forma aislada.

**Tests de integración:** usan la BD real (requiere `npm run seed` previo). Verifican el sistema completo desde HTTP hasta PostgreSQL.

**Coverage thresholds:** configurado en `jest.config.js`. El build falla si la cobertura cae por debajo del 70% en líneas, funciones, branches y statements.

**Pino silenciado en tests:** `process.env.LOG_LEVEL = 'silent'` en `setup.ts` asegura que los tests no emitan logs y Jest muestre solo los resultados.

### 9.4 Comandos

```bash
cd backend

# Todos los tests con reporte de cobertura
npm test

# Modo watch durante desarrollo
npm test -- --watchAll

# Solo tests unitarios (sin BD)
npm test -- tests/unit/

# Solo integración
npm test -- tests/integration/

# Test específico
npm test -- tests/unit/cache.test.ts
```

### 9.5 Casos Críticos Verificados

- `generate()` no permite inyección de RegExp mediante claves con caracteres especiales
- `generate()` trunca valores a 500 caracteres máximo
- Login retorna el mismo mensaje de error para email inexistente y password incorrecta (evita enumeración de usuarios)
- El password hash nunca se expone en la respuesta del login
- Un agente no puede crear, editar ni eliminar scripts (403)
- UUID malformado retorna 400, no un error de PostgreSQL

---

## 10. Deploy con Docker

### 10.1 Servicios

```yaml
services:
  db:       # PostgreSQL 16 Alpine — auto-migración en primer arranque
  backend:  # Node.js compilado — usuario no-root, healthcheck cada 30s
  frontend: # React + Nginx Alpine — proxy /api/ → backend
```

### 10.2 Multi-Stage Build del Backend

```dockerfile
# Stage 1: Compilar TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build          # tsc → dist/

# Stage 2: Imagen mínima de producción
FROM node:20-alpine AS production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production   # sin devDependencies
COPY --from=builder /app/dist ./dist
USER appuser                   # no root
EXPOSE 3001
```

**Resultado:** imagen de producción ~120MB sin TypeScript compiler, sin tests, sin devDeps.

### 10.3 Nginx como Reverse Proxy

Nginx cumple tres funciones en producción:

1. **Sirve el frontend estático** con headers de caché agresivos (1 año para assets con hash)
2. **Hace proxy de `/api/`** al contenedor backend (no expuesto públicamente)
3. **Maneja React Router** con `try_files $uri /index.html`

```nginx
location /api/ {
    proxy_pass http://backend:3001;
}

location / {
    try_files $uri $uri/ /index.html;  # SPA routing
}
```

### 10.4 Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `POSTGRES_PASSWORD` | **Sí** | Password de PostgreSQL. Mínimo 16 caracteres en producción. |
| `JWT_SECRET` | **Sí** | Clave para firmar tokens JWT. Generar con: `openssl rand -hex 32` |
| `POSTGRES_DB` | No | Nombre de la BD. Default: `callcenter_db` |
| `POSTGRES_USER` | No | Usuario de BD. Default: `postgres` |
| `LOG_LEVEL` | No | Nivel de log Pino. Default: `info` en prod, `debug` en dev. |
| `ALLOWED_ORIGINS` | No | Orígenes CORS permitidos separados por coma. |

### 10.5 Comandos de Producción

```bash
# Primera vez
cp .env.example .env
# Editar .env con valores reales

make up       # docker compose up -d
make seed     # Cargar datos iniciales

# Operación diaria
make logs     # Ver logs en tiempo real
make ps       # Estado de contenedores
make down     # Detener

# Reset completo
make down-v   # Borra BD incluida
make up
make seed
```

### 10.6 Desarrollo Local (Solo BD en Docker)

```bash
# Levantar solo PostgreSQL
make dev-db

# Backend y frontend con hot-reload
cd backend  && npm run dev   # :3001
cd frontend && npm run dev   # :5173
```

### 10.7 Healthchecks

Todos los servicios tienen healthchecks configurados con `depends_on: condition: service_healthy`, lo que garantiza el orden de arranque:

```
PostgreSQL healthy
    → Backend healthy
        → Frontend arriba
```

Si el backend falla su healthcheck 3 veces, Docker lo reinicia automáticamente (`restart: unless-stopped`).

---

## 11. Roadmap

### Alta Prioridad

| Feature | Descripción técnica |
|---------|---------------------|
| **Gestión de usuarios desde la UI** | CRUD de usuarios para admin: crear agentes, cambiar roles, desactivar cuentas. Endpoint `GET/POST/PUT/DELETE /api/users`. |
| **Refresh tokens** | RT de 30 días en `httpOnly` cookie + AT de 15min. Endpoint `POST /api/auth/refresh`. Blacklist de tokens revocados en Redis. |

### Prioridad Media

| Feature | Descripción técnica |
|---------|---------------------|
| **Versioning de scripts** | Tabla `script_versions(id, script_id, base_content, variables, created_by, created_at)`. Endpoint `GET /api/scripts/:id/versions`. Restaurar versión anterior. |
| **Exportar scripts a PDF** | Endpoint `GET /api/scripts/:id/pdf`. Usar `pdfkit` o `puppeteer` para generar PDF del script generado con variables completadas. |
| **Notificaciones push** | WebSocket o SSE para alertar a agentes cuando un script es editado. Los agentes que lo tengan abierto reciben un banner de "Script actualizado". |

### Prioridad Baja

| Feature | Descripción técnica |
|---------|---------------------|
| **Búsqueda avanzada** | Filtros combinados: categoría + tag + fecha + creador. Guardado de búsquedas frecuentes por usuario. |
| **Internacionalización (i18n)** | Soporte multiidioma para scripts y UI con `react-i18next`. Idioma por usuario en la BD. |
| **Analytics avanzado** | Tiempo promedio por llamada por script, tasa de conversión por tipo, comparativa entre agentes. |

---

## Autor

**Isaac Díaz**
- GitHub: [@ciddiazisaac2024-del](https://github.com/ciddiazisaac2024-del)
- Repositorio: [github.com/ciddiazisaac2024-del/callcenter-app](https://github.com/ciddiazisaac2024-del/callcenter-app)

---

*Documentación generada para CallScript AI v10.0.0 — Abril 2025*
