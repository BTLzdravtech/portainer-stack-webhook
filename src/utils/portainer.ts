import { FetchError, RequiredEnvError } from "./errors";

export async function createPortainerApi(apiKey: string) {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) throw RequiredEnvError(`BASE_URL`);

  const checkResponse = (response: Response, expectedStatus = 200) => {
    if (response.status !== expectedStatus) throw new FetchError(response);
  };

  const authHeaders = {
    "X-API-Key": apiKey,
  };

  return {
    async listStacks(): Promise<PortainerStack[]> {
      const res = await fetch(`${baseUrl}/stacks`, {
        headers: authHeaders,
      });

      checkResponse(res);
      return (await res.json()) as PortainerStack[];
    },

    async getStack(id: number): Promise<PortainerStack> {
      const res = await fetch(`${baseUrl}/stacks/${id}`, {
        headers: authHeaders,
      });

      checkResponse(res);
      return (await res.json()) as PortainerStack;
    },

    async getStackFile(id: number): Promise<PortainerStackFile> {
      const res = await fetch(`${baseUrl}/stacks/${id}/file`, {
        headers: authHeaders,
      });

      checkResponse(res);
      return (await res.json()) as PortainerStackFile;
    },

    async updateStack(
      id: number,
      options: {
        endpointId: number;
        prune: boolean;
        repullImageAndRedeploy: boolean;
        stackFileContent: string;
      },
    ): Promise<PortainerStack> {
      const updateUrl = new URL(`${baseUrl}/stacks/${id}`);
      updateUrl.searchParams.set("endpointId", String(options.endpointId));

      const res = await fetch(updateUrl.href, {
        method: "PUT",
        body: JSON.stringify({
          prune: options.prune,
          repullImageAndRedeploy: options.repullImageAndRedeploy,
          stackFileContent: options.stackFileContent,
        }),
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });

      checkResponse(res);
      return (await res.json()) as PortainerStack;
    },
  };
}

/**
 * Portainer stack status values, returned on the `Status` field of a stack.
 * Since Portainer made stack redeploy asynchronous, an update leaves the stack
 * in `Deploying` until the background deployment finishes (`Active`/`Error`).
 */
export const StackStatus = {
  Active: 1,
  Inactive: 2,
  Deploying: 3,
  Error: 4,
} as const;

/** Human-readable name for a stack status, for logging. */
export function stackStatusName(status?: number): string {
  switch (status) {
    case StackStatus.Active:
      return "active";
    case StackStatus.Inactive:
      return "inactive";
    case StackStatus.Deploying:
      return "deploying";
    case StackStatus.Error:
      return "error";
    default:
      return status === undefined ? "unknown" : String(status);
  }
}

export interface PortainerStack {
  Id: number;
  Name: string;
  EndpointId: number;
  /** Optional: absent on older Portainer versions and external stacks. */
  Status?: number;
}

export interface PortainerStackFile {
  StackFileContent: string;
}

export type PortainerApi = Awaited<ReturnType<typeof createPortainerApi>>;
