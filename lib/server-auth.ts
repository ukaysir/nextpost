import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export type RequestUser = {
  id: string;
  email?: string;
  name?: string;
  provider: "google" | "test";
  isAdmin: boolean;
};

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}

function getAdminEmails() {
  return (process.env.NEXTPOST_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedAdmin(email?: string) {
  const admins = getAdminEmails();
  if (!email) return false;
  if (!admins.length) return true;
  return admins.includes(email.toLowerCase());
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return "";
  return token;
}

export async function getRequestUser(request: NextRequest): Promise<RequestUser | null> {
  const token = getBearerToken(request);

  if (token && hasSupabaseConfig()) {
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (!error && data.user) {
      const metadata = data.user.user_metadata ?? {};
      const name =
        typeof metadata.full_name === "string"
          ? metadata.full_name
          : typeof metadata.name === "string"
            ? metadata.name
            : data.user.email ?? undefined;

      return {
        id: data.user.id,
        email: data.user.email ?? undefined,
        name,
        provider: "google",
        isAdmin: isAllowedAdmin(data.user.email ?? undefined),
      };
    }
  }

  if (request.headers.get("x-nextpost-test-user") === "test") {
    return {
      id: "test",
      email: "test@nextpost.local",
      name: "테스트 사용자",
      provider: "test",
      isAdmin: true,
    };
  }

  return null;
}
