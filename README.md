# DramaStream

<p align="center">
  <img src="https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white" alt="Turborepo">
  <img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white" alt="Hono">
</p>

<p align="center">
  <strong>A modern drama streaming platform built with cutting-edge web technologies</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#api-documentation">API Docs</a>
</p>

---

## Features

- **Authentication** - Secure email/password authentication with Better-Auth
- **Drama Catalog** - Browse dramas with seasons and episodes
- **Video Player** - Custom player with quality selection (240p to 4K)
- **Favorites** ❤️ - Save dramas to your favorites list
- **Watchlist** - Save dramas to watch later
- **Viewing History** - Track what you've watched
- **Continue Watching** - Resume from where you left off
- **Search** - Find dramas quickly with full-text search
- **Episode Pagination** - Browse episodes in batches (10 mobile, 20 desktop)
- **Responsive Design** - Works seamlessly on desktop and mobile
- **API-Proxy Fallback** - Automatic failover for resilient streaming

---

## Recent Updates (Feb 2026)

### Favorites Feature ✨
Added full favorites functionality:
- Save dramas to your favorites list
- Toggle favorites with heart icon on drama details page
- View all favorites on your profile
- Favorites state integrated into drama details API

### UI Enhancements 🎨
- **Episode Pagination**: New batch-based pagination for episodes (10 per batch mobile, 20 desktop)  
- **Continue Watching**: Smart button showing "Start Watching" or "Continue Watching" based on history
- **Status Badges**: Updated to outlined design with transparent backgrounds for modern look
- **Primary Button**: Start Watching button styled as primary action button
- **Icon-Only Buttons**: Bookmark and favorite buttons now minimalist icons (20px) - white outline when not saved, golden amber filled when saved
- **Responsive Improvements**: Fine-tuned episode pagination breakpoint (768px) for better mobile/tablet experience
- **Header Improvements**: Icon-only Sign In button, hidden header on auth pages
- **Visual Polish**: Watched episodes show with dimmed opacity styling
- **Responsive Updates**: Adjusted episode grid breakpoints for better large-screen layout

### Technical Updates 🔧
- Enhanced drama details API with user state (isBookmarked, isFavorite, watchedEpisodes, lastWatchedEpisode)
- Added comprehensive E2E test suite (30 tests, 100% passing)
- Full TypeScript support across all new features

## Tech Stack

| Category           | Technologies                                                        |
| ------------------ | ------------------------------------------------------------------- |
| **Frontend**       | TanStack Start, React 19, shadcn/ui, TailwindCSS v4, TanStack Query |
| **Backend**        | Hono, Drizzle ORM, PostgreSQL, Better-Auth                          |
| **Infrastructure** | Turborepo, Bun, Docker, Playwright                                  |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.1.0 or higher
- PostgreSQL 15+ (or use Docker)
- Docker & Docker Compose (optional, for containerized setup)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd drama-stream

# Install dependencies
bun install
```

### 2. Environment Setup

```bash
# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit the `.env` files with your configuration (see [Environment Variables](#environment-variables)).

### 3. Database Setup

```bash
# Run migrations
bun run db:migrate

# Seed the database with sample data
bun run db:seed
```

### 4. Run Development Servers

```bash
# Start all services
bun run dev
```

The app will be available at:

- Web App: http://localhost:3000
- API: http://localhost:3001
- Drizzle Studio: http://localhost:3002 (run `bun run db:studio`)

---

## Project Structure

```
drama-stream/
├── apps/
│   ├── api/                 # Hono API server
│   │   ├── src/
│   │   │   ├── routes/      # API routes
│   │   │   ├── db/          # Database schema & migrations
│   │   │   └── lib/         # Utilities & middleware
│   │   └── package.json
│   └── web/                 # TanStack Start frontend
│       ├── app/
│       │   ├── routes/      # Page routes
│       │   ├── components/  # React components
│       │   └── hooks/       # Custom hooks
│       └── package.json
├── packages/
│   └── shared/              # Shared types & utilities
│       ├── src/
│       │   ├── types/       # TypeScript types
│       │   └── schemas/     # Zod schemas
│       └── package.json
├── e2e/                     # Playwright E2E tests
├── docker-compose.yml       # Docker orchestration
├── turbo.json               # Turborepo configuration
└── package.json             # Root workspace config
```

---

## Environment Variables

### API (`apps/api/.env`)

| Variable             | Description                     | Required |
| -------------------- | ------------------------------- | -------- |
| `DATABASE_URL`       | PostgreSQL connection string    | Yes      |
| `BETTER_AUTH_SECRET` | Secret key for auth encryption  | Yes      |
| `API_PROXY_URL`      | Fallback API proxy URL          | No       |
| `PRIMARY_API_URL`    | Primary API URL for proxy       | No       |
| `PORT`               | API server port (default: 3001) | No       |

### Web (`apps/web/.env`)

| Variable       | Description  | Required |
| -------------- | ------------ | -------- |
| `VITE_API_URL` | API base URL | Yes      |

### Example `.env` files

