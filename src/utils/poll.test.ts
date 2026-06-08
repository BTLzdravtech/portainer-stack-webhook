import { describe, expect, it, mock } from "bun:test";
import { ApiError } from "./errors";
import { waitForStackDeploy } from "./poll";
import { type PortainerStack, StackStatus } from "./portainer";

const stack = (Status?: number): PortainerStack => ({
  Id: 1,
  Name: "example",
  EndpointId: 2,
  Status,
});

const sleep = () => Promise.resolve();
// A clock that advances by `step` ms on every call.
const clock = (step: number) => {
  let t = 0;
  return () => {
    const value = t;
    t += step;
    return value;
  };
};

const baseOpts = {
  id: 1,
  intervalMs: 10,
  timeoutMs: 0,
  sleep,
  now: () => 0,
};

describe("waitForStackDeploy", () => {
  it("returns immediately when already Active (no polling)", async () => {
    const getStack = mock<(id: number) => Promise<PortainerStack>>();

    const result = await waitForStackDeploy(
      stack(StackStatus.Active),
      getStack,
      baseOpts,
    );

    expect(result.Status).toBe(StackStatus.Active);
    expect(getStack.mock.calls).toHaveLength(0);
  });

  it("returns immediately when status is absent (older Portainer)", async () => {
    const getStack = mock<(id: number) => Promise<PortainerStack>>();

    const result = await waitForStackDeploy(
      stack(undefined),
      getStack,
      baseOpts,
    );

    expect(result.Status).toBeUndefined();
    expect(getStack.mock.calls).toHaveLength(0);
  });

  it("polls until the stack leaves Deploying", async () => {
    const getStack = mock<(id: number) => Promise<PortainerStack>>();
    getStack
      .mockResolvedValueOnce(stack(StackStatus.Deploying))
      .mockResolvedValueOnce(stack(StackStatus.Active));

    const result = await waitForStackDeploy(
      stack(StackStatus.Deploying),
      getStack,
      baseOpts,
    );

    expect(result.Status).toBe(StackStatus.Active);
    expect(getStack.mock.calls).toHaveLength(2);
  });

  it("returns the Error stack so the caller can map it", async () => {
    const getStack = mock<(id: number) => Promise<PortainerStack>>();
    getStack.mockResolvedValueOnce(stack(StackStatus.Error));

    const result = await waitForStackDeploy(
      stack(StackStatus.Deploying),
      getStack,
      baseOpts,
    );

    expect(result.Status).toBe(StackStatus.Error);
    expect(getStack.mock.calls).toHaveLength(1);
  });

  it("throws ApiError(504) when the deploy never finishes in time", async () => {
    const getStack = mock<(id: number) => Promise<PortainerStack>>(() =>
      Promise.resolve(stack(StackStatus.Deploying)),
    );

    const err = await waitForStackDeploy(
      stack(StackStatus.Deploying),
      getStack,
      {
        ...baseOpts,
        timeoutMs: 250,
        now: clock(100), // 0, 100, 200, 300 -> exceeds 250 on the 3rd check
      },
    ).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(504);
  });

  it("tolerates transient getStack failures up to the limit", async () => {
    const getStack = mock<(id: number) => Promise<PortainerStack>>();
    getStack
      .mockRejectedValueOnce(new Error("blip"))
      .mockRejectedValueOnce(new Error("blip"))
      .mockResolvedValueOnce(stack(StackStatus.Active));

    const result = await waitForStackDeploy(
      stack(StackStatus.Deploying),
      getStack,
      { ...baseOpts, maxConsecutiveErrors: 2 },
    );

    expect(result.Status).toBe(StackStatus.Active);
    expect(getStack.mock.calls).toHaveLength(3);
  });

  it("rethrows once consecutive failures exceed the limit", async () => {
    const err = new Error("persistent");
    const getStack = mock<(id: number) => Promise<PortainerStack>>(() =>
      Promise.reject(err),
    );

    const thrown = await waitForStackDeploy(
      stack(StackStatus.Deploying),
      getStack,
      { ...baseOpts, maxConsecutiveErrors: 2 },
    ).catch((e) => e);

    expect(thrown).toBe(err);
    expect(getStack.mock.calls).toHaveLength(3); // 2 tolerated + 1 that exceeds
  });

  it("reports progress and retries through the logger", async () => {
    const getStack = mock<(id: number) => Promise<PortainerStack>>();
    getStack
      .mockRejectedValueOnce(new Error("blip"))
      .mockResolvedValueOnce(stack(StackStatus.Active));
    const logger = {
      debug: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
    };

    await waitForStackDeploy(stack(StackStatus.Deploying), getStack, {
      ...baseOpts,
      maxConsecutiveErrors: 2,
      logger,
    });

    expect(logger.warn).toHaveBeenCalledTimes(1); // transient failure
    expect(logger.info).toHaveBeenCalledTimes(1); // the successful poll
  });
});
