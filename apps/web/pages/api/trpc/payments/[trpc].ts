// CORSI: orphaned router in cal.diy (router exists in packages/trpc but the
// Next.js page route exposing it was missing). Used by the Stripe payment app
// for paid bookings — needed only if you enable the Stripe app.
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { paymentsRouter } from "@calcom/trpc/server/routers/viewer/payments/_router";

export default createNextApiHandler(paymentsRouter);
