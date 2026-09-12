import { ForbiddenError, UnauthorizedError } from "@dozo/types";
import type { FastifyReply, FastifyRequest } from "fastify";
import { hasProfileType, type ProfileType, verifyAccessToken, type TokenPayload } from "./auth.tokens";

declare module "fastify" {
    interface FastifyRequest {
        user: TokenPayload | null;
    }
}

export async function requireAuth(
    req: FastifyRequest,
    _reply: FastifyReply,
) {
    const authHeader = req.headers.authorization;
    const [scheme, token, ...extraParts] = authHeader?.trim().split(/\s+/) ?? [];

    if (scheme !== "Bearer" || !token || extraParts.length > 0) {
        throw new UnauthorizedError("Missing or invalid Authorization header");
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
}

export function requireRole(profileType: ProfileType) {
    return async (req: FastifyRequest, _reply: FastifyReply) => {
        if (!req.user) {
            throw new UnauthorizedError("Authentication required");
        }

        if (!hasProfileType(req.user, profileType)) {
            throw new ForbiddenError(`The ${profileType} role is required`);
        }
    };
}