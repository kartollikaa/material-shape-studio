# Unpublished remote MCP deployment prototype

The owner selected a local CLI/plugin release with no paid host. The instructions below are retained for a possible later remote release and must not be used to advertise an endpoint now. The website no longer reads `VITE_MCP_ENDPOINT`.

Build the portable container from the repository root with `docker build -f server/Dockerfile -t material-shape-studio-mcp .`. The image builds the Kotlin/JS engine and server, then runs under a non-root user without a JDK. It listens on `PORT` (default 3000), serves `/healthz` and `/mcp`, and requires `STUDIO_URL` and `ALLOWED_HOSTS`. Set `ALLOWED_ORIGINS` for browser clients. Keep proxy trust disabled unless the selected ingress topology is tested end to end.

Expose the service through an HTTPS ingress with a request-size bound and shared rate limiting. The in-memory service throttle applies only per instance. Health checks use `/healthz`. After deployment, run `node server/scripts/probe.mjs <complete HTTPS /mcp URL>` from outside the host, inspect the PNG and linked document, and test forwarded-header rejection through the actual proxy. Roll back by restoring the previous image revision. A future remote release would need a new, explicitly reviewed website connection setting.

There is no selected hosting provider, billing owner, or public hostname. No remote release is scheduled.
