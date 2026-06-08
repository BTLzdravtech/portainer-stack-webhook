import { ApiError } from "../utils/errors";
import { createLogger } from "../utils/log";
import { waitForStackDeploy } from "../utils/poll";
import { StackStatus, stackStatusName } from "../utils/portainer";
import { JsonResponse } from "../utils/responses";
import { defineRoute } from "../utils/routes";

export default defineRoute({
  name: "webhook",
  regex: /^\/api\/webhook\/stacks\/(.*)$/,
  method: "POST",

  handler: async (ctx, idStr: string) => {
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, `Invalid stack id: "${idStr}"`);
    }
    const log = createLogger(`stack ${id}`);
    const start = Date.now();
    const intervalMs = Number(process.env.POLL_INTERVAL_MS) || 5_000;
    const timeoutMs =
      process.env.POLL_TIMEOUT_MS !== undefined
        ? Number(process.env.POLL_TIMEOUT_MS)
        : 1_800_000; // 30 minutes; 0 disables.

    log.info("redeploy webhook received");

    // Portainer redeploys asynchronously and the deploy can take many minutes
    // (e.g. pulling large/Windows images), so keep this request alive.
    ctx.disableTimeout();

    const [stack, stackFile] = await Promise.all([
      ctx.portainer.getStack(id),
      ctx.portainer.getStackFile(id),
    ]);
    log.info(`redeploying "${stack.Name}" (endpoint ${stack.EndpointId})`);

    const updated = await ctx.portainer.updateStack(id, {
      prune: false,
      repullImageAndRedeploy: true,
      endpointId: stack.EndpointId,
      stackFileContent: stackFile.StackFileContent,
    });
    log.info(`update accepted, status=${stackStatusName(updated.Status)}`);

    const final = await waitForStackDeploy(updated, ctx.portainer.getStack, {
      id,
      intervalMs,
      timeoutMs,
      sleep: Bun.sleep,
      now: Date.now,
      logger: log,
    });

    const elapsedSec = Math.round((Date.now() - start) / 1000);

    // Anything other than Active (or an absent status on older Portainer) means
    // the redeploy did not succeed.
    if (final.Status !== undefined && final.Status !== StackStatus.Active) {
      log.error(
        `redeploy failed: status=${stackStatusName(final.Status)} after ${elapsedSec}s`,
      );
      throw new ApiError(502, "Stack redeploy failed", {
        id,
        status: final.Status,
      });
    }

    log.info(
      `redeploy complete: status=${stackStatusName(final.Status)} in ${elapsedSec}s`,
    );
    return new JsonResponse(200, {
      id: final.Id,
      name: final.Name,
      status: final.Status ?? null,
    });
  },
});
