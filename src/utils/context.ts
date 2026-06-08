import type { PortainerApi } from "./portainer";

export interface Ctx {
  request: Request;
  portainer: PortainerApi;
  /**
   * Disables the idle timeout for the current request, allowing handlers to
   * hold the connection open for long-running work (e.g. waiting for a stack
   * redeploy that can take many minutes).
   */
  disableTimeout: () => void;
}
