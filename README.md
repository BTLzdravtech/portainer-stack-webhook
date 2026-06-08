# Portainer Stack Webhook

An equivalent solution to Portainer BE's [Automatic Stack Updates](https://www.portainer.io/business-upsell?from=stack-webhook) feature, but free.

Just run the container, tell it how to access your portainer instance, and tada, it's done! :tada:

<!-- prettier-ignore -->
```yaml
# docker-compose.yml
services:
  stack-webhook:
    image: aklinker1/portainer-stack-webhook
    ports:
      - 3000:3000
    environment:
      BASE_URL: https://portainer.example.com/api # Required, full URL including /api
      PORT: 3000                                  # Optional, default 3000
      POLL_INTERVAL_MS: 5000                      # Optional, status poll interval, default 5s
      POLL_TIMEOUT_MS: 1800000                    # Optional, give up after this long, default 30m (0 = no timeout)
      LOG_LEVEL: info                             # Optional, debug|info|warn|error|silent, default info
```

The service logs each request and the full redeploy lifecycle — trigger, update accepted, every status poll, and the final outcome — as colored, timestamped lines. Use `LOG_LEVEL` to control verbosity (`debug` adds per-request entry lines; `warn` hides the routine poll chatter). The `X-API-Key` is never logged.

Authentication is per-request: every request must include an `X-API-Key` header containing a [Portainer API access token](https://docs.portainer.io/api/access). The token is forwarded to your Portainer instance, so the webhook performs whatever actions that token is allowed to.

To tell Portainer to pull the latest images and update the stack, make a simple POST request:

```sh
curl -X POST \
  -H "X-API-Key: your-portainer-api-token" \
  http://localhost:3000/api/webhook/stacks/:stackId
```

Portainer redeploys stacks asynchronously, so the webhook **waits for the redeploy to finish** before responding (polling the stack status every `POLL_INTERVAL_MS`, up to `POLL_TIMEOUT_MS`):

- **`200`** with `{ "id", "name", "status" }` once the stack is active again.
- **`502`** if the redeploy fails.
- **`504`** if it doesn't finish within `POLL_TIMEOUT_MS`.

Because pulling images can take many minutes (e.g. large or Windows images), the request can stay open for a long time. Make sure any client or reverse proxy in front of the webhook allows long-lived requests.

> [!NOTE]
> The `stackId` can be retrieved from the URL when visiting the stack details in Portainer. In the URL below, it would be `22` from the `id=22` query parameter.
>
> ```
> https://portainer.example.com/#!/1/docker/stacks/some_stack?id=22&type=1&regular=true&external=false&orphaned=false
> ```

## Contributing

To install dependencies:

```bash
bun install
```

To run:

1. Copy the `.env.template` to `.env` and fill it out with your portainer instance's info:
   ```sh
   cp .env.template .env
   ```
2. Start the server
   ```sh
   bun dev
   ```
3. Send a request to test it out
   ```sh
   curl -X POST \
     -H "X-API-Key: your-portainer-api-token" \
     http://localhost:3000/api/webhook/stacks/123
   ```

You can also run tests:

```sh
bun test
```
