import { db } from "../client";
import {
	booking,
	bookingCheckpoint,
	consumer,
	helper,
	helperAvailability,
	kyc,
	location,
	organisation,
	payment,
} from "../schema";

const ids = {
	consumer1: "seed-consumer-001",
	consumer2: "seed-consumer-002",
	organisation: "seed-organisation-001",
	organisationHelper: "seed-helper-organisation-001",
	organisationHelper2: "seed-helper-organisation-002",
	individualHelper: "seed-helper-individual-001",
	consumerLocation1: "seed-location-consumer-001",
	consumerLocation2: "seed-location-consumer-002",
	organisationLocation: "seed-location-organisation-001",
	availabilityOrgHelper: "seed-availability-001",
	kycOrgHelper: "seed-kyc-001",
	kycIndHelper: "seed-kyc-002",
	kycOrganisation: "seed-kyc-003",
	// Booking IDs for all states
	bookingRequested: "seed-booking-requested-001",
	bookingAccepted: "seed-booking-accepted-001",
	bookingArrived: "seed-booking-arrived-001",
	bookingInProgress: "seed-booking-in-progress-001",
	bookingAwaitingConfirmation: "seed-booking-awaiting-confirmation-001",
	bookingCompleted: "seed-booking-completed-001",
	bookingCancelled: "seed-booking-cancelled-001",
	// Checkpoints & Payments
	checkpointStart: "seed-checkpoint-start-001",
	checkpointMid: "seed-checkpoint-mid-001",
	checkpointEnd: "seed-checkpoint-end-001",
	paymentCompleted: "seed-payment-completed-001",
	paymentInProgress: "seed-payment-in-progress-001",
	paymentAwaitingConfirmation: "seed-payment-awaiting-confirmation-001",
};

