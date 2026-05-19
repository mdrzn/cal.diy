// CORSI: orphaned router in cal.diy (router exists in packages/trpc but the
// Next.js page route exposing it was missing). Used by data-table filtering UI.
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { filterSegmentsRouter } from "@calcom/trpc/server/routers/viewer/filterSegments/_router";

export default createNextApiHandler(filterSegmentsRouter);
