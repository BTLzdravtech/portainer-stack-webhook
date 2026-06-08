FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Install dependencies first for better layer caching. --production omits
# devDependencies (biome, bun-types); --frozen-lockfile fails on drift.
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# App source
COPY src src

USER bun
EXPOSE 3000/tcp

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

ENTRYPOINT [ "bun", "run", "src/index.ts" ]
