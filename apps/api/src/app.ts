import Fastify from "fastify";
import { currentLogger } from "./utils/pino";
import dbPlugin from "./plugins/db";
import redisPlugin from "./plugins/redis";
import { bookingRoutes } from "./modules/booking/booking.routes";

const app = Fastify({
  logger: currentLogger,
});

app.register(dbPlugin);
app.register(redisPlugin);

app.register(bookingRoutes, { prefix: "/api" });

app.get("/", async (_request, reply) => {
  return reply.send({ message: "Hello, World!" });
});

export default app;
