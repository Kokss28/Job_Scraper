from playwright.sync_api import sync_playwright
import argparse, os, sys, time, json, hmac, hashlib, base64

BASE = "http://localhost:3000"
PAGES = [
    "/dashboard",
    "/dashboard/degree-advisor",
    "/dashboard/experience",
    "/dashboard/market",
    "/dashboard/scraper",
    "/saved-jobs",
    "/admin",
    "/setup",
    "/portal",
    "/login",
    "/register",
]
WIDTHS = [320, 375, 414, 768]

parser = argparse.ArgumentParser(description="Mobile Responsive Alignment & Overflow Inspector")
parser.add_argument("--label", default="before", help="Screenshot subfolder name (before/after)")
parser.add_argument("--route", default=None, help="Specific route to inspect (e.g. /dashboard)")
parser.add_argument("--no-login-wait", action="store_true", help="Skip waiting for manual login")
args = parser.parse_args()

routes = [args.route] if args.route else PAGES
out_dir = f"screenshots/{args.label}"
os.makedirs(out_dir, exist_ok=True)

# Generate valid portal session token so /portal and admin routes load seamlessly
def make_portal_token():
    secret = b"talentpulse-portal-secret-key-2026-secure-session-auth"
    now_ms = int(time.time() * 1000)
    claims = {
        "uid": "usr_admin_master",
        "email": "admin@talentpulse.com",
        "user": "admin",
        "role": "master_admin",
        "st": "Active",
        "exp": now_ms + 7 * 24 * 60 * 60 * 1000,
        "iat": now_ms,
    }
    raw_json = json.dumps(claims, separators=(",", ":")).encode("utf-8")
    payload = base64.urlsafe_b64encode(raw_json).decode("ascii").rstrip("=")
    sig = hmac.new(secret, payload.encode("ascii"), hashlib.sha256).hexdigest()
    return f"tp_{payload}.{sig}"

portal_token = make_portal_token()

print(f"====================================================================")
print(f"Mobile Preview Inspector starting with label: '{args.label}'")
print(f"Target Routes: {routes}")
print(f"Target Widths: {WIDTHS}")
print(f"Saving screenshots to: {out_dir}/")
print(f"====================================================================")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=300)
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
                   "AppleWebKit/605.1.15 Mobile/15E148",
    )

    # Pre-seed session cookies for seamless rendering
    context.add_cookies([
        {"name": "admin_session", "value": "active", "domain": "localhost", "path": "/"},
        {"name": "portal_session", "value": portal_token, "domain": "localhost", "path": "/"},
    ])

    page = context.new_page()
    page.set_default_navigation_timeout(60000)
    page.set_default_timeout(60000)
    page.goto(BASE, wait_until="domcontentloaded")

    if not args.no_login_wait:
        try:
            print("Log in inside the browser window, then press Enter here (or wait 10s)...")
            import threading
            user_entered = []
            def get_input():
                try:
                    line = input()
                    user_entered.append(line)
                except Exception:
                    pass
            t = threading.Thread(target=get_input, daemon=True)
            t.start()
            t.join(timeout=10.0)
            if user_entered:
                print("Login confirmed by Enter key!")
            else:
                print("Proceeding with pre-seeded active session...")
        except Exception as e:
            print(f"Login wait bypassed: {e}")

    for w in WIDTHS:
        page.set_viewport_size({"width": w, "height": 844})
        print(f"\n--- Testing Viewport Width: {w}px ---")
        for route in routes:
            try:
                page.goto(BASE + route, wait_until="domcontentloaded")
                try:
                    page.wait_for_load_state("networkidle", timeout=3000)
                except Exception:
                    page.wait_for_timeout(1000)

                height = page.evaluate("document.documentElement.scrollHeight")
                for y in range(0, min(height, 4000), 400):
                    page.evaluate(f"window.scrollTo(0, {y})")
                    page.wait_for_timeout(150)
                page.evaluate("window.scrollTo(0, 0)")
                page.wait_for_timeout(300)

                overflow = page.evaluate(
                    "document.documentElement.scrollWidth > window.innerWidth"
                )
                scroll_w = page.evaluate("document.documentElement.scrollWidth")
                inner_w = page.evaluate("window.innerWidth")
                print(f"{route} @ {w}px -> horizontal overflow: {overflow} (scrollWidth: {scroll_w}px, innerWidth: {inner_w}px)", flush=True)

                name = route.strip("/").replace("/", "_") or "home"
                screenshot_path = f"{out_dir}/{name}_{w}.png"
                page.screenshot(path=screenshot_path, full_page=True)
                page.wait_for_timeout(500)
            except Exception as e:
                print(f"Error testing {route} @ {w}px: {e}", flush=True)

    browser.close()
    print("\nMobile Preview run complete.")
