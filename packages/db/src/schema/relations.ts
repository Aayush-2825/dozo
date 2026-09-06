import { defineRelations } from "drizzle-orm";
import { booking } from "./booking";
import { bookingCheckpoint } from "./bookingCheckpoint";
import { consumer } from "./consumer";
import { helper } from "./helper";
import { helperAvailability } from "./helperAvailability";
import { kyc } from "./kyc";
import { location } from "./location";
import { organisation } from "./organisation";
import { payment } from "./payment";

export const appRelations = defineRelations(
  {
    consumer,
    location,
    organisation,
    helper,
    helperAvailability,
    kyc,
    booking,
    bookingCheckpoint,
    payment,
  },
  (r) => ({
    organisation: {
      location: r.one.location({
        from: r.organisation.id,
        to: r.location.organisationId,
      }),
      helpers: r.many.helper(),
      kyc: r.many.kyc({
        from: r.organisation.id,
        to: r.kyc.organisationId,
      }),
      bookings: r.many.booking({
        from: r.organisation.id,
        to: r.booking.organisationId,
      }),
      payments: r.many.payment({
        from: r.organisation.id,
        to: r.payment.organisationId,
      }),
    },
    helper: {
      organisation: r.one.organisation({
        from: r.helper.organisationId,
        to: r.organisation.id,
      }),
      availabilityWindows: r.many.helperAvailability(),
      kyc: r.many.kyc({
        from: r.helper.id,
        to: r.kyc.helperId,
      }),
      bookings: r.many.booking({
        from: r.helper.id,
        to: r.booking.helperId,
      }),
      payments: r.many.payment({
        from: r.helper.id,
        to: r.payment.helperId,
      }),
    },
    consumer: {
      locations: r.many.location(),
      bookings: r.many.booking({
        from: r.consumer.id,
        to: r.booking.consumerId,
      }),
      payments: r.many.payment({
        from: r.consumer.id,
        to: r.payment.consumerId,
      }),
    },
    booking: {
      consumer: r.one.consumer({
        from: r.booking.consumerId,
        to: r.consumer.id,
      }),
      helper: r.one.helper({
        from: r.booking.helperId,
        to: r.helper.id,
      }),
      organisation: r.one.organisation({
        from: r.booking.organisationId,
        to: r.organisation.id,
      }),
      checkpoints: r.many.bookingCheckpoint({
        from: r.booking.id,
        to: r.bookingCheckpoint.bookingId,
      }),
      payments: r.many.payment({
        from: r.booking.id,
        to: r.payment.bookingId,
      }),
    },
    bookingCheckpoint: {
      booking: r.one.booking({
        from: r.bookingCheckpoint.bookingId,
        to: r.booking.id,
      }),
    },
    kyc: {
      organisation: r.one.organisation({
        from: r.kyc.organisationId,
        to: r.organisation.id,
      }),
      helper: r.one.helper({
        from: r.kyc.helperId,
        to: r.helper.id,
      }),
    },
    helperAvailability: {
      helper: r.one.helper({
        from: r.helperAvailability.helperId,
        to: r.helper.id,
      }),
    },
    location: {
      consumer: r.one.consumer({
        from: r.location.consumerId,
        to: r.consumer.id,
      }),
      organisation: r.one.organisation({
        from: r.location.organisationId,
        to: r.organisation.id,
      }),
    },
    payment: {
      booking: r.one.booking({
        from: r.payment.bookingId,
        to: r.booking.id,
      }),
      consumer: r.one.consumer({
        from: r.payment.consumerId,
        to: r.consumer.id,
      }),
      helper: r.one.helper({
        from: r.payment.helperId,
        to: r.helper.id,
      }),
      organisation: r.one.organisation({
        from: r.payment.organisationId,
        to: r.organisation.id,
      }),
    },
  }),
);
