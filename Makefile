# ─────────────────────────────────────────────────────────
# CallScript AI — Makefile
# Uso: make <comando>
# ─────────────────────────────────────────────────────────

.PHONY: help up down logs ps build seed test dev-db

# Mostrar ayuda
help:
	@echo ""
	@echo "  CallScript AI — Comandos disponibles"
	@echo "  ──────────────────────────────────────"
	@echo "  make up        → Levantar todos los servicios (producción)"
	@echo "  make down      → Detener todos los servicios"
	@echo "  make down-v    → Detener y borrar volúmenes (reset BD)"
	@echo "  make logs      → Ver logs en tiempo real"
	@echo "  make ps        → Estado de los contenedores"
	@echo "  make build     → Reconstruir imágenes"
	@echo "  make seed      → Cargar datos de prueba"
	@echo "  make test      → Correr tests del backend"
	@echo "  make dev-db    → Solo BD para desarrollo local"
	@echo ""

# Producción
up:
	@cp -n .env.example .env 2>/dev/null || true
	docker compose up -d
	@echo "✅ CallScript AI arriba en http://localhost"

down:
	docker compose down

down-v:
	docker compose down -v
	@echo "⚠️  Volúmenes eliminados — BD reseteada"

logs:
	docker compose logs -f

ps:
	docker compose ps

build:
	docker compose build --no-cache

# Seed — ejecuta dentro del contenedor backend
seed:
	docker compose exec backend node dist/config/seed.js

# Tests — ejecuta en el host (no en Docker)
test:
	cd backend && npm test

# Desarrollo — solo levanta la BD
dev-db:
	docker compose -f docker-compose.dev.yml up -d
	@echo "✅ BD disponible en localhost:5432"
	@echo "   Ahora corre: cd backend && npm run dev"
