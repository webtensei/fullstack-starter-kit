# AI Assistant Rules for Fullstack Starter Kit

This file contains complete project conventions, architecture rules, and best practices. Useful for AI assistants (Kimi, Cursor, Copilot, Claude, etc.) and human developers.

Keep this file in sync with `.cursor/rules/`.

---

## Backend NestJS Architecture Rules

### Scope: `apps/api/**`

### Architecture Overview

This project uses **NestJS** with **Prisma** for database access. Follow modular architecture principles.

### Observability (SigNoz)

This repo includes optional **SigNoz** + **OpenTelemetry** instrumentation for the API.

- **Keep observability centralized**: configure OTel + request logging only in `apps/api/src/observability/**` and call it from `main.ts`.
- **Never hardcode behavior**: use env toggles instead (see `.env.example`).

#### Environment variables (high signal)

- **Disable all telemetry network traffic**:
  - `OTEL_ENABLED=false`
- **Environment label for filtering in SigNoz**:
  - `DEPLOYMENT_ENV=development|staging|production`
- **Trace sampling** (0..1):
  - `OTEL_TRACE_SAMPLE_RATE`
- **Request log export to SigNoz** (OTLP logs):
  - `OTEL_LOGS_ENABLED`
  - `OTEL_LOGS_MIN_STATUS` (e.g. 400)
  - `OTEL_LOGS_SAMPLE_RATE` (0..1)

#### Logging rules (security + DX)

- **Redact secrets**: never log `password`, tokens, `Authorization`, `Cookie`, refresh tokens, etc.
- **Prefer structured logs** (JSON) with stable keys (requestId, traceId, spanId, method, url, status, duration).
- **Avoid noisy payload logging by default**. If needed, make it opt-in with env flags.

#### Tracing rules

- Prefer automatic instrumentation (HTTP/Express, Prisma).
- When adding manual spans:
  - keep attributes low-cardinality (avoid putting `userId` into labels/attributes at high volume)
  - add business-friendly attributes (feature/module names) rather than raw payloads

### Project Structure

```
apps/api/src/
├── modules/          # Domain modules (users, products, etc.)
├── common/           # Shared utilities, guards, interceptors, Prisma
├── config/           # Configuration modules
└── main.ts           # Application entry point
```

### Module Organization

Each domain module should follow this structure:

```
modules/{domain}/
├── {domain}.module.ts    # Module definition
├── {domain}.controller.ts # REST endpoints
├── {domain}.service.ts   # Business logic
├── dto/                   # Data Transfer Objects
│   ├── create-{domain}.dto.ts
│   └── update-{domain}.dto.ts
└── entities/              # Prisma-based entities (if needed)
```

### Shared Types

**CRITICAL**: All types shared with frontend MUST be imported from `@shared`:

```typescript
// ✅ CORRECT
import { User, CreateUserDto, UpdateUserDto } from '@shared';

// ❌ WRONG - don't duplicate types
// Don't create DTOs that duplicate @shared types
```

If you need backend-specific types, create them in the module, but prefer using `@shared` types.

### Prisma Usage

- Use `PrismaService` from `common/prisma/prisma.service`
- Inject `PrismaService` in services, not controllers
- Keep database queries in services
- Use transactions for multi-step operations
- Prefer Prisma + OTel instrumentation for DB visibility (no manual query logging in code)

```typescript
// ✅ CORRECT
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    return this.prisma.user.create({ data });
  }
}

// ❌ WRONG - don't use Prisma directly in controllers
@Controller('users')
export class UserController {
  constructor(private prisma: PrismaService) {} // ❌
}
```

### DTOs and Validation

- Use class-validator decorators for DTO validation
- Extend `@shared` types when possible
- Create separate DTOs only when backend needs additional fields

```typescript
import { CreateUserDto as SharedCreateUserDto } from '@shared';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateUserDto extends SharedCreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;
}
```

### Error Handling

- Use NestJS built-in exception filters
- Return consistent error responses
- Use HTTP status codes appropriately
- Log errors for debugging

```typescript
// ✅ CORRECT
throw new NotFoundException('User not found');
throw new BadRequestException('Invalid email format');
```

### API Design

- Use RESTful conventions
- Version APIs if needed (`/api/v1/users`)
- Return consistent response format
- Use DTOs for request/response

```typescript
@Get(':id')
async findOne(@Param('id') id: string): Promise<ApiResponse<User>> {
  const user = await this.userService.findOne(id);
  return { data: user, success: true };
}
```

### Dependency Injection

- Use constructor injection
- Keep services focused and single-responsibility
- Use modules to organize dependencies

### Code Style

- Use TypeScript strictly - avoid `any`
- Follow NestJS naming conventions
- Use async/await, not promises
- Keep functions small and focused
- Add JSDoc comments for public APIs

### Environment Variables

- Use `@nestjs/config` for configuration
- Store sensitive data in `.env` (not committed)
- Validate environment variables on startup

