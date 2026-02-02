import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, platform } = body;

    if (!username || !platform) {
      return NextResponse.json(
        { error: "Username and platform are required" },
        { status: 400 }
      );
    }

    // Check if already on waitlist
    const existing = await prisma.waitlist.findUnique({
      where: {
        platform_username: {
          platform,
          username: username.toLowerCase(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Already on waitlist", id: existing.id },
        { status: 200 }
      );
    }

    // Add to waitlist
    const entry = await prisma.waitlist.create({
      data: {
        platform,
        username: username.toLowerCase(),
        email: email || null,
      },
    });

    return NextResponse.json({ 
      message: "Added to waitlist", 
      id: entry.id 
    });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { error: "Failed to join waitlist" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const count = await prisma.waitlist.count();
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ count: 0 });
  }
}
