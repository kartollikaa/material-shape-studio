# Material Shape Studio MCP

The remote MCP service lets compatible coding agents list Material shapes, create a shape from a catalogue name or complete `ShapeDocument`, compare shapes as a PNG, and export the same document as Compose, SVG, or CSS. The website remains static; the service is a separate Node process at `/mcp`.

The four tools are `list_shapes`, `create_shape`, `preview_shapes`, and `export_shape`. A shape document is always passed in full. `create_shape` returns bounds, engine version, warnings, and a Studio link carrying the document. `preview_shapes` returns an image block and Studio links so hosts without image display can still open the comparison inputs. Exporters use the same core code as the Studio.

The service runs geometry and raster jobs in killable workers with a bounded queue and deadline. It limits JSON request size, shape document size, effective vertex count, transforms, comparison count, and labels. The in-process throttle is per service instance; public ingress also needs rate limiting. Browser origins and hostnames are allowlisted. Native clients without an `Origin` header can connect. The service trusts the socket address for its local throttle and does not trust forwarded headers. Logs contain request IDs and outcomes, without documents or labels.

For local development, build the engine, run `npm ci`, and run `npm run build -w server`. Set `STUDIO_URL` to the HTTPS website base, `ALLOWED_HOSTS` to comma-separated hostnames, and `ALLOWED_ORIGINS` to allowed browser origin hostnames. Run `npm start -w server`; the default port is 3000. `/healthz` reports readiness. Test the endpoint with `node server/scripts/probe.mjs http://127.0.0.1:3000/mcp`.

The website's Connect page is unavailable until `VITE_MCP_ENDPOINT` is set to a verified public HTTPS `/mcp` URL at build time. Visiting the page does not install software or alter a user's agent configuration. Claude Code accepts a remote HTTP server through `claude mcp add --transport http`; Cursor accepts a named remote URL in MCP settings. Host approval and tool display vary by client.
