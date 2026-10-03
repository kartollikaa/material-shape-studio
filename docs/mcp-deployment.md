# Remote MCP deployment

Build the portable container from the repository root with `docker build -f server/Dockerfile -t material-shape-studio-mcp .`. The image builds the Kotlin/JS engine and server, then runs under a non-root user without a JDK. It listens on `PORT` (default 3000), serves `/healthz` and `/mcp`, and requires `STUDIO_URL` and `ALLOWED_HOSTS`. Set `ALLOWED_ORIGINS` for browser clients. Keep proxy trust disabled unless the selected ingress topology is tested end to end.

Expose the service through an HTTPS ingress with a request-size bound and shared rate limiting. The in-memory service throttle applies only per instance. Health checks use `/healthz`. After deployment, run `node server/scripts/probe.mjs <complete HTTPS /mcp URL>` from outside the host, inspect the PNG and linked document, and test forwarded-header rejection through the actual proxy. Roll back by restoring the previous image revision and unsetting the website's `VITE_MCP_ENDPOINT` build setting if the service is unavailable.

The hosting provider, account, billing owner, hostname, ingress rules, and public release are pending an owner decision. Do not set the website endpoint until the external probe passes. The current build intentionally displays connection as unavailable with no endpoint configured.
