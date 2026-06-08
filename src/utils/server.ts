import { version } from "../../package.json";
import type { Ctx } from "./context";
import { ApiError, FetchError, RequiredApiKeyError } from "./errors";
import { createLogger } from "./log";
import type { PortainerApi } from "./portainer";
import { JsonResponse } from "./responses";
import type { Route } from "./routes";

export function startServer(options: {
  port: number;
  routes: Route[];
  createPortainerApi: (apiKey: string) => Promise<PortainerApi> | PortainerApi;
}) {
  return Bun.serve({
    port: options.port,
    idleTimeout: 255,
    async fetch(request, server) {
      const log = createLogger();
      const url = new URL(request.url, "http://localhost");
      // Only method + path are logged here — never headers (which carry the API key).
      const reqLine = `${request.method} ${url.pathname}`;
      log.debug(reqLine);

      // Unauthenticated liveness probe (for Docker/orchestrator health checks).
      if (request.method === "GET" && url.pathname === "/health") {
        return new JsonResponse(200, { status: "ok", version });
      }

      try {
        const apiKey = request.headers.get("X-API-Key");
        if (!apiKey) throw RequiredApiKeyError();
        for (const route of options.routes) {
          const matches = route.regex.exec(url.pathname);
          if (matches && route.method === request.method) {
            const ctx: Ctx = {
              request,
              portainer: await options.createPortainerApi(apiKey),
              disableTimeout: () => server.timeout(request, 0),
            };
            const response = await route.handler(ctx, ...matches.slice(1));
            const res = response ?? new Response();
            log.info(`${reqLine} → ${res.status}`);
            return res;
          }
        }

        const available = options.routes.map(
          (op) =>
            `${op.method} ${op.regex
              .toString()
              .slice(2, -2)
              .replaceAll("\\", "")}`,
        );
        throw new ApiError(404, `"${reqLine}" did not match any endpoints`, {
          routes: available,
        });
      } catch (err) {
        // Return responses for handled errors, logging them centrally.
        if (err instanceof ApiError || err instanceof FetchError) {
          const res = err.toResponse();
          const line = `${reqLine} → ${res.status} ${err.message}`;
          if (res.status >= 500) log.error(line);
          else log.warn(line);
          return res;
        }

        // Throw error on unknown errors
        log.error(
          `${reqLine} → unhandled error: ${err instanceof Error ? err.message : String(err)}`,
        );
        throw err;
      }
    },
    // Last-resort handler for anything thrown out of fetch().
    error() {
      return new JsonResponse(500, { message: "Internal Server Error" });
    },
  });
}
