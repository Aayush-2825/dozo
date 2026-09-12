import { FastifyPluginAsync } from "fastify";
import {
  acceptBooking,
  cancelBooking,
  confirmCompletion,
  endJob,
  startJob,
} from "./booking.service";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@dozo/types";
import type { FastifyRequest , FastifyReply} from "fastify";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { hasProfileType } from "../auth/auth.tokens";

export const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  // Helper to standardise domain error handling
  const handleError = (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
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

  // POST /bookings/:bookingId/accept
  fastify.post(
    "/bookings/:bookingId/accept",
    {
      preHandler: [requireAuth, requireRole("helper")],
      schema: {
        params: {
          type: "object",
          required: ["bookingId"],
          properties: { bookingId: { type: "string" } },
        },
        body: {
          type: "object",
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const userId = request.user?.userId;

      try {
        const updatedBooking = await acceptBooking(bookingId, userId!);
        return reply.status(200).send(updatedBooking);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  // POST /bookings/:bookingId/cancel
  fastify.post(
    "/bookings/:bookingId/cancel",
    {
      preHandler: [requireAuth],
      schema: {
        params: {
          type: "object",
          required: ["bookingId"],
          properties: { bookingId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["initiatedBy", "reason"],
          properties: {
            initiatedBy: {
              type: "object",
              required: ["role"],
              additionalProperties: false,
              properties: {
                role: {
                  type: "string",
                  enum: ["consumer", "helper"],
                },
              },
            },
            reason: {
              type: "string",
              enum: [
                "consumer_cancelled",
                "helper_cancelled",
                "helper_no_show",
                "system_timeout",
                "admin_override",
                "consumer_no_show",
              ],
            },
            note: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const { initiatedBy, reason, note } = request.body as {
        initiatedBy: {
          role: "consumer" | "helper";
        };
        reason:
          | "consumer_cancelled"
          | "helper_cancelled"
          | "helper_no_show"
          | "system_timeout"
          | "admin_override"
          | "consumer_no_show";
        note?: string;
      };

      try {
        if (!hasProfileType(request.user!, initiatedBy.role)) {
          throw new ForbiddenError(
            `The ${initiatedBy.role} role is not available for this account`,
          );
        }

        const updatedBooking = await cancelBooking({
          bookingId,
          initiatedBy: {
            id: request.user!.userId,
            role: initiatedBy.role,
          },
          reason,
          note,
        });
        return reply.status(200).send(updatedBooking);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  // POST /bookings/:bookingId/start
  fastify.post(
    "/bookings/:bookingId/start",
    {
      preHandler: [requireAuth, requireRole("helper")],
      schema: {
        params: {
          type: "object",
          required: ["bookingId"],
          properties: { bookingId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["startOtp"],
          additionalProperties: false,
          properties: {
            startOtp: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply  ) => {
      const { bookingId } = request.params as { bookingId: string };
      const { startOtp } = request.body as {
        startOtp: string;
      };
      const userId = request.user?.userId;

      try {
        const updatedBooking = await startJob(
          bookingId,
          userId!,
          startOtp,
          fastify.redis,
        );
        return reply.status(200).send(updatedBooking);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  // POST /bookings/:bookingId/end
  fastify.post(
    "/bookings/:bookingId/end",
    {
      preHandler: [requireAuth, requireRole("helper")],
      schema: {
        params: {
          type: "object",
          required: ["bookingId"],
          properties: { bookingId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["endOtp"],
          additionalProperties: false,
          properties: {
            endOtp: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const { endOtp } = request.body as {
        endOtp: string;
      };
      const userId = request.user?.userId;

      try {
        const updatedBooking = await endJob(
          bookingId,
          userId!,
          endOtp,
          fastify.redis,
        );
        return reply.status(200).send(updatedBooking);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  // POST /bookings/:bookingId/confirm
  fastify.post(
    "/bookings/:bookingId/confirm",
    {
      preHandler: [requireAuth, requireRole("consumer")],
      schema: {
        params: {
          type: "object",
          required: ["bookingId"],
          properties: { bookingId: { type: "string" } },
        },
        body: {
          type: "object",
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const userId = request.user?.userId;

      try {
        const updatedBooking = await confirmCompletion(bookingId, userId!);
        return reply.status(200).send(updatedBooking);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );
};
