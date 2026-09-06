import Redis from "ioredis";

export function createRedisClient(redisUrl: string) {
  const redis = new Redis(redisUrl);
  redis.on("error", (err) => {
    console.log(`Redis connection error: ${err.message}`);
  });

  return redis;
}

export type RedisClient = ReturnType<typeof createRedisClient>;