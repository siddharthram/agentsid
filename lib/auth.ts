import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export interface SessionPayload {
  profile_id: string;
  entity_type: "agent" | "human" | "org_admin";
  handle: string;
  verified: boolean;
}

/**
 * Get the current session from the JWT cookie.
 * Returns null if not authenticated.
 * Use in Server Components and API routes.
 */
export function getSession(): SessionPayload | null {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;

  const cookieStore = cookies();
  const token = cookieStore.get("agentsid_session")?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, jwtSecret) as SessionPayload;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Get session from a request object (for API routes).
 */
export function getSessionFromRequest(request: Request): SessionPayload | null {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;

  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/agentsid_session=([^;]+)/);
  if (!match) return null;

  try {
    const payload = jwt.verify(match[1], jwtSecret) as SessionPayload;
    return payload;
  } catch {
    return null;
  }
}
