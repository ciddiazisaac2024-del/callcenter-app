# Guía de Instalación

## PASO 1 — PostgreSQL
Crear la base de datos (ver PASO 2 de la guía principal).

## PASO 2 — Backend
```bash
cd backend
npm install
# Editar .env con tu password de PostgreSQL
npm run seed
npm run dev
```

## PASO 3 — Frontend
```bash
cd frontend
npm install
npm run dev
```

## Verificar
- Backend:  http://localhost:3001/api/health
- Frontend: http://localhost:5173
- Swagger:  http://localhost:3001/api/docs

## Credenciales de prueba
- admin@callcenter.cl / Admin123!
- agente1@callcenter.cl / Agent123!
