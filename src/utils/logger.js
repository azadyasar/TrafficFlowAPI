const { createLogger, loggers, format, transports } = require("winston");
const { combine, timestamp, label, printf } = format;
const config = require("config");
const chalk = require("chalk");

/**
 * Custom format type to print into log files
 * Structure:
 * timestamp - label of the logger - log level (error, warn, info, etc.) - message
 */
const customFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label} ${level.toUpperCase()}]: ${message}`;
});

/**
 * Set up configuration variables
 */
let logLevel,
  logLabel,
  errorLogPath,
  warnLogPath,
  infoLogPath,
  debugLogPath,
  exceptionLogPath;

if (config.has("Logger.logLevel")) {
  logLevel = config.get("Logger.logLevel");
  console.log(chalk.green("[CONFIG]:") + ` logLevel: ${logLevel}`);
} else {
  logLevel = "debug";
  console.log(
    chalk.orange("[CONFIG]:") +
      ` No logLevel is specified inside default.json config. Using default value: ${logLevel}`
  );
}

if (config.has("Logger.logLabel")) {
  logLabel = config.get("Logger.logLabel");
  console.log(chalk.green("[CONFIG]:") + ` logLabel: ${logLabel}`);
} else {
  logLabel = "AppDev";
  console.log(
    chalk.orange("[CONFIG]:") +
      ` No logLabel is specified inside default.json config. Using default value: ${logLabel}`
  );
}

if (config.has("Logger.errorLogPath")) {
  errorLogPath = config.get("Logger.errorLogPath");
  console.log(chalk.green("[CONFIG]:") + ` errorLogPath: ${errorLogPath}`);
} else {
  errorLogPath = "logs/error.log";
  console.log(
    chalk.orange("[CONFIG]: ") +
      `No errorLogPath is specified inside default.json config. Using default value: ${errorLogPath}`
  );
}

if (config.has("Logger.warnLogPath")) {
  warnLogPath = config.get("Logger.warnLogPath");
  console.log(chalk.green("[CONFIG]:") + ` warnLogPath: ${warnLogPath}`);
} else {
  warnLogPath = "logs/warn.log";
  console.log(
    chalk.orange("[CONFIG]: ") +
      `No warnLogPath is specified inside default.json config. Using default value: ${warnLogPath}`
  );
}

if (config.has("Logger.infoLogPath")) {
  infoLogPath = config.get("Logger.infoLogPath");
  console.log(chalk.green("[CONFIG]: ") + `infoLogPath: ${infoLogPath}`);
} else {
  infoLogPath = "logs/info.log";
  console.log(
    chalk.orange("[CONFIG]: ") +
      `No infoLogPath is specified inside default.json config. Using default value: ${infoLogPath}`
  );
}

if (config.has("Logger.debugLogPath")) {
  debugLogPath = config.get("Logger.debugLogPath");
  console.log(chalk.green("[CONFIG]: ") + `debugLogPath: ${debugLogPath}`);
} else {
  debugLogPath = "logs/debug.log";
  console.log(
    chalk.orange("[CONFIG]: ") +
      `No debugLogPath is specified inside default.json config. Using default value: ${debugLogPath}`
  );
}

if (config.has("Logger.exceptionLogPath")) {
  exceptionLogPath = config.get("Logger.exceptionLogPath");
  console.log(
    chalk.green("[CONFIG]: ") + `exceptionLogPath: ${exceptionLogPath}`
  );
} else {
  exceptionLogPath = "logs/exception.log";
  console.log(
    chalk.orange("[CONFIG]: ") +
      `No exceptionLogPath is specified inside default.json config. Using default value: ${exceptionLogPath}`
  );
}

const logger = createLogger({
  level: logLevel,
  transports: [
    new transports.File({
      filename: errorLogPath,
      level: "error",
      colorize: true,
      format: combine(label({ label: logLabel }), timestamp(), customFormat)
    }),
    new transports.File({
      filename: warnLogPath,
      level: "warn",
      colorize: true,
      format: combine(label({ label: logLabel }), timestamp(), customFormat)
    }),
    new transports.File({
      filename: infoLogPath,
      level: "info",
      colorize: true,
      format: combine(label({ label: logLabel }), timestamp(), customFormat)
    }),
    new transports.File({
      filename: debugLogPath,
      level: "debug",
      colorize: true,
      format: combine(label({ label: logLabel }), timestamp(), customFormat)
    }),
    new transports.Console({
      format: combine(
        format.colorize({
          colors: { info: "green", error: "red", warn: "yellow", debug: "cyan" }
        }),
        format.simple()
      )
    })
  ],
  exceptionHandlers: [
    new transports.File({ filename: exceptionLogPath, colorize: true }),
    new transports.Console()
  ],
  exitOnError: false
});

logger.stream = {
  write: function(message, encoding) {
    logger.info(message);
  }
};

loggers.add("general-logger", logger);

export default logger;

// module.exports = logger;
