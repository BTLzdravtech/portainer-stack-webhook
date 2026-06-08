import { version } from "../package.json";
import routes from "./routes";
import { bold, cyan, dim, violet } from "./utils/colors";
import { createPortainerApi } from "./utils/portainer";
import { startServer } from "./utils/server";

const port = Number(process.env.PORT || 3000);

console.log(`${bold(cyan("Portainer Stack Webhooks"))} ${dim(`v${version}`)}`);
console.log(
  `${cyan("ℹ")} Server started ${dim("→")} ${violet(
    `http://localhost:${port}`,
  )}`,
);
startServer({
  port,
  createPortainerApi,
  routes,
});
