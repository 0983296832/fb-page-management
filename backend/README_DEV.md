FB-Page-Management Backend

Quick start (development):

1. Copy .env.example to .env and set DATABASE_URL, REDIS_URL
2. Start Docker services: `docker-compose up -d`
3. Install deps: `npm install` in backend
4. Generate prisma client: `npx prisma generate`
5. Run migrations: `npx prisma migrate dev --name init`
6. Start dev: `npm run dev`

API:

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/org
