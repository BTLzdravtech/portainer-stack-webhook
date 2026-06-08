import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Ctx } from "../utils/context";
import type { ApiError } from "../utils/errors";
import { StackStatus } from "../utils/portainer";
import { mockPortainerApi } from "../utils/testing";
import webhook from "./webhook";

const request = new Request("http://localhost:3000/api/webhook/stacks", {
  method: "POST",
});
const portainer = mockPortainerApi();
const disableTimeout = mock(() => {});
const ctx: Ctx = {
  request,
  portainer,
  disableTimeout,
};

const id = 123;
const endpointId = 3;
const stackFileContent = "<docker compose code>";
const exampleStack = (Status?: number) => ({
  Id: id,
  EndpointId: endpointId,
  Name: "Example Stack",
  Status,
});

describe("webhook route", () => {
  beforeEach(() => {
    portainer.getStack.mockReset();
    portainer.getStackFile.mockReset();
    portainer.updateStack.mockReset();
    disableTimeout.mockReset();
    // Poll near-instantly during tests; transitions are driven by mock chains.
    process.env.POLL_INTERVAL_MS = "1";
    process.env.POLL_TIMEOUT_MS = "10000";
  });

  it("should fail if the stack doesn't exist", async () => {
    const err = Error("Stack not found");

    portainer.getStack.mockRejectedValue(err);
    portainer.getStackFile.mockRejectedValue(err);

    expect(webhook.handler(ctx, "123")).rejects.toBe(err);
  });

  it("should fail if the update fails", async () => {
    const err = Error("Some error");

    portainer.getStack.mockResolvedValue(exampleStack());
    portainer.getStackFile.mockResolvedValue({
      StackFileContent: stackFileContent,
    });
    portainer.updateStack.mockRejectedValue(err);

    expect(webhook.handler(ctx, String(id))).rejects.toBe(err);
  });

  it("should update the stack, pulling the latest images", async () => {
    portainer.getStack.mockResolvedValue(exampleStack());
    portainer.getStackFile.mockResolvedValue({
      StackFileContent: stackFileContent,
    });
    portainer.updateStack.mockResolvedValue(exampleStack(StackStatus.Active));

    const response = await webhook.handler(ctx, String(id));

    expect(disableTimeout.mock.calls).toHaveLength(1);
    expect(portainer.updateStack.mock.calls).toHaveLength(1);
    expect(portainer.updateStack.mock.calls[0]).toEqual([
      id,
      {
        endpointId,
        stackFileContent,
        prune: false,
        repullImageAndRedeploy: true,
      },
    ]);
    // Already Active -> no extra polling beyond the initial getStack.
    expect(portainer.getStack.mock.calls).toHaveLength(1);
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({
      id,
      name: "Example Stack",
      status: StackStatus.Active,
    });
  });

  it("should wait for an async deploy to finish before responding", async () => {
    portainer.getStack
      .mockResolvedValueOnce(exampleStack()) // initial fetch
      .mockResolvedValueOnce(exampleStack(StackStatus.Deploying)) // poll 1
      .mockResolvedValueOnce(exampleStack(StackStatus.Active)); // poll 2
    portainer.getStackFile.mockResolvedValue({
      StackFileContent: stackFileContent,
    });
    portainer.updateStack.mockResolvedValue(
      exampleStack(StackStatus.Deploying),
    );

    const response = await webhook.handler(ctx, String(id));

    expect(portainer.getStack.mock.calls).toHaveLength(3);
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({
      id,
      name: "Example Stack",
      status: StackStatus.Active,
    });
  });

  it("should respond 502 when the deploy ends in error", async () => {
    portainer.getStack
      .mockResolvedValueOnce(exampleStack()) // initial fetch
      .mockResolvedValueOnce(exampleStack(StackStatus.Error)); // poll 1
    portainer.getStackFile.mockResolvedValue({
      StackFileContent: stackFileContent,
    });
    portainer.updateStack.mockResolvedValue(
      exampleStack(StackStatus.Deploying),
    );

    let err: ApiError | undefined;
    try {
      await webhook.handler(ctx, String(id));
    } catch (e) {
      err = e as ApiError;
    }

    expect(err?.status).toBe(502);
  });
});
