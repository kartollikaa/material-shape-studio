export type ServiceConfig = {
  studioUrl: string;
  allowedHosts: string[];
  allowedOrigins: string[];
  port?: number;
  maxRequestBytes?: number;
  maxConcurrentJobs?: number;
  jobDeadlineMs?: number;
};

export function envConfig(env = process.env): ServiceConfig {
  const studioUrl = env.STUDIO_URL;
  if (!studioUrl || new URL(studioUrl).protocol !== "https:") throw new Error("STUDIO_URL must be an HTTPS URL");
  const allowedHosts = env.ALLOWED_HOSTS?.split(",").map((value) => value.trim()).filter(Boolean);
  if (!allowedHosts?.length) throw new Error("ALLOWED_HOSTS is required");
  return {
    studioUrl,
    allowedHosts,
    allowedOrigins: env.ALLOWED_ORIGINS?.split(",").map((value) => value.trim()).filter(Boolean) ?? [],
    port: Number(env.PORT ?? 3000),
  };
}
