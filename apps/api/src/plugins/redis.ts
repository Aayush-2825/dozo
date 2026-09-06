import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { createRedisClient, RedisClient } from "@dozo/redis";
import { env } from "../utils/env";

declare module "fastify" {
  interface FastifyInstance {
    redis: RedisClient;
  }
}

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redis = createRedisClient(env.REDIS_URL);

  fastify.decorate("redis", redis);

  fastify.addHook("onClose", async (instance) => {
    await instance.redis.quit();
  });
};

export default fp(redisPlugin, { name: "redis" });