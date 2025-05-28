import pino from "pino";

const transport = pino.transport({
  targets: [
    {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
      },
      level: "debug", // Capture debug and above in console
    },
    {
      target: "pino/file",
      options: { destination: "logs/error.log" },
      level: "error", // Capture only errors in file
    },
  ],
});

const logger = pino(
  {
    level: "debug", // Enable debug, info, error, etc.
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

export default logger;
