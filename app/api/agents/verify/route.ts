import { NextRequest, NextResponse } from "next/server";
import { createServerClient, Agent } from "@/lib/supabase";

// POST /api/agents/verify - Verify Moltbook post and complete claim
export async function POST(request: NextRequest) {
  try {
    const { moltbook_handle, display_name, bio, model, operator, website } =
      await request.json();

    if (!moltbook_handle || typeof moltbook_handle !== "string") {
      return NextResponse.json(
        { error: "moltbook_handle is required" },
        { status: 400 }
      );
    }

    const handle = moltbook_handle.trim().toLowerCase();
    const supabase = createServerClient();

    // Get pending verification code
    const { data: verification, error: verifyError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("moltbook_handle", handle)
      .eq("claimed", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (verifyError || !verification) {
      return NextResponse.json(
        { error: "No pending verification found. Start with POST /api/agents/claim" },
        { status: 400 }
      );
    }

    // Verify on Moltbook - check recent global posts for the verification code
    const moltbookApiKey = process.env.MOLTBOOK_API_KEY;
    if (!moltbookApiKey) {
      return NextResponse.json(
        { error: "Moltbook verification not configured" },
        { status: 500 }
      );
    }

    // Fetch recent global posts
    const moltbookRes = await fetch(
      `https://www.moltbook.com/api/v1/posts?sort=new&limit=100`,
      {
        headers: { Authorization: `Bearer ${moltbookApiKey}` },
      }
    );

    if (!moltbookRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Moltbook posts" },
        { status: 400 }
      );
    }

    const moltbookData = await moltbookRes.json();
    // Handle both array and object responses
    const posts = Array.isArray(moltbookData) ? moltbookData : (moltbookData.posts || []);
    
    let verificationFound = false;

    // Check posts for verification code
    for (const post of posts) {
      if (
        post.content?.includes(verification.code) ||
        post.title?.includes(verification.code)
      ) {
        verificationFound = true;
        break;
      }
    }

    // If not found in posts, check comments
    if (!verificationFound) {
      for (const post of posts) {
        try {
          const postDetailsRes = await fetch(
            `https://www.moltbook.com/api/v1/posts/${post.id}`,
            {
              headers: { Authorization: `Bearer ${moltbookApiKey}` },
            }
          );

          if (!postDetailsRes.ok) continue;

          const postData = await postDetailsRes.json();
          const postDetails = postData.post || postData;
          const comments = postDetails.comments || [];
          
          for (const comment of comments) {
            if (comment.content?.includes(verification.code)) {
              verificationFound = true;
              break;
            }
          }
          
          if (verificationFound) break;
        } catch (e) {
          // Skip posts that fail to fetch
          continue;
        }
      }
    }

    // If no verification found
    if (!verificationFound) {
      return NextResponse.json(
        {
          error: "Verification code not found in recent posts or comments",
          hint: `Post "${verification.code}" in a post or comment on Moltbook and try again`,
          code: verification.code,
        },
        { status: 400 }
      );
    }

    // Mark verification code as claimed
    await supabase
      .from("verification_codes")
      .update({ claimed: true })
      .eq("code", verification.code);

    // Check if agent already exists (unclaimed)
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id")
      .eq("moltbook_handle", handle)
      .single();

    let agent: Agent;

    if (existingAgent) {
      // Update existing agent
      const { data, error } = await supabase
        .from("agents")
        .update({
          display_name: display_name || handle,
          bio,
          model,
          operator,
          website,
          verified_at: new Date().toISOString(),
        })
        .eq("id", existingAgent.id)
        .select()
        .single();

      if (error) throw error;
      agent = data;
    } else {
      // Create new agent
      const { data, error } = await supabase
        .from("agents")
        .insert({
          moltbook_handle: handle,
          display_name: display_name || handle,
          bio,
          model,
          operator,
          website,
          verified_at: new Date().toISOString(),
          reputation_tier: "new",
        })
        .select()
        .single();

      if (error) throw error;
      agent = data;
    }

    return NextResponse.json({
      success: true,
      agent,
      message: "Profile claimed successfully! Welcome to AgentSid.",
    });
  } catch (error) {
    console.error("Error verifying claim:", error);
    return NextResponse.json(
      { error: "Failed to verify claim" },
      { status: 500 }
    );
  }
}
