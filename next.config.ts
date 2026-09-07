import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

function parseEnvFile(filePath: string): Record<string, string> {
  let source = "";
  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch {
    return {};
  }

  const parsed: Record<string, string> = {};
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

const loadedEnv = {
  ...parseEnvFile(path.resolve(__dirname, "../../.env")),
  ...parseEnvFile(path.resolve(__dirname, ".env")),
  ...parseEnvFile(path.resolve(__dirname, ".env.local")),
};

const supabasePublicKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

const supabaseServerKeys = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERVER_URL",
  "MASTRA_SERVER_URL",
  "INTERNAL_API_SECRET",
  "SUPABASE_FUNCTIONS_URL",
] as const;

for (const key of [...supabasePublicKeys, ...supabaseServerKeys]) {
  const value = loadedEnv[key];
  if (value && !process.env[key]) {
    process.env[key] = value;
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  },
};

export default nextConfig;
