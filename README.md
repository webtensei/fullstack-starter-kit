# Fullstack Starter Kit

Modern fullstack starter template with **React** (FSD architecture), **NestJS**, **Prisma**, and **NX** monorepo.

## 🚀 Tech Stack

- **Monorepo**: NX 22.4+
- **Frontend**: React 19 + Vite + Feature-Sliced Design (FSD)
- **Backend**: NestJS 11 + Prisma 7 + PostgreSQL
- **Package Manager**: Yarn
- **TypeScript**: Latest

## 📁 Project Structure

```
fullstack-starter-kit/
├── apps/
│   ├── web/          # React frontend (FSD architecture)
│   └── api/          # NestJS backend
├── libs/
│   └── shared/       # Shared types between frontend & backend
├── prisma/           # Prisma schema and migrations
└── .cursor/rules/    # Cursor AI rules for better DX
```

## 🏗️ Architecture

### Frontend (FSD)

Follows **Feature-Sliced Design** methodology with layers:
- `app/` - Application initialization, routing
- `pages/` - Full pages
- `widgets/` - Large UI blocks
- `features/` - Reusable features
- `entities/` - Business entities
- `shared/` - Shared UI, utilities, API

**Import rules**: Lower layers can only import from layers below them.

### Backend (NestJS)

Modular architecture:
- `modules/` - Domain modules (users, products, etc.)
- `common/` - Shared utilities, Prisma service
- `config/` - Configuration modules

### Shared Types

All types shared between frontend and backend are in `libs/shared/`. Import using `@shared` alias.

## 🛠️ Getting Started

### Prerequisites

- Node.js 24+ (via nvm)
- PostgreSQL 14+
- Yarn

### Installation

```bash
# Install dependencies
yarn install

# Copy environment variables
cp .env.example .env
# Edit .env and set your DATABASE_URL and JWT_SECRET

# Generate Prisma Client
yarn prisma:generate

# Run database migrations (creates tables)
yarn prisma:migrate
```

**Note**: Prisma 7 uses `prisma.config.ts` for database connection. The schema file no longer contains the `url` field.

### Development

```bash
# Start frontend (port 4200)
yarn dev:web

# Start backend (port 3000)
yarn dev:api

# Build all
yarn build

# Run tests
yarn test

# View dependency graph
yarn graph
```

## 📝 Available Scripts

- `yarn dev:web` - Start React dev server
- `yarn dev:api` - Start NestJS dev server
- `yarn build` - Build all apps
- `yarn build:web` - Build frontend only
- `yarn build:api` - Build backend only
- `yarn test` - Run tests
- `yarn lint` - Lint code
- `yarn graph` - View NX dependency graph
- `yarn prisma:generate` - Generate Prisma Client
- `yarn prisma:migrate` - Run database migrations
- `yarn prisma:studio` - Open Prisma Studio
- `yarn obs:up` - Start SigNoz (self-host) for logs/traces
- `yarn obs:down` - Stop SigNoz
- `yarn obs:ps` - Show SigNoz containers status
- `yarn obs:logs` - Tail SigNoz containers logs

## 📈 Observability (optional, self-hosted in this repo)

This template can run **SigNoz** locally from the repo (`infra/signoz`) and send:
- **Traces** (OpenTelemetry)
- **Request logs** (optional) to the same place

### Start SigNoz

```bash
yarn obs:up
```

Open UI:
- `http://localhost:3301`

### Send telemetry from `apps/api`

Telemetry is controlled by `.env` variables (see `.env.example`).

- To disable all telemetry network traffic:
  - set `OTEL_ENABLED=false`
- By default **request log export is disabled** in `.env.example`:
  - set `OTEL_LOGS_ENABLED=true` to send request logs to SigNoz

Volume controls:
- `OTEL_TRACE_SAMPLE_RATE` (0..1)
- `OTEL_LOGS_MIN_STATUS` (e.g. 400 = only 4xx/5xx)
- `OTEL_LOGS_SAMPLE_RATE` (0..1)

## 🎯 Cursor AI Rules

This project includes Cursor AI rules for:
- **Frontend FSD** (`apps/web/**`) - FSD architecture guidelines
- **Backend NestJS** (`apps/api/**`) - NestJS best practices
- **Shared Types** (`libs/shared/**`) - Type sharing conventions

Rules are automatically applied when working with matching files.

## 🔐 Authentication

The API includes a complete authentication system:

- **Registration**: `POST /auth/register` - Create new user account
- **Login**: `POST /auth/login` - Get access token and refresh token (in cookie)
- **Refresh**: `POST /auth/refresh` - Refresh access token using refresh token from cookie
- **Logout**: `POST /auth/logout` - Invalidate refresh token
- **Get Current User**: `GET /auth/me` - Get current user info (requires JWT)

### Protected Routes

Use `@UseGuards(JwtAuthGuard)` to protect routes:

```typescript
@Get('protected')
@UseGuards(JwtAuthGuard)
async protectedRoute(@CurrentUser() user: JwtPayload) {
  return { message: `Hello ${user.username}` };
}
```

### Role-Based Access Control

Use `@Roles()` decorator with `RolesGuard` for role-based access:

```typescript
@Get('admin-only')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
async adminRoute() {
  return { message: 'Admin only' };
}
```

## 📚 Key Conventions

### Shared Types

**CRITICAL**: All types used by both frontend and backend MUST be in `@shared`:

```typescript
// ✅ CORRECT
import { LoginDto, RegisterDto, JwtPayload } from '@shared';

// ❌ WRONG - Don't duplicate types
```

### FSD Import Rules

- Pages can import from: widgets, features, entities, shared
- Widgets can import from: features, entities, shared
- Features can import from: entities, shared
- Entities can import from: shared only
- Same-layer imports are forbidden (except within same slice)

### Backend Structure

Each module should have:
- `{module}.module.ts` - Module definition
- `{module}.controller.ts` - REST endpoints
- `{module}.service.ts` - Business logic
- `dto/` - Data Transfer Objects

## 🔧 Development Tips

1. **Use NX Graph**: `yarn graph` to visualize dependencies
2. **Type Safety**: Always use `@shared` types, never duplicate
3. **FSD Layers**: Respect import rules - they prevent coupling
4. **Prisma**: Use `PrismaService` in services, not controllers
5. **Cursor Rules**: Rules help maintain architecture consistency

## 📖 Learn More

- [NX Documentation](https://nx.dev)
- [Feature-Sliced Design](https://feature-sliced.github.io/documentation/ru/)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)

## 🎨 Next Steps

1. Configure your database connection
2. Run migrations: `yarn prisma:migrate`
3. Start developing your features!
4. Follow FSD architecture for frontend
5. Use shared types for type safety

---

Built with ❤️ using modern tools and best practices.
