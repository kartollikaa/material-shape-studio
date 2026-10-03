export type ServiceConfig = {
  studioUrl: string;
  allowedHosts: string[];
  allowedOrigins: string[];
  port?: number;
  maxRequestBytes?: number;
  maxConcurrentJobs?: number;
  jobDeadlineMs?: number;
  maxRequestsPerMinute?: number;
};

export function envConfig(env = process.env): ServiceConfig {
  const positiveInt = (value: string | undefined, field: string, fallback: number) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${field} must be a positive integer`);
    return parsed;
  };
  const studioUrl = env.STUDIO_URL;
  if (!studioUrl || new URL(studioUrl).protocol !== "https:") throw new Error("STUDIO_URL must be an HTTPS URL");
  const allowedHosts = env.ALLOWED_HOSTS?.split(",").map((value) => value.trim()).filter(Boolean);
  if (!allowedHosts?.length) throw new Error("ALLOWED_HOSTS is required");
  return {
    studioUrl,
    allowedHosts,
    allowedOrigins: env.ALLOWED_ORIGINS?.split(",").map((value) => value.trim()).filter(Boolean) ?? [],
    port: positiveInt(env.PORT, "PORT", 3000),
    maxRequestsPerMinute: positiveInt(env.MAX_REQUESTS_PER_MINUTE, "MAX_REQUESTS_PER_MINUTE", 120),
  };
}
