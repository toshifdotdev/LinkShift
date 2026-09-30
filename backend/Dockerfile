# syntax=docker/dockerfile:1

FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json ./
# tsx ships as a production dependency because prisma/seed.ts is TypeScript and
# prisma.config.ts runs the seed through it. Migrations and seeding remain
# explicit deployment steps (`docker compose run --rm app npx prisma migrate
# deploy`); the container start command never runs them.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

COPY prisma ./prisma
COPY prisma.config.ts ./

# prisma/seed.ts imports the generated client from ../src/generated/prisma, and
# the prisma-client generator emits TypeScript there. Without this the seed
# fails to resolve its own import inside the production image.
COPY --from=build /app/src/generated ./src/generated

COPY GeoLite2-City.mmdb ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
