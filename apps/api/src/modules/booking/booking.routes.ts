import { FastifyPluginAsync } from "fastify";
import {
  acceptBooking,
  cancelBooking,
  confirmCompletion,
  endJob,
  startJob,
} from "./booking.service";
import { ConflictError, ForbiddenError, NotFoundError } from "@dozo/types";
import type { FastifyRequest , FastifyReply} from "fastify";

export const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  // Helper to standardise domain error handling
  const handleError = (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
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
      schema: {
        params: {
          type: "object",
          required: ["bookingId"],
          properties: { bookingId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["helperId"],
          properties: { helperId: { type: "string" } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const { helperId } = request.body as { helperId: string };

      try {
        const updatedBooking = await acceptBooking(bookingId, helperId);
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
              required: ["id", "role"],
              properties: {
                id: { type: "string" },
                role: {
                  type: "string",
                  enum: ["consumer", "helper", "admin", "system"],
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
          id: string;
          role: "consumer" | "helper" | "admin" | "system";
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
        const updatedBooking = await cancelBooking({
          bookingId,
          initiatedBy,
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
      schema: {
        params: {
          type: "object",
          required: ["bookingId"],
          properties: { bookingId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["startOtp", "helperId"],
          properties: {
            startOtp: { type: "string" },
            helperId: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply  ) => {
      const { bookingId } = request.params as { bookingId: string };
      const { startOtp, helperId } = request.body as {
        startOtp: string;
        helperId: string;
      };

      try {
        const updatedBooking = await startJob(
          bookingId,
          helperId,
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
      schema: {
        params: {
          type: "object",
          required: ["bookingId"],
          properties: { bookingId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["endOtp", "helperId"],
          properties: {
            endOtp: { type: "string" },
            helperId: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const { endOtp, helperId } = request.body as {
        endOtp: string;
        helperId: string;
      };

      try {
        const updatedBooking = await endJob(
          bookingId,
          helperId,
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
      schema: {
        params: {
          type: "object",
          required: ["bookingId"],
          properties: { bookingId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["consumerId"],
          properties: { consumerId: { type: "string" } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const { consumerId } = request.body as { consumerId: string };

      try {
        const updatedBooking = await confirmCompletion(bookingId, consumerId);
        return reply.status(200).send(updatedBooking);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );
};
