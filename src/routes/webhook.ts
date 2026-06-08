import { ApiError } from "../utils/errors";
import { waitForStackDeploy } from "../utils/poll";
import { StackStatus } from "../utils/portainer";
import { JsonResponse } from "../utils/responses";
import { defineRoute } from "../utils/routes";

export default defineRoute({
  name: "webhook",
  regex: /^\/api\/webhook\/stacks\/(.*)$/,
  method: "POST",

  handler: async (ctx, idStr: string) => {
    const id = Number(idStr);
    const intervalMs = Number(process.env.POLL_INTERVAL_MS) || 5_000;
    const timeoutMs =
      process.env.POLL_TIMEOUT_MS !== undefined
        ? Number(process.env.POLL_TIMEOUT_MS)
        : 1_800_000; // 30 minutes; 0 disables.

    // Portainer redeploys asynchronously and the deploy can take many minutes
    // (e.g. pulling large/Windows images), so keep this request alive.
    ctx.disableTimeout();

    const [stack, stackFile] = await Promise.all([
      ctx.portainer.getStack(id),
      ctx.portainer.getStackFile(id),
    ]);
    const updated = await ctx.portainer.updateStack(id, {
      prune: false,
      repullImageAndRedeploy: true,
      endpointId: stack.EndpointId,
      stackFileContent: stackFile.StackFileContent,
    });

    const final = await waitForStackDeploy(updated, ctx.portainer.getStack, {
      id,
      intervalMs,
      timeoutMs,
      sleep: Bun.sleep,
      now: Date.now,
    });

    // Anything other than Active (or an absent status on older Portainer) means
    // the redeploy did not succeed.
    if (final.Status !== undefined && final.Status !== StackStatus.Active) {
      throw new ApiError(502, "Stack redeploy failed", {
        id,
        status: final.Status,
      });
    }

    return new JsonResponse(200, {
      id: final.Id,
      name: final.Name,
      status: final.Status ?? null,
    });
  },
});
