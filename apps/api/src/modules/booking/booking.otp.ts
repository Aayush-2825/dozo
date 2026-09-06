import { RedisClient} from "@dozo/redis";
import { ConflictError } from "@dozo/types";

export async function verifyOtpWithAttempts(otpKey: string, attemptsKey: string, providedOtp: string, redis: RedisClient, maxAttempts: number = 3): Promise<void> {

    const storedOtp = await redis.get(otpKey);

    if(!storedOtp) {
        throw new ConflictError("OTP expired or invalid");
    }

    if(storedOtp !== providedOtp) {
        const attempts = await redis.incr(attemptsKey);
        if(attempts === 1) {
            await redis.expire(attemptsKey, 600); 
        }

        if(attempts >= maxAttempts) {
            await redis.del(otpKey, attemptsKey);
            throw new ConflictError("Too many incorrect attempts. Please request a new OTP.");
        }

        throw new ConflictError("Invalid OTP");
    }

    await redis.del(otpKey, attemptsKey);
}