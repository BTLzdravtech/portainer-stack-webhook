import { JsonResponse } from "./responses";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }

  get jsonStack() {
    return (
      this.stack
        ?.split("\n")
        .map((line) => line.trim())
        .slice(1) ?? []
    );
  }

  toResponse() {
    return new JsonResponse(this.status, {
      message: this.message,
      ...this.details,
      // Only expose the stack trace when explicitly debugging — avoids leaking
      // internal stack traces to clients in production.
      ...(process.env.LOG_LEVEL === "debug" ? { stack: this.jsonStack } : {}),
    });
  }
}

export class FetchError extends Error {
  constructor(private readonly response: Response) {
    super(`Failed to fetch: ${response.statusText}`);
  }

  toResponse() {
    return this.response;
  }
}

export function RequiredEnvError(key: string) {
  return new ApiError(500, `Required environment variable missing: ${key}`);
}

export function RequiredApiKeyError() {
  return new ApiError(500, "Required Portainer API key header missing");
}
