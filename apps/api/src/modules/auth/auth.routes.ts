import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@dozo/types";
import {
  getUserProfile,
  loginUser,
  logoutAllDevices,
  logoutUser,
  refreshAccessToken,
  registerUser,
  verifyEmail,
} from "./auth.service";
import { requireAuth } from "./auth.middleware";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const handleError = (
    error: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    if (error instanceof ValidationError) {
      return reply.status(400).send({ message: error.message });
    }
    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({ message: error.message });
    }
    if (error instanceof NotFoundError) {
      return reply.status(404).send({ message: error.message });
    }
    if (error instanceof ForbiddenError) {
      return reply.status(403).send({ message: error.message });
    }
    if (error instanceof ConflictError) {
      return reply.status(409).send({ message: error.message });
    }

    request.log.error(error);
    return reply.status(500).send({ message: "Internal Server Error" });
  };

  fastify.post(
    "/auth/register",
    {
      schema: {
        body: {
          type: "object",
          required: ["profileType", "email", "password", "name", "phone"],
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            profileType: { type: "string", enum: ["consumer", "helper"] },
            phone: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await registerUser(
          request.body as {
            profileType: "consumer" | "helper";
            email: string;
            password: string;
            name: string;
            phone: string;
          },
        );
        return reply.status(201).send(result);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  fastify.post(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          additionalProperties: false,
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, password } = request.body as {
          email: string;
          password: string;
        };
        const result = await loginUser(email, password);
        return reply.status(200).send(result);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  fastify.post(
    "/auth/refresh",
    {
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          additionalProperties: false,
          properties: {
            refreshToken: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { refreshToken } = request.body as { refreshToken: string };
        return reply.status(200).send(await refreshAccessToken(refreshToken));
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  fastify.post(
    "/auth/logout",
    {
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          additionalProperties: false,
          properties: {
            refreshToken: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { refreshToken } = request.body as { refreshToken: string };
        await logoutUser(refreshToken);
        return reply.status(200).send({ message: "Logged out successfully" });
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  fastify.post(
    "/auth/logout-all",
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.userId;
        if (!userId) throw new UnauthorizedError("Not authenticated");

        await logoutAllDevices(userId);
        return reply.status(200).send({ message: "Logged out of all devices" });
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  fastify.post(
    "/auth/verify-email",
    {
      schema: {
        body: {
          type: "object",
          required: ["token"],
          additionalProperties: false,
          properties: {
            token: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { token } = request.body as { token: string };
        const result = await verifyEmail(token);
        return reply.status(200).send({
          message: "Email verified successfully",
          ...result,
        });
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  fastify.get(
    "/auth/me",
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.userId;
        if (!userId) throw new UnauthorizedError("Not authenticated");

        const userProfile = await getUserProfile(userId);
        return reply.status(200).send(userProfile);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );
};
