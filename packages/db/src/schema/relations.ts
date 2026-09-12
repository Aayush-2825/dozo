import { defineRelations } from "drizzle-orm";
import { accountSchema as account } from "./account";
import { emailVerificationToken } from "./emailVerificationToken";
import { booking } from "./booking";
import { bookingCheckpoint } from "./bookingCheckpoint";
import { consumer } from "./consumer";
import { helper } from "./helper";
import { helperAvailability } from "./helperAvailability";
import { kyc } from "./kyc";
import { location } from "./location";
import { mfaBackupCode, mfaEnrollment } from "./mfa_enrollment";
import { organisation } from "./organisation";
import { payment } from "./payment";
import { session } from "./session";
import { user } from "./user";

export const appRelations = defineRelations(
  {
    user,
    account,
    emailVerificationToken,
    session,
    mfaEnrollment,
    mfaBackupCode,
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
    user: {
      accounts: r.many.account({
        from: r.user.id,
        to: r.account.userId,
      }),
      sessions: r.many.session({
        from: r.user.id,
        to: r.session.userId,
      }),
      mfaEnrollments: r.many.mfaEnrollment({
        from: r.user.id,
        to: r.mfaEnrollment.userId,
      }),
      consumers: r.many.consumer({
        from: r.user.id,
        to: r.consumer.userId,
      }),
      helpers: r.many.helper({
        from: r.user.id,
        to: r.helper.userId,
      }),
      emailVerificationTokens: r.many.emailVerificationToken({
        from: r.user.id,
        to: r.emailVerificationToken.userId,
      }),
    },
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },
    emailVerificationToken: {
      user: r.one.user({
        from: r.emailVerificationToken.userId,
        to: r.user.id,
      }),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },
    mfaEnrollment: {
      user: r.one.user({
        from: r.mfaEnrollment.userId,
        to: r.user.id,
      }),
      backupCodes: r.many.mfaBackupCode({
        from: r.mfaEnrollment.id,
        to: r.mfaBackupCode.mfaEnrollmentId,
      }),
    },
    mfaBackupCode: {
      mfaEnrollment: r.one.mfaEnrollment({
        from: r.mfaBackupCode.mfaEnrollmentId,
        to: r.mfaEnrollment.id,
      }),
    },
    consumer: {
      user: r.one.user({
        from: r.consumer.userId,
        to: r.user.id,
      }),
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
    helper: {
      user: r.one.user({
        from: r.helper.userId,
        to: r.user.id,
      }),
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
