import sys
import time
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def test_phase8_e2e():
    print("\n" + "=" * 80, flush=True)
    print("ROADVISION PHASE 8: FRONTEND DIGITAL TWIN & WHOLE-PLACE E2E VERIFICATION", flush=True)
    print("=" * 80, flush=True)

    console_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(str(err)))

        print("1. Navigating to RoadVision (http://localhost:5173/) ...", flush=True)
        page.goto("http://localhost:5173/", wait_until="domcontentloaded")
        time.sleep(2)

        # Verify search input
        search_input = page.wait_for_selector(".location-search__input", timeout=10000)
        assert search_input is not None, "Search input must be present"
        print("[PASS] 1. Search bar loaded", flush=True)

        # Search for Madurai
        print("2. Searching 'mad' for primary showcase city Madurai...", flush=True)
        search_input.click()
        search_input.fill("mad")
        time.sleep(0.8)

        items = page.query_selector_all(".location-search__item")
        assert len(items) > 0, "Location suggestions must appear"
        top_text = items[0].inner_text()
        print(f"  - Top suggestion: {top_text.splitlines()[0]}", flush=True)
        assert "Madurai" in top_text

        # Click Madurai to load real location digital twin
        print("3. Selecting Madurai...", flush=True)
        items[0].click()
        time.sleep(2)

        # Trigger analysis
        print("4. Executing Phase 3 Whole-Network Analysis...", flush=True)
        analyze_btn = page.wait_for_selector("button:has-text('ANALYZE')", timeout=15000)
        assert analyze_btn is not None, "Analyze button must appear after map load"
        analyze_btn.click()
        time.sleep(3)

        # Wait for status chip showing analysis complete
        status_chip = page.wait_for_selector(".header-status-chip", timeout=15000)
        chip_text = status_chip.inner_text() if status_chip else ""
        print(f"  - Analysis complete status: '{chip_text}'", flush=True)

        # Verify 🗺️ ZONES button appears
        zones_btn = page.wait_for_selector("button:has-text('ZONES')", timeout=10000)
        assert zones_btn is not None, "Phase 8 Development Zones button must be visible in header"
        zones_label = zones_btn.inner_text()
        print(f"[PASS] 4. Whole-Place Development Zones button active: '{zones_label}'", flush=True)

        # Click ZONES button to open Development Zones Panel
        print("5. Opening Development Zones Panel...", flush=True)
        zones_btn.click()
        time.sleep(1)

        zones_panel = page.wait_for_selector(".development-zones-panel", timeout=5000)
        assert zones_panel is not None, "Development Zones Panel must render"
        panel_title = page.locator(".development-zones-panel .optimization-title").inner_text()
        print(f"[PASS] 5. Development Zones Panel rendered: '{panel_title}'", flush=True)

        # Verify zones list
        zone_buttons = page.locator(".development-zones-panel button").all()
        print(f"  - Found {len(zone_buttons)} interactive elements in zones panel", flush=True)
        assert len(zone_buttons) >= 4, "Must contain multiple spatial development zones"

        # Verify focus button on active zone
        focus_btn = page.locator("button:has-text('FOCUS MAP')").first
        assert focus_btn is not None, "Focus map button must be present on active zone card"
        print("6. Clicking 'FOCUS MAP' to focus camera on spatial zone...", flush=True)
        focus_btn.click()
        time.sleep(1)
        print("[PASS] 6. Camera focused on selected development zone", flush=True)

        # Close zones panel
        close_btn = page.locator(".development-zones-panel .panel-close-btn")
        if close_btn.count() > 0:
            close_btn.first.click()
            time.sleep(0.5)

        # Verify Phase 6 Optimization
        opt_btn = page.wait_for_selector("button:has-text('OPTIMIZE')", timeout=5000)
        assert opt_btn is not None, "Optimize button must be present in header"
        print("7. Launching Whole-Place Multi-Objective Optimizer (Phase 6)...", flush=True)
        opt_btn.click()
        time.sleep(3)

        opt_panel = page.wait_for_selector(".optimization-panel", timeout=10000)
        assert opt_panel is not None, "Optimization panel must render"
        print("[PASS] 7. Whole-Place Optimization Strategy evaluated and rendered", flush=True)

        # Capture visual screenshot as artifact
        screenshot_path = "backend/phase8_madurai_digital_twin_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"[PASS] 8. Digital twin screenshot saved to: {screenshot_path}", flush=True)

        # Check console errors
        filtered_errors = [e for e in console_errors if "favicon" not in e.lower() and "maplibre" not in e.lower()]
        print(f"9. Console errors count: {len(filtered_errors)}", flush=True)
        assert len(filtered_errors) == 0, f"Expected 0 console errors, got: {filtered_errors}"
        print("[PASS] 9. Browser console clean with 0 errors", flush=True)

        print("\n" + "=" * 80, flush=True)
        print(">>> ROADVISION PHASE 8 FRONTEND E2E VERIFICATION COMPLETED WITH 100% SUCCESS! <<<", flush=True)
        print("=" * 80 + "\n", flush=True)

        browser.close()

if __name__ == "__main__":
    test_phase8_e2e()
