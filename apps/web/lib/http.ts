const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export function isLocalHost(value: string | null): boolean {
  if (!value) return false;
  let host = value.trim().toLowerCase();
  if (host.startsWith("[")) {
    host = host.slice(1, host.indexOf("]"));
  } else if (host.split(":").length === 2) {
    host = host.split(":")[0];
  }
  host = host.replace(/^::ffff:/, "");
  return LOCAL_HOSTS.has(host) || host.endsWith(".localhost");
}

export function isLocalRequest(request: Request): boolean {
  if (process.env.STRIKEEL_LOCAL_ONLY === "false") return true;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const host = request.headers.get("host") ?? new URL(request.url).host;
  return isLocalHost(host) && (!forwarded || isLocalHost(forwarded));
}

export function rejectNonLocal(request: Request): Response | null {
  if (isLocalRequest(request)) return null;
  return Response.json(
    { error: "local demo only", reason: "LOCAL_ONLY", schemaVersion: 1 },
    { status: 403 }
  );
}

export function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    request.headers.get("host") ??
    "local"
  );
}
