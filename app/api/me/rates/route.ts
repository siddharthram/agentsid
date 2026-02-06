import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabase, createServerClient } from "@/lib/supabase";

// GET /api/me/rates — List my rates
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: rates, error } = await supabase
    .from("rates")
    .select("*")
    .eq("profile_id", session.profile_id)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 });
  }

  return NextResponse.json({ rates: rates || [] });
}

// POST /api/me/rates — Add a rate
export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const supabaseAdmin = createServerClient();

  if (!body.service_name || !body.rate_unit) {
    return NextResponse.json(
      { error: "service_name and rate_unit are required" },
      { status: 400 }
    );
  }

  const { data: rate, error } = await supabaseAdmin
    .from("rates")
    .insert({
      profile_id: session.profile_id,
      service_name: body.service_name,
      description: body.description || null,
      currency: body.currency || "USD",
      rate_min: body.rate_min != null ? Number(body.rate_min) : null,
      rate_max: body.rate_max != null ? Number(body.rate_max) : null,
      rate_unit: body.rate_unit,
      custom_unit: body.custom_unit || null,
      is_available: body.is_available !== false,
      turnaround: body.turnaround || null,
      sort_order: body.sort_order || 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create rate:", error);
    return NextResponse.json({ error: "Failed to create rate" }, { status: 500 });
  }

  // Update rate summary on profile
  await updateRateSummary(supabaseAdmin, session.profile_id);

  return NextResponse.json(rate, { status: 201 });
}

// PUT /api/me/rates — Update a rate (pass id in body)
export async function PUT(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const supabaseAdmin = createServerClient();

  if (!body.id) {
    return NextResponse.json({ error: "Rate id is required" }, { status: 400 });
  }

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from("rates")
    .select("profile_id")
    .eq("id", body.id)
    .single();

  if (!existing || existing.profile_id !== session.profile_id) {
    return NextResponse.json({ error: "Rate not found" }, { status: 404 });
  }

  const updates: Record<string, any> = {};
  const editable = [
    "service_name", "description", "currency",
    "rate_min", "rate_max", "rate_unit", "custom_unit",
    "is_available", "turnaround", "sort_order",
  ];

  for (const field of editable) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from("rates")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update rate" }, { status: 500 });
  }

  await updateRateSummary(supabaseAdmin, session.profile_id);

  return NextResponse.json(updated);
}

// DELETE /api/me/rates — Delete a rate (pass id in body)
export async function DELETE(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const supabaseAdmin = createServerClient();

  if (!body.id) {
    return NextResponse.json({ error: "Rate id is required" }, { status: 400 });
  }

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from("rates")
    .select("profile_id")
    .eq("id", body.id)
    .single();

  if (!existing || existing.profile_id !== session.profile_id) {
    return NextResponse.json({ error: "Rate not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("rates")
    .delete()
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete rate" }, { status: 500 });
  }

  await updateRateSummary(supabaseAdmin, session.profile_id);

  return NextResponse.json({ success: true });
}

// Helper: update the denormalized rate_summary on the profile
async function updateRateSummary(supabase: any, profileId: string) {
  const { data: rates } = await supabase
    .from("rates")
    .select("rate_min, rate_unit, currency, is_available")
    .eq("profile_id", profileId)
    .eq("is_available", true)
    .order("rate_min", { ascending: true })
    .limit(1);

  let summary: string | null = null;
  let available = false;

  if (rates && rates.length > 0) {
    const r = rates[0];
    const currSymbol = r.currency === "USD" ? "$" : r.currency === "EUR" ? "€" : r.currency === "GBP" ? "£" : r.currency + " ";
    if (r.rate_min != null) {
      summary = `From ${currSymbol}${Number(r.rate_min).toLocaleString()}/${r.rate_unit}`;
    }
    available = true;
  }

  await supabase
    .from("profiles")
    .update({ rate_summary: summary, is_available: available })
    .eq("id", profileId);
}
