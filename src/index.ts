import { version } from "../package.json";
import routes from "./routes";
import { bold, cyan, dim, violet } from "./utils/colors";
import { createLogger } from "./utils/log";
import { createPortainerApi } from "./utils/portainer";
import { startServer } from "./utils/server";

const port = Number(process.env.PORT || 3000);
const log = createLogger();

console.log(`${bold(cyan("Portainer Stack Webhooks"))} ${dim(`v${version}`)}`);
console.log(
  `${cyan("ℹ")} Server started ${dim("→")} ${violet(
    `http://localhost:${port}`,
  )}`,
);

const server = startServer({
  port,
  createPortainerApi,
  routes,
});

// Graceful shutdown: stop accepting new connections and let in-flight
// redeploys finish (bounded by the container's stop grace period).
const shutdown = async (signal: string) => {
  log.info(
    `received ${signal}, shutting down (waiting for in-flight requests)…`,
  );
  await server.stop();
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