**apps/api/.env:**

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dramastream
BETTER_AUTH_SECRET=your-secret-key-here
API_PROXY_URL=http://localhost:3002
PRIMARY_API_URL=http://localhost:3001
PORT=3001
```

**apps/web/.env:**

```env
VITE_API_URL=http://localhost:3001
```

---

## Available Scripts

### Root Commands

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `bun run dev`       | Start all development servers  |
| `bun run build`     | Build all packages and apps    |
| `bun run test`      | Run unit tests                 |
| `bun run test:e2e`  | Run E2E tests with Playwright  |
| `bun run lint`      | Run ESLint across all packages |
| `bun run typecheck` | Run TypeScript type checking   |

### API Commands

| Command               | Description                    |
| --------------------- | ------------------------------ |
| `bun run dev`         | Start API development server   |
| `bun run db:migrate`  | Run database migrations        |
| `bun run db:seed`     | Seed database with sample data |
| `bun run db:studio`   | Open Drizzle Studio            |
| `bun run db:generate` | Generate migration files       |

### Web Commands

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `bun run dev`     | Start web development server |
| `bun run build`   | Build for production         |
| `bun run preview` | Preview production build     |

---

## API Documentation

The API is built with Hono and provides RESTful endpoints for:

- **Authentication** - `/api/auth/*` (Better-Auth endpoints)
- **Dramas** - `/api/dramas` - Browse and search dramas
- **Seasons** - `/api/seasons` - Season information
- **Episodes** - `/api/episodes` - Episode details and streaming
- **Watchlist** - `/api/watchlist` - User watchlist management
- **History** - `/api/history` - Viewing history and progress
- **Admin** - `/api/admin/*` - System administration

### Quick API Examples

```bash
# Get all dramas
curl http://localhost:3001/api/dramas

# Search dramas
curl "http://localhost:3001/api/dramas?search=romance"

# Get drama details
curl http://localhost:3001/api/dramas/123

# Get episodes for a drama
curl http://localhost:3001/api/dramas/123/episodes
```

For detailed API documentation, see [API_DOCS.md](./API_DOCS.md).

---

## Testing

### Unit Tests

```bash
# Run all unit tests
bun test

# Run with coverage
bun run test:coverage

# Run specific package tests
bun run test --filter=api
```

### E2E Tests

```bash
# Run Playwright tests
bun run test:e2e

# Run with UI mode
bun run test:e2e -- --ui

# Run specific test file
bun run test:e2e -- e2e/auth.spec.ts
```

---

## Docker Deployment

### Quick Start with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

### Services

| Service   | Port | Description             |
| --------- | ---- | ----------------------- |
| web       | 3000 | TanStack Start frontend |
| api       | 3001 | Hono API server         |
| api-proxy | 3002 | Fallback proxy server   |
| postgres  | 5432 | PostgreSQL database     |

### Production Deployment

```bash
# Production build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Architecture

DramaStream follows a modern full-stack architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Browser   │  │   Mobile    │  │    API Consumers    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Port 3000)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              TanStack Start + React 19                 │  │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────────────┐   │  │
│  │  │   Routes   │ │ Components │ │   TanStack Query │   │  │
│  │  └────────────┘ └────────────┘ └──────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Port 3001)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Hono Framework                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │  Auth    │ │  Dramas  │ │ Episodes │ │  Admin   │  │  │
│  │  │  Routes  │ │  Routes  │ │  Routes  │ │  Routes  │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌─────────────────────────┐  ┌──────────────────────────────┐
│      Database Layer      │  │      Fallback Proxy          │
│  ┌───────────────────┐   │  │  (Port 3002)                 │
│  │    PostgreSQL     │   │  │                              │
│  │  ┌─────────────┐  │   │  │  Circuit Breaker Pattern     │
│  │  │   Drizzle   │  │   │  │  In-Memory Caching           │
│  │  │     ORM     │  │   │  │  Automatic Failover          │
│  │  └─────────────┘  │   │  │                              │
│  └───────────────────┘   │  └──────────────────────────────┘
└─────────────────────────┘
```

### Key Architectural Decisions

- **Turborepo**: Enables efficient monorepo management with shared caching
- **TanStack Start**: Full-stack React framework with type-safe routing
- **Hono**: Lightweight, fast web framework perfect for edge deployment
- **Drizzle ORM**: Type-safe SQL-like ORM with excellent performance
- **Better-Auth**: Modern authentication with session management
- **API-Proxy Fallback**: Circuit breaker pattern ensures high availability

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork & Branch**: Fork the repo and create a feature branch
2. **Code Style**: Follow existing code style and run `bun run lint`
3. **Tests**: Add tests for new features
4. **Commits**: Use clear, descriptive commit messages
5. **PR**: Submit a pull request with a clear description

### Development Workflow

```bash
# Create a feature branch
git checkout -b feature/amazing-feature

# Make changes and test
bun run dev
bun test

# Commit and push
git commit -m "feat: add amazing feature"
git push origin feature/amazing-feature
```

---

## Troubleshooting

### Common Issues

**Database connection errors:**

```bash
# Ensure PostgreSQL is running
docker-compose up -d postgres

# Check connection string in apps/api/.env
```

**Port conflicts:**

```bash
# Kill processes using ports 3000-3002
lsof -ti:3000,3001,3002 | xargs kill -9
```

**Migration failures:**

```bash
# Reset database (WARNING: deletes all data)
bun run db:reset

# Or manually drop and recreate
dropdb dramastream && createdb dramastream
bun run db:migrate
```

**Build errors:**

```bash
# Clean and reinstall
rm -rf node_modules bun.lockb
bun install
```

### Getting Help

- Check [Issues](../../issues) for existing problems
- Create a new issue with reproduction steps
- Join our community discussions

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  Built with ❤️ using <a href="https://turbo.build">Turborepo</a>, <a href="https://bun.sh">Bun</a>, and <a href="https://tanstack.com">TanStack</a>
</p>
