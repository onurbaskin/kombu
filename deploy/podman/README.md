# Rootless Podman Quadlet Examples

These files are examples for self-hosters who prefer systemd-managed rootless
Podman containers.

1. Build or publish `kombu-api:latest` and `kombu-ui:latest`.
2. Create a user-owned env file such as `~/.config/kombu/kombu.env`.
3. Copy the Quadlet files to `~/.config/containers/systemd/`.
4. Run `systemctl --user daemon-reload`.
5. Start with `systemctl --user start kombu-db kombu-api kombu-ui`.

Use your own secret manager for database passwords and AI provider settings.
The examples intentionally contain no real credentials.
