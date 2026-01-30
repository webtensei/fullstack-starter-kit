# Setup (Backend + Frontend)

## Prerequisites

- **Node.js**: 24+ (через `nvm`)
- **Yarn**
- **PostgreSQL**: 16+ (локально через Homebrew)

## 1) Install deps

```bash
cd /Users/accelera/Documents/fullstack-starter-kit
yarn install
```

## 2) Start PostgreSQL (Homebrew)

Установка и запуск:

```bash
brew install postgresql@16
brew services start postgresql@16
```

Проверка, что Postgres живой:

```bash
/opt/homebrew/opt/postgresql@16/bin/pg_isready
```

## 3) Create DB + user for local dev

Создаём роль `starter` и базу `starter`:

```bash
/opt/homebrew/opt/postgresql@16/bin/psql -d postgres -c "DO \$\$BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='starter') THEN CREATE ROLE starter WITH LOGIN PASSWORD 'starter' CREATEDB; END IF; END\$\$;"
/opt/homebrew/opt/postgresql@16/bin/psql -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='starter'" | grep -q 1 || /opt/homebrew/opt/postgresql@16/bin/createdb -O starter starter
```

## 4) Configure env

Скопируй `.env.example` → `.env` и проверь значения:

```bash
cp .env.example .env
```

Минимально нужно:

```env
DATABASE_URL="postgresql://starter:starter@localhost:5432/starter?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXP=5m
FRONTEND_URL=http://localhost:4200
PORT=3000
```

## 5) Prisma (generate + migrate)

```bash
yarn prisma:generate
yarn prisma:migrate --name init_auth
```

## 6) Run backend (Nest / Nx)

```bash
yarn dev:api
```

API будет на `http://localhost:3000`.

## 7) Run frontend (React / Nx)

```bash
yarn dev:web
```

Web будет на `http://localhost:4200`.

## 8) Quick smoke-check (auth)

```bash
curl -sS -X POST "http://localhost:3000/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"pass123"}'

curl -sS -c /tmp/auth.cookies -X POST "http://localhost:3000/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"pass123"}'

ACCESS="Bearer <paste_token_from_login_response>"
curl -sS -H "Authorization: $ACCESS" "http://localhost:3000/auth/me"

curl -sS -b /tmp/auth.cookies -c /tmp/auth.cookies -X POST "http://localhost:3000/auth/refresh"
curl -sS -b /tmp/auth.cookies -X POST "http://localhost:3000/auth/logout"
```

## Optional: Observability (SigNoz logs + traces)

This template includes an optional self-hosted SigNoz stack under `infra/signoz` and an OpenTelemetry integration in `apps/api`.

### Start SigNoz

```bash
yarn obs:up
```

Open SigNoz UI:
- `http://localhost:3301`

### Enable telemetry from `apps/api`

Ensure these vars exist in `.env`:

```env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=api
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs
DEPLOYMENT_ENV=development
```

Then run the API and make a request:

```bash
yarn dev:api
curl -i http://localhost:3000/health
```

In SigNoz you should see:
- **Traces** for service `api`
- **Logs** for requests (method/url/status/duration)

### Control volume (DX-friendly)

- **Trace sampling** (0..1):

```env
OTEL_TRACE_SAMPLE_RATE=1
```

- **Send only error-ish request logs to SigNoz** (example: only 4xx/5xx):

```env
OTEL_LOGS_MIN_STATUS=400
```

- **Sample request logs** (0..1):

```env
OTEL_LOGS_SAMPLE_RATE=0.2
```

## Notes

- Prisma 7 использует `prisma.config.ts` для `DATABASE_URL` (поэтому URL не хранится в `prisma/schema.prisma`).
- Если `brew` ставит `postgresql@16` как *keg-only*, команды выше используют абсолютные пути (`/opt/homebrew/opt/postgresql@16/bin/...`), чтобы не зависеть от PATH.

