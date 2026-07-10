# Rootless Podman Quadlet Examples

These files are examples for self-hosters who prefer systemd-managed rootless
Podman containers.

1. Build or publish `kombu-api:latest` and `kombu-ui:latest`.
2. Create a user-owned env file such as `~/.config/kombu/kombu.env`.
3. Copy `Caddyfile` to `~/.config/kombu/Caddyfile`.
4. Copy the Quadlet files to `~/.config/containers/systemd/`.
5. Run `systemctl --user daemon-reload`.
6. Start with `systemctl --user start kombu-db kombu-api kombu-ui kombu-worker kombu-edge`.

Use your own secret manager for database passwords and AI provider settings.
The examples intentionally contain no real credentials.

The API, UI, worker, and edge are separate containers. Only the Caddy edge
publishes port `8080`; its configuration should proxy `/api/*` and `/healthz`
to `kombu-api:8000` and all other requests to `kombu-ui:3000`.
