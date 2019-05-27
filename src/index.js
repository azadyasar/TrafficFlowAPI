require("dotenv").config();
import config from "config";
import logger from "./utils/logger";

const port = process.env.PORT || 5555;

import app from "./server";
const server = app.listen(port, () => {
  logger.info(`Running ${config.get("name")} on port ${port}`);
});

/**
 * Shut down server on uncaughtExceptions and SIGTERM signal in order not to leave the port dangling
 */
process
  .on("uncaughtException", exception => {
    if (server) {
      server.close();
      logger.error(
        `UncaughtException received. Shutting down server...\nException: ${exception}`
      );
    }
  })
  .on("SIGTERM", () => {
    if (server) {
      server.close();
      logger.info("SIGTERM received. Shutting down server...");
    }
  });
