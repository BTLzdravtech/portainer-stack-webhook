# Changelog

## v0.2.0

[compare changes](https://github.com/BTLzdravtech/portainer-stack-webhook/compare/v0.1.7...v0.2.0)

### 🚀 Enhancements

- Authenticate by forwarding the caller's `X-API-Key` header to Portainer ([c61c5ce](https://github.com/BTLzdravtech/portainer-stack-webhook/commit/c61c5ce))
- Re-pull images and redeploy via `repullImageAndRedeploy` ([fd6563d](https://github.com/BTLzdravtech/portainer-stack-webhook/commit/fd6563d))
- Wait for Portainer's asynchronous redeploy to finish — poll stack status until active, returning `502` on error and `504` on timeout ([2afa2ec](https://github.com/BTLzdravtech/portainer-stack-webhook/commit/2afa2ec))
- Thorough colored logging across requests and the async polling lifecycle, tunable via `LOG_LEVEL` ([2e49d14](https://github.com/BTLzdravtech/portainer-stack-webhook/commit/2e49d14))
- Production readiness: unauthenticated `/health` endpoint + Docker `HEALTHCHECK`, graceful `SIGTERM`/`SIGINT` shutdown, clean `500`/`400` error handling, and `NO_COLOR`/TTY-aware logs ([f505c88](https://github.com/BTLzdravtech/portainer-stack-webhook/commit/f505c88))

### 🏡 Chore

- Set up Biome linting/formatting and fix surfaced type/test errors ([eed3761](https://github.com/BTLzdravtech/portainer-stack-webhook/commit/eed3761))

### 📖 Documentation

- Add `CLAUDE.md` and align auth docs with the `X-API-Key` model ([a955415](https://github.com/BTLzdravtech/portainer-stack-webhook/commit/a955415))

## v0.1.7

[compare changes](https://github.com/aklinker1/portainer-stack-webhook/compare/v0.1.6...v0.1.7)

### 🩹 Fixes

- Don't prune unused services ([a6d70c3](https://github.com/aklinker1/portainer-stack-webhook/commit/a6d70c3))
- 404 from `GET /api/stacks` ([130a53b](https://github.com/aklinker1/portainer-stack-webhook/commit/130a53b))
- Correct error message typo ([a0faea5](https://github.com/aklinker1/portainer-stack-webhook/commit/a0faea5))

## v0.1.6

[compare changes](https://github.com/aklinker1/portainer-stack-webhook/compare/v0.1.5...v0.1.6)

### 🩹 Fixes

- Move `package.json` to correct location relative to `src/index.ts` ([4f4f1b2](https://github.com/aklinker1/portainer-stack-webhook/commit/4f4f1b2))

## v0.1.5

[compare changes](https://github.com/aklinker1/portainer-stack-webhook/compare/v0.1.4...v0.1.5)

### 🩹 Fixes

- Include `package.json` in docker image ([6878d9f](https://github.com/aklinker1/portainer-stack-webhook/commit/6878d9f))

### 🏡 Chore

- Remove unused import ([002044c](https://github.com/aklinker1/portainer-stack-webhook/commit/002044c))

## v0.1.4

[compare changes](https://github.com/aklinker1/portainer-stack-webhook/compare/v0.1.3...v0.1.4)

## v0.1.3

[compare changes](https://github.com/aklinker1/portainer-stack-webhook/compare/v0.1.2...v0.1.3)

### 🩹 Fixes

- Print version on startup ([26c0797](https://github.com/aklinker1/portainer-stack-webhook/commit/26c0797))

## v0.1.2

### 🚀 Enhancements

- List stacks at `/api/stacks` ([be6ebb7](https://github.com/aklinker1/portainer-stack-webhook/commit/be6ebb7))

### 🤖 CI

- Fix GitHub release generation ([aa6e353](https://github.com/aklinker1/portainer-stack-webhook/commit/aa6e353))

## v0.1.1

### 🚀 Enhancements

- Update portainer stacks ([25a8916](https://github.com/aklinker1/portainer-stack-webhook/commit/25a8916))

### 📖 Documentation

- Cleanup README ([6f28720](https://github.com/aklinker1/portainer-stack-webhook/commit/6f28720))

### 🤖 CI

- Add validation workflow ([b31e624](https://github.com/aklinker1/portainer-stack-webhook/commit/b31e624))
- Fix failing tests in CI ([#1](https://github.com/aklinker1/portainer-stack-webhook/pull/1))
- Add release workflow ([c0c8546](https://github.com/aklinker1/portainer-stack-webhook/commit/c0c8546))
