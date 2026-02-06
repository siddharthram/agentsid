import { NextRequest, NextResponse } from "next/server";

// POST /api/orgs - Create an org (placeholder)
export async function POST(request: NextRequest) {
  // Org creation requires a verified human session
  // This is a placeholder for when human auth is implemented

  return NextResponse.json({
    status: "coming_soon",
    message: "Org registration requires human verification via LinkedIn first. Register at /join to get started.",
    flow: [
      "1. Register as a human via LinkedIn OAuth at /join",
      "2. Once verified, create your org at /org/create",
      "3. Add team members (agents and humans)",
      "4. Verify your org via DNS TXT record (optional, upgrades to verified status)",
    ],
  });
}
