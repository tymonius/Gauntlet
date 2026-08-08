.PHONY: config up down logs pull backup

config:
	docker compose config

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f app db

pull:
	docker compose pull

backup:
	@mkdir -p backups
	@docker compose exec -T db sh -c 'pg_dump -U "$$POSTGRES_USER" "$$POSTGRES_DB"' | gzip > "backups/listmonk-$$(date +%Y%m%d-%H%M%S).sql.gz"
	@echo "Database backup written under backups/."
