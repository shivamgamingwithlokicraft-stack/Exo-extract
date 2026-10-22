"""
============================================================
 EcoExtract — Edge Function (Cloudflare Workers · Python)
============================================================
 A lightweight global edge worker that sits in front of the
 EcoExtract Node backend. Runs on Cloudflare's global network
 so responses come from the closest datacenter (sub-50ms).

 Responsibilities:
   1. Handle CORS for browser requests
   2. Answer /api/health locally (no origin call — instant)
   3. Answer /api/materials locally (static catalog — instant)
   4. Proxy everything else to the Node origin backend
   5. Rate-limit basic abusive requests
   6. Add edge metadata headers to every response

 Deploy:
   npm install -g wrangler
   wrangler deploy edge/main.py --name ecoextract-edge

 Requirements:
   - Set ORIGIN_URL to your deployed Node backend URL
     (e.g. https://ecoextract-api.onrender.com)
   - Cloudflare account (free tier is enough)

 By: Shivam Singh Patel | NextGen AI Studio
============================================================
"""

from js import Response, Headers, Object, fetch
from urllib.parse import urlparse, parse_qs
import json
import time


# ─────────────────────────────────────────────────────────
#  Configuration
# ─────────────────────────────────────────────────────────

# ⚠️  Change this to your deployed Node backend URL
#     Leave as-is if you haven't deployed the Node backend —
#     the worker will return a clean error instead of crashing.
ORIGIN_URL = "https://ecoextract-backend.onrender.com"

SERVICE_NAME = "EcoExtract Edge"
SERVICE_VERSION = "1.0.0"

# Seconds between requests per IP for basic rate limiting
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX_REQUESTS = 120


# ─────────────────────────────────────────────────────────
#  CORS headers (same for every response)
# ─────────────────────────────────────────────────────────

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
}

CSV_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "text/csv; charset=utf-8",
}


# ─────────────────────────────────────────────────────────
#  Material catalog — mirrors backend/server.js
#  Served at the edge with zero origin latency.
# ─────────────────────────────────────────────────────────

MATERIALS = {
    "pcb": {
        "name": "Printed Circuit Board",
        "bin": "PCB Safe-Box",
        "value_per_kg": 350,
        "category": "e-waste",
        "icon": "▦",
    },
    "copper": {
        "name": "Copper Wires & Cables",
        "bin": "Copper Bin",
        "value_per_kg": 600,
        "category": "metal",
        "icon": "◎",
    },
    "battery": {
        "name": "Lithium-Ion Battery",
        "bin": "Lithium Cell Box",
        "value_per_kg": 120,
        "category": "battery",
        "icon": "▰",
    },
    "gold": {
        "name": "Gold-bearing Components",
        "bin": "Gold Recovery Box",
        "value_per_kg": 4200,
        "category": "metal",
        "icon": "Au",
    },
    "mixed": {
        "name": "Mixed Electronic Waste",
        "bin": "Manual Review Bay",
        "value_per_kg": 80,
        "category": "e-waste",
        "icon": "♻",
    },
}


# ─────────────────────────────────────────────────────────
#  Simple in-memory rate limiter
#  NOTE: Cloudflare Workers are ephemeral — this resets when
#  the isolate recycles (every few minutes). It's a best-effort
#  shield, not a hard limit. For real rate limiting, use
#  Cloudflare's built-in Rate Limiting rules in the dashboard.
# ─────────────────────────────────────────────────────────

_rate_buckets = {}


def _client_ip(request):
    """Extract client IP from Cloudflare headers."""
    try:
        headers = request.headers
        for name in ("CF-Connecting-IP", "X-Forwarded-For", "X-Real-IP"):
            value = headers.get(name)
            if value:
                return value.split(",")[0].strip()
    except Exception:
        pass
    return "unknown"


def _is_rate_limited(ip):
    """Return True if this IP has exceeded the rate limit."""
    now = time.time()
    bucket = _rate_buckets.get(ip, [])

    # Keep only timestamps within the window
    bucket = [t for t in bucket if now - t < RATE_LIMIT_WINDOW]

    if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
        _rate_buckets[ip] = bucket
        return True

    bucket.append(now)
    _rate_buckets[ip] = bucket

    # Cap the dictionary size (best-effort memory bound)
    if len(_rate_buckets) > 5000:
        oldest_keys = list(_rate_buckets.keys())[:1000]
        for key in oldest_keys:
            del _rate_buckets[key]

    return False


# ─────────────────────────────────────────────────────────
#  Response helpers
# ─────────────────────────────────────────────────────────

def _json_response(data, status=200, extra_headers=None):
    """Build a JSON Response with CORS + edge metadata."""
    headers_dict = dict(CORS_HEADERS)
    headers_dict["X-Edge-Service"] = SERVICE_NAME
    headers_dict["X-Edge-Version"] = SERVICE_VERSION
    headers_dict["X-Edge-Timestamp"] = _timestamp()

    if extra_headers:
        headers_dict.update(extra_headers)

    return Response.new(
        json.dumps(data),
        status=status,
        headers=Headers.new(headers_dict),
    )


def _text_response(text, status=200, extra_headers=None):
    """Build a plain-text Response with CORS."""
    headers_dict = dict(CORS_HEADERS)
    headers_dict["Content-Type"] = "text/plain; charset=utf-8"
    headers_dict["X-Edge-Service"] = SERVICE_NAME

    if extra_headers:
        headers_dict.update(extra_headers)

    return Response.new(
        text,
        status=status,
        headers=Headers.new(headers_dict),
    )


