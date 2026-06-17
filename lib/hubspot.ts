/**
 * HubSpot integration — DIRECT REST API, no middleware.
 * Portal: 244173183. Token lives in env (server-side only), never NEXT_PUBLIC.
 *
 * Phase 3 wiring. These signatures are the contract the API routes import.
 */
import "server-only";

const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const BASE = "https://api.hubapi.com";

export type ContactPayload = Record<string, string | number | boolean>;

/** Create or update a contact by email. Source-tag handled by caller. */
export async function upsertContact(_payload: ContactPayload): Promise<{ id: string }> {
  // TODO: POST /crm/v3/objects/contacts (or upsert by email). Auth: Bearer token.
  throw new Error("hubspot.upsertContact not implemented yet");
}

/** Create a follow-up task tied to a contact (used by Assessment MONITOR items). */
export async function createTask(_contactId: string, _subject: string, _dueIso: string): Promise<void> {
  // TODO: POST /crm/v3/objects/tasks + associate to contact
  throw new Error("hubspot.createTask not implemented yet");
}

void HUBSPOT_TOKEN;
void BASE;
