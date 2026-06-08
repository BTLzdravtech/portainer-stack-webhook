# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A free alternative to Portainer BE's "Automatic Stack Updates". It's a small HTTP service that receives a webhook and tells a Portainer instance to re-pull images and redeploy a stack. Runs on the **Bun** runtime (not Node).

## Commands

```sh
bun install                       # Install dependencies
bun dev                           # Run with hot reload (src/index.ts)
bun start                         # Run without hot reload
bun test                          # Run all tests (Bun's built-in runner)
bun test src/routes/webhook.test.ts   # Run a single test file
bun test -t "should update the stack" # Run tests matching a name
bun compile                       # Type-check only (tsc --noEmit)

bun docker:build                  # Build Docker image
bun docker:run                    # Run image on port 3000
```

Local dev requires a `.env` file: `cp .env.template .env` and fill in `BASE_URL` (full Portainer URL including `/api`).

**Note:** `bun format:check` and `bun lint:check` are unimplemented stubs (`echo TODO`). CI (`.github/workflows/validate.yml`) runs them but they pass trivially — there is currently no real linting or formatting.

## Architecture

A framework-less HTTP server built directly on `Bun.serve`. The whole request lifecycle lives in `src/utils/server.ts`.

**Request flow** (`server.ts`):
1. Every request must carry an `X-API-Key` header — missing it throws `RequiredApiKeyError` (500). The key is *not* validated locally; it's forwarded to Portainer.
2. The server iterates the `routes` array, testing each route's `regex` against the URL pathname and matching the HTTP method. Regex capture groups are spread into the handler as positional path params.
3. A per-request `Ctx` (`{ request, portainer }`) is built. `portainer` is a fresh Portainer API client created from the caller's API key.
4. If no route matches, it throws a 404 `ApiError` listing available routes.

**Routes** (`src/routes/`): Each route is a plain object created with `defineRoute({ name, method, regex, handler })` and registered in `src/routes/index.ts`'s exported array. Handlers return a `Response` (or void → empty 200). The two routes are `GET /api/stacks` (list) and `POST /api/webhook/stacks/:id` (trigger redeploy).

**Portainer client** (`src/utils/portainer.ts`): `createPortainerApi(apiKey)` returns an object of methods (`listStacks`, `getStack`, `getStackFile`, `updateStack`) that call the Portainer REST API at `BASE_URL`, authenticating with the forwarded `X-API-Key`. The webhook handler reads the existing stack + its compose file, then PUTs it back with `repullImageAndRedeploy: true`.

**Async redeploy & polling**: Portainer's `PUT /stacks/{id}` is asynchronous — it returns 200 immediately with the stack body where `Status === StackStatus.Deploying` (the `StackStatus` enum lives in `portainer.ts`), and the redeploy runs in the background. So the webhook handler seeds `waitForStackDeploy` (`src/utils/poll.ts`) with the PUT response and polls `getStack` until the status leaves `Deploying`, then responds `200` (active), `502` (error/other), or `504` (timeout). Seeding from the PUT body — not a re-fetch — avoids the not-yet-started race and stays backward compatible with synchronous old Portainer (which never reports `Deploying`). Poll cadence/ceiling come from `POLL_INTERVAL_MS` (default 5s) and `POLL_TIMEOUT_MS` (default 30m; `0` disables). Because a redeploy can exceed Bun's 255s `idleTimeout` cap, the handler calls `ctx.disableTimeout()` (wired in `server.ts` to `server.timeout(request, 0)`) to hold its own request open.

**Errors** (`src/utils/errors.ts`): `ApiError` and `FetchError` both expose `toResponse()`. `server.ts` catches them centrally and converts to HTTP responses; any other (unexpected) error is re-thrown. Use these classes rather than returning error responses ad hoc. `JsonResponse` (`responses.ts`) is the standard JSON response helper.

**Testing**: Route handlers are unit-tested by calling `handler(ctx, ...pathParams)` directly with a mocked context. `mockPortainerApi()` (`src/utils/testing.ts`) returns a Portainer client where every method is a `bun:test` mock that throws until you set a return value — drive behavior with `.mockResolvedValue` / `.mockRejectedValue`.

## Gotchas

- **Auth is per-request.** There is no local login or stored credentials. Every request must include an `X-API-Key` header (a Portainer API token), which is forwarded as-is to Portainer. The only env var read is `BASE_URL`.
- Releases are manual: trigger the `Release` GitHub Actions workflow (`workflow_dispatch`). It runs `changelogen --release`, builds multi-arch Docker images, and pushes to Docker Hub + creates a GitHub release. Do not hand-edit the version or CHANGELOG.