### Testing

- Write unit tests for services
- Write integration tests for controllers
- Mock Prisma in unit tests
- Use test databases for integration tests

---

## Frontend FSD Architecture Rules

### Scope: `apps/web/**`

### Architecture Overview

This project uses **Feature-Sliced Design (FSD)** methodology. Follow these rules strictly:

### Layer Structure

The project follows FSD layers (from top to bottom):
1. **app** - Application initialization, routing, providers
2. **pages** - Full pages or large page sections
3. **widgets** - Large self-contained UI blocks
4. **features** - Reusable feature implementations
5. **entities** - Business entities (User, Product, etc.)
6. **shared** - Reusable code (UI components, utilities, API)

### Import Rules

#### Critical: Import Direction
- Modules can ONLY import from layers BELOW them
- Same-layer imports are FORBIDDEN (except within the same slice)
- Pages can import from: widgets, features, entities, shared
- Widgets can import from: features, entities, shared
- Features can import from: entities, shared
- Entities can import from: shared only
- Shared cannot import from any other layer

#### Example - CORRECT:
```typescript
// ✅ pages/home can import from widgets
import { Header } from '@/widgets/header';

// ✅ features/auth can import from entities
import { User } from '@/entities/user';

// ✅ entities/user can import from shared
import { Button } from '@/shared/ui';
```

#### Example - WRONG:
```typescript
// ❌ entities/user cannot import from features
import { useAuth } from '@/features/auth';

// ❌ shared cannot import from entities
import { User } from '@/entities/user';

// ❌ pages cannot import from other pages
import { HomePage } from '@/pages/home';
```

### Slice Structure

Each slice (except app/shared) must have:
- `ui/` - UI components
- `api/` - API calls, types
- `model/` - Business logic, stores, schemas
- `lib/` - Internal utilities (optional)
- `index.ts` - Public API (exports only what other layers need)

### Public API Pattern

Always use `index.ts` files to export public API:

```typescript
// ✅ GOOD - entities/user/index.ts
export { UserCard } from './ui/user-card';
export { useUser } from './model/use-user';
export type { User } from './model/types';

// ❌ BAD - direct imports bypassing index
import { UserCard } from '@/entities/user/ui/user-card';
```

### Shared Types

**IMPORTANT**: All types shared between frontend and backend MUST be in `@shared`:

```typescript
// ✅ CORRECT
import { User, CreateUserDto } from '@shared';

// ❌ WRONG - don't duplicate types
// Don't create types in entities/user that exist in @shared
```

### Path Aliases

- `@/` - Points to `apps/web/src/`
- `@shared/` - Points to `libs/shared/src/`

### Component Guidelines

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic to hooks
- Colocate styles with components when possible
- Use TypeScript strictly - avoid `any`

### State Management

- Prefer local state (`useState`) for component-specific state
- Use context for shared state within a feature/widget
- Consider external state management (Zustand, Jotai) for global state
- Keep business logic in `model/` segments

### Code Organization

- One component per file
- Group related files in folders
- Use descriptive names that reflect business domain
- Avoid technical names (e.g., `Component1`, `utils2`)

---

## Observability (SigNoz + OpenTelemetry) Rules

### Scope: `apps/api/**`, `infra/signoz/**`, `.env*`

This repo includes **self-hosted SigNoz** and an **OpenTelemetry** integration for `apps/api`.

### Where things live

- **SigNoz stack (docker-compose)**: `infra/signoz/`
  - Start/stop scripts are in `package.json`:
    - `yarn obs:up`
    - `yarn obs:down`
    - `yarn obs:ps`
    - `yarn obs:logs`
  - SigNoz UI: `http://localhost:3301`
  - OTLP ingest (collector): `http://localhost:4318` and `grpc://localhost:4317`

- **API instrumentation entrypoint**: `apps/api/src/observability/`
  - `otel.ts`: OpenTelemetry SDK (traces + optional OTLP logs exporter)
  - `request-logger.ts`: request logging middleware (stdout + optional export to SigNoz)
  - `index.ts`: tiny wrapper used by `apps/api/src/main.ts`

### DX rule: keep observability centralized

- Do **NOT** sprinkle ad-hoc exporter setup across modules.
- All observability wiring should stay in `apps/api/src/observability/**` and be called from `main.ts`.

### Environment controls (do not hardcode)

Prefer environment variables for behavior changes:

- **Master switch (no network calls when false)**:
  - `OTEL_ENABLED=false`

- **Environment label shown in SigNoz**:
  - `DEPLOYMENT_ENV=development|staging|production`

- **Trace sampling**:
  - `OTEL_TRACE_SAMPLE_RATE` (0..1)

- **Request logs export to SigNoz** (OTLP logs):
  - `OTEL_LOGS_ENABLED=true|false`
  - `OTEL_LOGS_MIN_STATUS` (e.g. 400)
  - `OTEL_LOGS_SAMPLE_RATE` (0..1)

