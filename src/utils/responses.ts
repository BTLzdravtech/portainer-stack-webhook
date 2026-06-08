export class JsonResponse extends Response {
  constructor(status: number, json: unknown) {
    super(JSON.stringify(json), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
