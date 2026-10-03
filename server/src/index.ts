import { createHttpServer } from "./http";
import { envConfig } from "./config";

const config = envConfig();
const server = createHttpServer(config);
server.listen(config.port, "0.0.0.0", () => console.log(`material-shape-studio MCP listening on ${config.port}`));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
