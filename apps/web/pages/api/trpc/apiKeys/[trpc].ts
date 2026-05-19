// CORSI: this Next.js page route was missing in cal.diy — the apiKeysRouter
// existed under packages/trpc but the page exposing it at /api/trpc/apiKeys/*
// wasn't included, so the UI's "Create API key" call 404'd with an HTML body
// (which the client tried to JSON.parse, producing "Unexpected token '<'").
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { apiKeysRouter } from "@calcom/trpc/server/routers/viewer/apiKeys/_router";

export default createNextApiHandler(apiKeysRouter);