- **Stdout request logs (pino)**:
  - `LOG_LEVEL`
  - `LOG_HTTP_MIN_STATUS`
  - `LOG_HTTP_SAMPLE_RATE`

Keep defaults conservative for templates:
- traces can be enabled with sampling
- request log export should be opt-in (`OTEL_LOGS_ENABLED=false` in `.env.example`)

### Security rules

- Never log secrets:
  - passwords, tokens, cookies, authorization headers, refresh tokens
- If you add new request/response logging, ensure redaction/sanitization stays in place.

---

## Shared Types Library Rules

### Scope: `libs/shared/**`

### Purpose

The `@shared` library contains **all types, interfaces, and DTOs** that are used by both frontend and backend. This ensures type safety across the entire stack.

### Critical Rules

#### 1. Single Source of Truth
- **ALL** types shared between frontend and backend MUST be in `libs/shared/src/`
- **NEVER** duplicate types in frontend (`apps/web`) or backend (`apps/api`)
- If a type is used in both places, it belongs in `@shared`

#### 2. Import Convention
```typescript
// ✅ CORRECT - Frontend
import { User, CreateUserDto } from '@shared';

// ✅ CORRECT - Backend
import { User, CreateUserDto } from '@shared';

// ❌ WRONG - Don't create duplicate types
// In apps/api/src/modules/users/dto/create-user.dto.ts
export interface CreateUserDto { ... } // ❌ Should be in @shared
```

#### 3. Type Organization

Organize types by domain or feature:

```typescript
// libs/shared/src/index.ts
export interface User { ... }
export interface CreateUserDto { ... }
export interface UpdateUserDto { ... }

export interface Product { ... }
export interface CreateProductDto { ... }
```

For larger projects, consider splitting into files:
```
libs/shared/src/
├── user.types.ts
├── product.types.ts
├── api.types.ts
└── index.ts (re-exports all)
```

#### 4. What Goes in @shared

✅ **DO include:**
- Entity types (User, Product, Order, etc.)
- DTOs (CreateUserDto, UpdateUserDto)
- API response types (ApiResponse<T>, ApiError)
- Enums used in both frontend and backend
- Common utility types

❌ **DON'T include:**
- Frontend-specific types (React component props, hooks)
- Backend-specific types (Prisma-specific types, internal service types)
- Implementation details

#### 5. Type Definitions

- Use `interface` for object shapes
- Use `type` for unions, intersections, computed types
- Export everything that needs to be shared
- Keep types focused and minimal

```typescript
// ✅ GOOD
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  name?: string;
}

// ❌ BAD - Too specific, includes implementation details
export interface UserWithPasswordHash extends User {
  passwordHash: string; // ❌ Backend-only, shouldn't be shared
}
```

#### 6. Versioning and Changes

- Be careful when changing shared types - affects both frontend and backend
- Use optional fields when adding new properties
- Consider migration strategy for breaking changes
- Document breaking changes

#### 7. Prisma Integration

- Prisma generates types from schema
- Export Prisma types from `@shared` if needed by frontend
- Keep Prisma schema in sync with shared types

```typescript
// If Prisma User type matches shared User, re-export:
import { User as PrismaUser } from '@prisma/client';
export type User = PrismaUser; // ✅
```

#### 8. Import Path

Always use the `@shared` alias:

```typescript
// ✅ CORRECT
import { User } from '@shared';

// ❌ WRONG
import { User } from '../../libs/shared/src';
```

### Best Practices

- Keep shared types simple and focused
- Avoid circular dependencies
- Document complex types with JSDoc
- Use consistent naming conventions
- Group related types together
- Export types that are part of public API

### Example Structure

```typescript
// libs/shared/src/index.ts

// User domain
export interface User { ... }
export interface CreateUserDto { ... }
export interface UpdateUserDto { ... }

// API responses
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

// Enums
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
```

---

## Authentication System Reference

### API Endpoints

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

---

## Quick Reference

### Tech Stack
- **Monorepo**: NX 22.4+
- **Frontend**: React 19 + Vite + Feature-Sliced Design (FSD)
- **Backend**: NestJS 11 + Prisma 7 + PostgreSQL
- **Package Manager**: Yarn
- **Observability**: SigNoz + OpenTelemetry

### Path Aliases
- `@/` → `apps/web/src/` (frontend)
- `@shared/` → `libs/shared/src/` (shared types)

### Available Scripts
- `yarn dev:web` - Start React dev server (port 4200)
- `yarn dev:api` - Start NestJS dev server (port 3000)
- `yarn build` - Build all apps
- `yarn prisma:generate` - Generate Prisma Client
- `yarn prisma:migrate` - Run database migrations
- `yarn obs:up` - Start SigNoz
- `yarn obs:down` - Stop SigNoz