async function seed() {
	console.log("🌱 Starting database seed...");

	// 1. Consumers & Organisations
	await db.insert(consumer).values([
		{
			id: ids.consumer1,
			name: "Ava Sharma",
			email: "ava.seed@example.com",
			emailVerified: true,
			phone: "+919876543210",
			phoneVerified: true,
		},
		{
			id: ids.consumer2,
			name: "Karan Verma",
			email: "karan.seed@example.com",
			emailVerified: true,
			phone: "+919876543220",
			phoneVerified: true,
		},
	]).onConflictDoNothing();

	await db.insert(organisation).values({
		id: ids.organisation,
		name: "Dozo Care Services",
		email: "care.seed@example.com",
		emailVerified: true,
		phone: "+919876543211",
	}).onConflictDoNothing();

	// 2. Helpers (1 Organisational, 1 Individual Live)
	await db.insert(helper).values([
		{
			id: ids.organisationHelper,
			name: "Maya Patel",
			email: "maya.seed@example.com",
			phone: "+919876543212",
			organisationId: ids.organisation,
		},
		{
			id: ids.organisationHelper2,
			name: "Neha Iyer",
			email: "neha.seed@example.com",
			phone: "+919876543214",
			organisationId: ids.organisation,
		},
		{
			id: ids.individualHelper,
			name: "Rohan Mehta",
			email: "rohan.seed@example.com",
			phone: "+919876543213",
			isLive: true,
		},
	]).onConflictDoNothing();

	// 3. Locations
	await db.insert(location).values([
		{
			id: ids.consumerLocation1,
			name: "home",
			address: "14 Linking Road, Mumbai, Maharashtra",
			latitude: 19.0607,
			longitude: 72.8362,
			consumerId: ids.consumer1,
		},
		{
			id: ids.consumerLocation2,
			name: "home",
			address: "88 MG Road, Bengaluru, Karnataka",
			latitude: 12.9750,
			longitude: 77.6090,
			consumerId: ids.consumer2,
		},
		{
			id: ids.organisationLocation,
			name: "work",
			address: "22 Residency Road, Bengaluru, Karnataka",
			latitude: 12.9716,
			longitude: 77.5946,
			organisationId: ids.organisation,
		},
	]).onConflictDoNothing();

	// 4. Helper Availability
	await db.insert(helperAvailability).values([
		{
			id: ids.availabilityOrgHelper,
			helperId: ids.organisationHelper,
			dayOfWeek: 1, // Monday
			startTime: "09:00",
			endTime: "17:00",
		},
	]).onConflictDoNothing();

	// 5. KYC Records (1 Organisation, 1 Helper Verified, 1 Helper Pending)
	await db.insert(kyc).values([
		{
			id: ids.kycOrgHelper,
			helperId: ids.organisationHelper,
			documentType: "government_id",
			documentUrl: "https://example.com/seed-documents/maya-id.pdf",
			documentStatus: "verified",
			videoKycStatus: "verified",
			overallStatus: "verified",
			submittedAt: new Date("2026-01-15T10:00:00.000Z"),
			documentReviewedAt: new Date("2026-01-16T10:00:00.000Z"),
			videoReviewedAt: new Date("2026-01-16T11:00:00.000Z"),
			overallReviewedAt: new Date("2026-01-16T12:00:00.000Z"),
		},
		{
			id: ids.kycOrganisation,
			organisationId: ids.organisation,
			documentType: "business_registration",
			documentUrl: "https://example.com/seed-documents/dozo-registration.pdf",
			documentStatus: "verified",
			videoKycStatus: "verified",
			overallStatus: "verified",
			submittedAt: new Date("2026-01-10T10:00:00.000Z"),
			documentReviewedAt: new Date("2026-01-11T10:00:00.000Z"),
			videoReviewedAt: new Date("2026-01-11T11:00:00.000Z"),
			overallReviewedAt: new Date("2026-01-11T12:00:00.000Z"),
		},
		{
			id: ids.kycIndHelper,
			helperId: ids.individualHelper,
			documentType: "passport",
			documentUrl: "https://example.com/seed-documents/rohan-id.pdf",
			documentStatus: "pending",
			videoKycStatus: "pending",
			overallStatus: "pending",
			submittedAt: new Date("2026-02-01T10:00:00.000Z"),
		},
	]).onConflictDoNothing();

	// 6. Bookings (Spanning all lifecycle states)
	await db.insert(booking).values([
		// REQUESTED State (Ready to test acceptBooking or cancelBooking)
		{
			id: ids.bookingRequested,
			consumerId: ids.consumer1,
			status: "requested",
			serviceType: "home_care",
			subserviceType: "elderly_support",
			price: 1000,
			serviceAddressSnapshot: "14 Linking Road, Mumbai, Maharashtra",
			serviceLatitudeSnapshot: 19.0607,
			serviceLongitudeSnapshot: 72.8362,
			scheduledAt: new Date("2026-03-01T10:00:00.000Z"),
		},
		// ACCEPTED State (Ready to test startJob or cancelBooking)
		{
			id: ids.bookingAccepted,
			consumerId: ids.consumer1,
			helperId: ids.organisationHelper,
			organisationId: ids.organisation,
			status: "accepted",
			serviceType: "home_care",
			subserviceType: "elderly_support",
			price: 1200,
			serviceAddressSnapshot: "14 Linking Road, Mumbai, Maharashtra",
			serviceLatitudeSnapshot: 19.0607,
			serviceLongitudeSnapshot: 72.8362,
			organisationNameSnapshot: "Dozo Care Services",
			helperNameSnapshot: "Maya Patel",
			scheduledAt: new Date("2026-03-02T10:00:00.000Z"),
			acceptedAt: new Date("2026-03-01T11:00:00.000Z"),
		},
		// ARRIVED State (Ready to test startJob)
		{
			id: ids.bookingArrived,
			consumerId: ids.consumer1,
			helperId: ids.individualHelper,
			status: "arrived",
			serviceType: "home_care",
			subserviceType: "elderly_support",
			price: 1100,
			serviceAddressSnapshot: "14 Linking Road, Mumbai, Maharashtra",
			serviceLatitudeSnapshot: 19.0607,
			serviceLongitudeSnapshot: 72.8362,
			helperNameSnapshot: "Rohan Mehta",
			scheduledAt: new Date("2026-03-03T10:00:00.000Z"),
			acceptedAt: new Date("2026-03-02T11:00:00.000Z"),
			arrivedAt: new Date("2026-03-03T09:55:00.000Z"),
		},
		// IN_PROGRESS State (Ready to test endJob)
		{
			id: ids.bookingInProgress,
			consumerId: ids.consumer2,
			helperId: ids.organisationHelper2,
			organisationId: ids.organisation,
			status: "in_progress",
			serviceType: "home_care",
			subserviceType: "elderly_support",
			price: 1500,
			serviceAddressSnapshot: "88 MG Road, Bengaluru, Karnataka",
			serviceLatitudeSnapshot: 12.9750,
			serviceLongitudeSnapshot: 77.6090,
			organisationNameSnapshot: "Dozo Care Services",
			helperNameSnapshot: "Neha Iyer",
			scheduledAt: new Date("2026-02-28T09:00:00.000Z"),
			acceptedAt: new Date("2026-02-28T08:00:00.000Z"),
			arrivedAt: new Date("2026-02-28T08:55:00.000Z"),
			inProgressAt: new Date("2026-02-28T09:00:00.000Z"),
		},
		// AWAITING_CONFIRMATION State (Ready to test confirmCompletion)
		{
			id: ids.bookingAwaitingConfirmation,
			consumerId: ids.consumer2,
			helperId: ids.organisationHelper,
			organisationId: ids.organisation,
			status: "awaiting_confirmation",
			serviceType: "home_care",
			subserviceType: "elderly_support",
			price: 1400,
			serviceAddressSnapshot: "88 MG Road, Bengaluru, Karnataka",
			serviceLatitudeSnapshot: 12.9750,
			serviceLongitudeSnapshot: 77.6090,
			organisationNameSnapshot: "Dozo Care Services",
			helperNameSnapshot: "Maya Patel",
			scheduledAt: new Date("2026-03-04T09:00:00.000Z"),
			acceptedAt: new Date("2026-03-04T08:00:00.000Z"),
			arrivedAt: new Date("2026-03-04T08:55:00.000Z"),
			inProgressAt: new Date("2026-03-04T09:00:00.000Z"),
			awaitingConfirmationAt: new Date("2026-03-04T11:00:00.000Z"),
		},
		// COMPLETED State
		{
			id: ids.bookingCompleted,
			consumerId: ids.consumer1,
			helperId: ids.organisationHelper,
			organisationId: ids.organisation,
			status: "completed",
			serviceType: "home_care",
			subserviceType: "elderly_support",
			price: 1250,
			serviceAddressSnapshot: "14 Linking Road, Mumbai, Maharashtra",
			serviceLatitudeSnapshot: 19.0607,
			serviceLongitudeSnapshot: 72.8362,
			organisationNameSnapshot: "Dozo Care Services",
			helperNameSnapshot: "Maya Patel",
			scheduledAt: new Date("2026-02-10T09:00:00.000Z"),
			acceptedAt: new Date("2026-02-10T08:00:00.000Z"),
			arrivedAt: new Date("2026-02-10T08:55:00.000Z"),
			inProgressAt: new Date("2026-02-10T09:05:00.000Z"),
			awaitingConfirmationAt: new Date("2026-02-10T11:00:00.000Z"),
			completedAt: new Date("2026-02-10T11:15:00.000Z"),
		},
		// CANCELLED State
		{
			id: ids.bookingCancelled,
			consumerId: ids.consumer2,
			status: "cancelled",
			serviceType: "home_care",
			subserviceType: "elderly_support",
			price: 800,
			serviceAddressSnapshot: "88 MG Road, Bengaluru, Karnataka",
			serviceLatitudeSnapshot: 12.9750,
			serviceLongitudeSnapshot: 77.6090,
			scheduledAt: new Date("2026-02-15T10:00:00.000Z"),
			cancelledAt: new Date("2026-02-14T12:00:00.000Z"),
			cancellationReason: "consumer_cancelled",
		},
	]).onConflictDoNothing();

	// 7. Booking Checkpoints
	await db.insert(bookingCheckpoint).values([
		{
			id: ids.checkpointStart,
			bookingId: ids.bookingCompleted,
			type: "start",
			latitude: 19.0607,
			longitude: 72.8362,
			capturedAt: new Date("2026-02-10T09:05:00.000Z"),
		},
		{
			id: ids.checkpointMid,
			bookingId: ids.bookingCompleted,
			type: "mid_job",
			latitude: 19.0608,
			longitude: 72.8363,
			capturedAt: new Date("2026-02-10T10:00:00.000Z"),
		},
		{
			id: ids.checkpointEnd,
			bookingId: ids.bookingCompleted,
			type: "end",
			latitude: 19.0609,
			longitude: 72.8364,
			capturedAt: new Date("2026-02-10T11:00:00.000Z"),
		},
	]).onConflictDoNothing();

	// 8. Payment
	await db.insert(payment).values({
		id: ids.paymentCompleted,
		bookingId: ids.bookingCompleted,
		consumerId: ids.consumer1,
		helperId: ids.organisationHelper,
		organisationId: ids.organisation,
		amountPaid: 1250,
		platformCommission: 125,
		helperPayout: 1125,
		status: "captured",
		escrowStatus: "released",
		paymentMethod: "card",
		gatewayId: "seed-gateway",
		gatewayTransactionId: "seed-transaction-001",
		gatewayPaymentMethod: "visa",
		gatewayPaymentStatus: "captured",
		idempotencyKey: "seed-payment-key-001",
		authorizedAt: new Date("2026-02-10T08:30:00.000Z"),
		capturedAt: new Date("2026-02-10T11:20:00.000Z"),
		releasedAt: new Date("2026-02-10T11:25:00.000Z"),
	}).onConflictDoNothing();

	await db.insert(payment).values({
		id: ids.paymentInProgress,
		bookingId: ids.bookingInProgress,
		consumerId: ids.consumer2,
		helperId: ids.organisationHelper2,
		organisationId: ids.organisation,
		amountPaid: 1500,
		platformCommission: 150,
		helperPayout: 1350,
		status: "captured",
		escrowStatus: "held",
		paymentMethod: "card",
		gatewayId: "seed-gateway",
		gatewayTransactionId: "seed-transaction-002",
		gatewayPaymentMethod: "visa",
		gatewayPaymentStatus: "captured",
		idempotencyKey: "seed-payment-key-002",
		authorizedAt: new Date("2026-02-28T08:30:00.000Z"),
		capturedAt: new Date("2026-02-28T09:05:00.000Z"),
	}).onConflictDoNothing();

	await db.insert(payment).values({
		id: ids.paymentAwaitingConfirmation,
		bookingId: ids.bookingAwaitingConfirmation,
		consumerId: ids.consumer2,
		helperId: ids.organisationHelper,
		organisationId: ids.organisation,
		amountPaid: 1400,
		platformCommission: 140,
		helperPayout: 1260,
		status: "captured",
		escrowStatus: "held",
		paymentMethod: "card",
		gatewayId: "seed-gateway",
		gatewayTransactionId: "seed-transaction-003",
		gatewayPaymentMethod: "visa",
		gatewayPaymentStatus: "captured",
		idempotencyKey: "seed-payment-key-003",
		authorizedAt: new Date("2026-03-04T08:30:00.000Z"),
		capturedAt: new Date("2026-03-04T09:05:00.000Z"),
	}).onConflictDoNothing();

	console.log("✅ Database seed completed successfully.");
}

seed()
	.catch((error) => {
		console.error("❌ Database seed failed:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$client.end();
	});