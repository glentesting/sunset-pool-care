import { NextRequest, NextResponse } from "next/server";
import { qualifierSchema } from "@/lib/validation/qualifier";
import { upsertContact } from "@/lib/hubspot";

/**
 * Qualifier Form submit. Flow: validate -> upsert HubSpot contact (source-tagged
 * 'Pool Qualifier Form') -> workflows fire on HubSpot's side.
 */
export async function POST(req: NextRequest) {
  // 1. Re-validate server-side — never trust the client payload.
  const parsed = qualifierSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  try {
    // TODO: map fields + add hs source property 'Pool Qualifier Form'
    const { id } = await upsertContact({
      email: parsed.data.email,
      firstname: parsed.data.name,
      phone: parsed.data.phone,
    });
    return NextResponse.json({ ok: true, contactId: id });
  } catch (err) {
    console.error("submit-qualifier failed:", err);
    return NextResponse.json({ error: "Could not submit" }, { status: 502 });
  }
}
