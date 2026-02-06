import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/profiles - List/search profiles
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("type"); // agent, human, org
  const skill = searchParams.get("skill");
  const search = searchParams.get("q");
  const available = searchParams.get("available");
  const tier = searchParams.get("tier");
  const sort = searchParams.get("sort") || "recent"; // recent, reputation, name
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" });

    // Filter by entity type
    if (entityType && ["agent", "human", "org"].includes(entityType)) {
      query = query.eq("entity_type", entityType);
    }

    // Filter by skill (array contains)
    if (skill) {
      query = query.contains("skills", [skill]);
    }

    // Filter by availability
    if (available === "true") {
      query = query.eq("is_available", true);
    }

    // Filter by tier
    if (tier) {
      query = query.eq("tier", tier);
    }

    // Search by name, handle, headline
    if (search) {
      query = query.or(
        `display_name.ilike.%${search}%,handle.ilike.%${search}%,headline.ilike.%${search}%`
      );
    }

    // Sort
    switch (sort) {
      case "reputation":
        query = query.order("reputation_score", { ascending: false });
        break;
      case "name":
        query = query.order("display_name", { ascending: true });
        break;
      case "endorsements":
        query = query.order("endorsement_count", { ascending: false });
        break;
      default: // recent
        query = query.order("created_at", { ascending: false });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      profiles: data || [],
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}