def _timestamp():
    """ISO 8601 timestamp."""
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _path_of(url):
    """Extract just the path portion of the URL."""
    try:
        parsed = urlparse(url)
        return parsed.path or "/"
    except Exception:
        return "/"


# ─────────────────────────────────────────────────────────
#  Edge-only handlers (no origin needed)
# ─────────────────────────────────────────────────────────

async def _handle_health():
    """Instant health check — served locally, no origin round-trip."""
    return _json_response({
        "status": "ok",
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "layer": "edge",
        "origin": ORIGIN_URL,
        "timestamp": _timestamp(),
        "message": "EcoExtract edge function is live.",
    })


async def _handle_materials():
    """Static material catalog — served locally."""
    return _json_response({
        "source": "edge_cache",
        "count": len(MATERIALS),
        "materials": MATERIALS,
        "timestamp": _timestamp(),
    })


async def _handle_root():
    """Root path — friendly welcome."""
    return _json_response({
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "message": "EcoExtract edge function.",
        "origin": ORIGIN_URL,
        "endpoints": [
            "GET  /api/health",
            "GET  /api/materials",
            "GET  /api/records",
            "POST /api/records",
            "DELETE /api/records/:id",
            "GET  /api/summary",
            "POST /api/impact",
            "GET  /api/export.csv",
        ],
        "note": "All endpoints except /api/health and /api/materials are proxied to the origin.",
    })


# ─────────────────────────────────────────────────────────
#  Origin proxy handler
# ─────────────────────────────────────────────────────────

async def _proxy_to_origin(request, path):
    """Forward the request to the origin backend and return its response."""
    if not ORIGIN_URL or "onrender.com" in ORIGIN_URL and "your-" in ORIGIN_URL:
        return _json_response(
            {
                "error": "Origin not configured",
                "message": "Set ORIGIN_URL in edge/main.py to your deployed Node backend URL.",
                "current_origin": ORIGIN_URL,
            },
            status=503,
        )

    origin_full_url = ORIGIN_URL.rstrip("/") + path

    try:
        method = request.method or "GET"

        # Build origin fetch
        if method in ("GET", "HEAD"):
            origin_response = await fetch(origin_full_url, method=method)
        else:
            # Preserve body for POST/PUT/DELETE
            body_bytes = await request.arrayBuffer() if hasattr(request, "arrayBuffer") else None
            origin_response = await fetch(origin_full_url, method=method, body=body_bytes)

        status = origin_response.status
        content_type = origin_response.headers.get("Content-Type") or "application/json"
        body_text = await origin_response.text()

        # Preserve CSV content type for exports
        if "text/csv" in content_type:
            headers_dict = dict(CSV_HEADERS)
            headers_dict["X-Edge-Service"] = SERVICE_NAME
            headers_dict["X-Edge-Proxy"] = "origin"
            return Response.new(body_text, status=status, headers=Headers.new(headers_dict))

        # Default: JSON response
        return _json_response(
            _safe_parse_json(body_text),
            status=status,
            extra_headers={"X-Edge-Proxy": "origin"},
        )

    except Exception as exc:
        return _json_response(
            {
                "error": "Origin fetch failed",
                "message": str(exc),
                "origin": origin_full_url,
                "hint": "Check that the origin backend is running and ORIGIN_URL is correct.",
                "timestamp": _timestamp(),
            },
            status=502,
        )


def _safe_parse_json(text):
    """Try to parse text as JSON, else wrap it as a plain message."""
    try:
        return json.loads(text)
    except Exception:
        return {"raw": str(text)[:2000]}


# ─────────────────────────────────────────────────────────
#  Main fetch handler — Cloudflare Workers entry point
# ─────────────────────────────────────────────────────────

async def on_fetch(request):
    """Every incoming request hits this function."""

    # ── CORS preflight ──────────────────────────────────
    if request.method == "OPTIONS":
        return Response.new(
            "",
            status=204,
            headers=Headers.new(CORS_HEADERS),
        )

    # ── Rate limiting ───────────────────────────────────
    ip = _client_ip(request)
    if _is_rate_limited(ip):
        return _json_response(
            {
                "error": "Rate limit exceeded",
                "message": f"Maximum {RATE_LIMIT_MAX_REQUESTS} requests per {RATE_LIMIT_WINDOW}s per IP.",
                "retry_after_seconds": RATE_LIMIT_WINDOW,
            },
            status=429,
            extra_headers={"Retry-After": str(RATE_LIMIT_WINDOW)},
        )

    # ── Parse path ──────────────────────────────────────
    path = _path_of(request.url)

    # Normalize trailing slash
    normalized = path.rstrip("/") or "/"

    # ── Route locally (instant, no origin call) ─────────
    if normalized == "/" or normalized == "":
        return await _handle_root()

    if normalized == "/api/health":
        return await _handle_health()

    if normalized == "/api/materials":
        return await _handle_materials()

    # ── Everything else → proxy to origin ───────────────
    if normalized.startswith("/api/"):
        return await _proxy_to_origin(request, normalized)

    # ── Non-API paths: redirect to origin or return 404 ─
    return _json_response(
        {
            "error": "Not found",
            "path": normalized,
            "message": "The edge function only handles /api/* routes. Use the main site URL for the frontend.",
        },
        status=404,
    )
