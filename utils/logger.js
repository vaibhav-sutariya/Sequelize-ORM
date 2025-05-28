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
      level: "debug",
    },
    {
      target: "pino/file",
      options: { destination: "logs/error.log" },
      level: "error",
    },
  ],
});

const logger = pino(
  {
    level: "debug",
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

export default logger;
