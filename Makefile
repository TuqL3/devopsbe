
.PHONY: help build up down restart ps logs logs-server logs-db \
        shell migrate migrate-status db-shell test lint typecheck clean

.DEFAULT_GOAL := help

help:
	@echo "Available commands:"
	@echo "  make build          Build Docker images"
	@echo "  make up             Start services"
	@echo "  make down           Stop and remove containers"
	@echo "  make restart        Restart backend"
	@echo "  make ps             Show service status"
	@echo "  make logs           Follow all logs"
	@echo "  make logs-server    Follow backend logs"
	@echo "  make logs-db        Follow database logs"
	@echo "  make shell          Open shell in backend container"
	@echo "  make migrate        Apply existing Prisma migrations"
	@echo "  make migrate-status Check migration status"
	@echo "  make db-shell       Open PostgreSQL shell"
	@echo "  make test           Run backend tests"
	@echo "  make lint           Run ESLint"
	@echo "  make typecheck      Run TypeScript type check"
	@echo "  make clean          Remove containers (keep DB volume)"

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart server

ps:
	docker compose ps

logs:
	docker compose logs -f

logs-server:
	docker compose logs -f server

logs-db:
	docker compose logs -f db

shell:
	docker compose exec server sh

migrate:
	docker compose exec server npx prisma migrate deploy

migrate-status:
	docker compose exec server npx prisma migrate status

db-shell:
	docker compose exec db psql -U postgres -d testdb

test:
	docker compose exec server npm test

lint:
	docker compose exec server npm run lint

typecheck:
	docker compose exec server npm run type-check

clean:
	docker compose down
