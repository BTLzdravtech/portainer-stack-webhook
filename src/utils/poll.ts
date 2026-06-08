import { ApiError } from "./errors";
import type { Logger } from "./log";
import { type PortainerStack, StackStatus, stackStatusName } from "./portainer";

export interface WaitOptions {
  id: number;
  intervalMs: number;
  /** Maximum time to wait for the deploy to finish. 0 waits indefinitely. */
  timeoutMs: number;
  /** Consecutive getStack failures tolerated before giving up. Default 3. */
  maxConsecutiveErrors?: number;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  /** Optional logger; when omitted the helper stays silent (and pure). */
  logger?: Logger;
}

/**
 * Polls a stack until it leaves the `Deploying` state, then returns the
 * terminal stack so the caller can map its `Status` to an HTTP result.
 *
 * `initial` is the PUT response body, which already reports `Deploying` on
 * modern Portainer — seeding from it (rather than re-fetching) avoids the
 * race where the deployment goroutine hasn't flipped the status yet, and
 * keeps backward compatibility (old Portainer returns `Active`/no status,
 * so the loop is skipped entirely).
 *
 * Throws `ApiError(504)` if the deploy never finishes within `timeoutMs`, and
 * rethrows the underlying error after `maxConsecutiveErrors` failed polls.
 */
export async function waitForStackDeploy(
  initial: PortainerStack,
  getStack: (id: number) => Promise<PortainerStack>,
  opts: WaitOptions,
): Promise<PortainerStack> {
  const { logger } = opts;
  const maxConsecutiveErrors = opts.maxConsecutiveErrors ?? 3;
  const start = opts.now();
  let current = initial;
  let consecutiveErrors = 0;
  let attempt = 0;

  const elapsedSec = () => Math.round((opts.now() - start) / 1000);

  while (current.Status === StackStatus.Deploying) {
    if (opts.timeoutMs > 0 && opts.now() - start >= opts.timeoutMs) {
      logger?.error(
        `timed out waiting for redeploy after ${elapsedSec()}s (${attempt} polls)`,
      );
      throw new ApiError(504, "Timed out waiting for stack redeploy", {
        id: opts.id,
        lastStatus: current.Status,
      });
    }

    await opts.sleep(opts.intervalMs);
    attempt++;

    try {
      current = await getStack(opts.id);
      consecutiveErrors = 0;
      logger?.info(
        `polling… status=${stackStatusName(current.Status)} (attempt ${attempt}, ${elapsedSec()}s)`,
      );
    } catch (err) {
      consecutiveErrors++;
      const message = err instanceof Error ? err.message : String(err);
      if (consecutiveErrors > maxConsecutiveErrors) {
        logger?.error(
          `giving up after ${consecutiveErrors} consecutive poll failures: ${message}`,
        );
        throw err;
      }
      logger?.warn(
        `poll attempt ${attempt} failed (${consecutiveErrors}/${maxConsecutiveErrors}): ${message}`,
      );
      // Keep `current` as Deploying and retry on the next iteration.
    }
  }

  return current;
}
