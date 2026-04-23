# Melody

## Frontend Docker setup

### Dev

```bash
cd deploy
docker compose -f docker-compose-dev.yml up --build
```

- App: http://localhost:5173

Stop:

```bash
docker compose -f docker-compose-dev.yml down
```

### Prod

```bash
cd deploy
docker compose -f docker-compose-prod.yml up --build
```

- App: http://localhost:3000

Stop:

```bash
docker compose -f docker-compose-prod.yml down
```
