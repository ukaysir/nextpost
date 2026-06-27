import { readFileSync } from "node:fs";

function readEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
    return Object.fromEntries(
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const index = line.indexOf("=");
          return index === -1 ? [line, ""] : [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } catch {
    return {};
  }
}

const fileEnv = readEnvFile(".env.local");
const supabaseUrl = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  fileEnv.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const siteUrl = process.env.NEXTPOST_SITE_URL || "https://nextpost-wine.vercel.app";

if (!supabaseUrl || !publishableKey) {
  console.error("Supabase URL 또는 publishable key를 찾지 못했습니다.");
  process.exit(1);
}

const settingsUrl = new URL("/auth/v1/settings", supabaseUrl).href;
const response = await fetch(settingsUrl, {
  headers: {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  },
});

if (!response.ok) {
  console.error(`Supabase Auth settings 조회 실패: HTTP ${response.status}`);
  process.exit(1);
}

const settings = await response.json();
const googleEnabled = settings?.external?.google === true;
const callbackUrl = new URL("/auth/v1/callback", supabaseUrl).href;
const appCallbackUrl = new URL("/auth/callback", siteUrl).href;

console.log(`Supabase project: ${supabaseUrl}`);
console.log(`Google provider enabled: ${googleEnabled ? "yes" : "no"}`);
console.log(`Google Cloud authorized redirect URI: ${callbackUrl}`);
console.log(`Supabase Site URL: ${siteUrl}`);
console.log(`Supabase additional redirect URL: ${appCallbackUrl}`);

if (!googleEnabled) {
  console.error(
    "Google provider가 꺼져 있습니다. Supabase Dashboard > Authentication > Providers > Google에서 활성화하세요.",
  );
  process.exit(2);
}
