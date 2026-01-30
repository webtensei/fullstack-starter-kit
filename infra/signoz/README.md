# SigNoz (self-host) for this template

This folder contains a local **SigNoz** stack (ClickHouse-based) and is designed to work with `apps/api` via **OTLP**.

## Start / stop

From repo root:

```bash
yarn obs:up
```

SigNoz UI will be available at `http://localhost:3301`.

To stop:

```bash
yarn obs:down
```

## Connect `apps/api`

Set these env vars (see `.env.example`):

- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces`
- `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs`
- `OTEL_SERVICE_NAME=api`

Then run:

```bash
yarn dev:api
```

Now you should see:
- **Traces**: `api` service under APM/Traces in SigNoz
- **Logs**: request logs (method/url/status/duration) under Logs

## Notes

- Persisted data is stored in `infra/signoz/data` (ignored by git).
- Request logs are still printed as JSON to stdout (local dev) and also exported to SigNoz via OTLP logs.

