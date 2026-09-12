import Fastify from "fastify";
import { currentLogger } from "./utils/pino";
import dbPlugin from "./plugins/db";
import redisPlugin from "./plugins/redis";
import { bookingRoutes } from "./modules/booking/booking.routes";
import { ForbiddenError, UnauthorizedError } from "@dozo/types";

const app = Fastify({
  logger: currentLogger,
});

app.register(dbPlugin);
app.register(redisPlugin);

app.decorateRequest("user", null);

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof UnauthorizedError) {
    return reply.status(401).send({ message: error.message });
  }

  if (error instanceof ForbiddenError) {
    return reply.status(403).send({ message: error.message });
  }

  throw error;
});

app.register(bookingRoutes, { prefix: "/api" });

app.get("/", async (_request, reply) => {
  return reply.send({ message: "Hello, World!" });
});

export default app;
