import { Ctx } from "./context";
import { ApiError, FetchError, RequiredApiKeyError } from "./errors";
import { PortainerApi } from "./portainer";
import { Route } from "./routes";

export function startServer(options: {
  port: number;
  routes: Route[];
  createPortainerApi: (apiKey: string | null) => Promise<PortainerApi> | PortainerApi;
}) {
  return Bun.serve({
    port: options.port,
    idleTimeout: 255,
    async fetch(request) {
      try {
        const url = new URL(request.url, "http://localhost");
        const apiKey = request.headers.get("X-API-Key");
        if (!apiKey) throw RequiredApiKeyError();
        for (const route of options.routes) {
          const matches = route.regex.exec(url.pathname);
          if (matches && route.method === request.method) {
            const ctx: Ctx = {
              request,
              portainer: await options.createPortainerApi(apiKey),
            };
            const response = await route.handler(ctx, ...matches.slice(1));
            return response ?? new Response();
          }
        }

        const available = options.routes.map(
          (op) =>
            `${op.method} ${op.regex
              .toString()
              .slice(2, -2)
              .replaceAll("\\", "")}`
        );
        throw new ApiError(
          404,
          `"${request.method} ${url.pathname}" did not match any endpoints`,
          { routes: available }
        );
      } catch (err) {
        // Return responses for handled errors
        if (err instanceof ApiError) return err.toResponse();
        if (err instanceof FetchError) return err.toResponse();

        // Throw error on unknown errors
        throw err;
      }
    },
  });
}
