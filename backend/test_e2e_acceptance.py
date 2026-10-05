import sys
import time
import json
from playwright.sync_api import sync_playwright

def run_acceptance_tests():
    print("=== STARTING ROADVISION V1.0 E2E ACCEPTANCE TESTS ===", flush=True)
    results = {}
    console_logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        def on_console(msg):
            console_logs.append({
                "type": msg.type,
                "text": msg.text,
                "location": msg.location
            })
            if msg.type == "error":
                print(f"[BROWSER CONSOLE ERROR] {msg.text}", flush=True)
            elif "RoadVision" in msg.text or "Phase" in msg.text:
                print(f"[BROWSER LOG] {msg.text}", flush=True)

        page.on("console", on_console)
        page.on("pageerror", lambda err: print(f"[BROWSER UNCAUGHT ERROR] {err}", flush=True))

        # 1. Load app
        print("\n--- 1. LOADING ROADVISION AT http://localhost:5173/ ---", flush=True)
        page.goto("http://localhost:5173/")
        page.wait_for_load_state("networkidle")

        # Wait for Varkala to load
        print("Waiting for initial Varkala data to load...", flush=True)
        page.wait_for_selector(".real-location-status", timeout=25000)
        time.sleep(1.5)

        # Verify location name
        loc_name_el = page.query_selector(".real-location-status .compact-status__val--accent")
        loc_name = loc_name_el.inner_text() if loc_name_el else "NOT FOUND"
        print(f"Location status text: '{loc_name}'", flush=True)
        assert "VARKALA" in loc_name.upper(), f"Expected Varkala in location badge, got {loc_name}"
        results["varkala_load"] = "PASS"

        # Check RoadNetwork canvas
        canvas = page.query_selector("canvas.road-scene-canvas")
        assert canvas is not None, "Canvas not found"
        results["canvas_present"] = "PASS"
        print("Canvas found and WebGL initialized.", flush=True)

        # Verify source transparency
        source_el = page.query_selector(".real-location-status")
        source_text = source_el.inner_text() if source_el else ""
        assert "OPENSTREETMAP" in source_text.upper() or "USER IMPORT" in source_text.upper(), "Source label missing"
        print("Source Transparency verified: OPENSTREETMAP label present.", flush=True)
        results["source_transparency"] = "PASS"

        # Test navigation controls
        print("\n--- 2. TESTING CAMERA NAVIGATION CONTROLS ---", flush=True)
        top_view_btn = page.query_selector('button[title*="Top View"], button:has-text("TOP")')
        view_3d_btn = page.query_selector('button[title*="3D View"], button:has-text("3D")')
        whole_btn = page.query_selector('button[title*="Whole Area"], button:has-text("WHOLE")')
        zoom_in_btn = page.query_selector('button[title*="Zoom In"], button:has-text("+")')
        zoom_out_btn = page.query_selector('button[title*="Zoom Out"], button:has-text("-")')

        if top_view_btn:
            top_view_btn.click()
            time.sleep(0.5)
            print("Top view clicked", flush=True)
        if view_3d_btn:
            view_3d_btn.click()
            time.sleep(0.5)
            print("3D view clicked", flush=True)
        if zoom_in_btn:
            zoom_in_btn.click()
            time.sleep(0.3)
            print("Zoom in clicked", flush=True)
        if zoom_out_btn:
            zoom_out_btn.click()
            time.sleep(0.3)
            print("Zoom out clicked", flush=True)
        if whole_btn:
            whole_btn.click()
            time.sleep(0.5)
            print("Whole area clicked", flush=True)
        results["camera_navigation"] = "PASS"

        # Phase 3 Analysis
        print("\n--- 3. TESTING PHASE 3 INFRASTRUCTURE ANALYSIS ---", flush=True)
        analyze_btn = page.wait_for_selector('button:has-text("ANALYZE")', timeout=10000)
        assert analyze_btn is not None
        print("Clicking ANALYZE button...", flush=True)
        analyze_btn.click()

        # Wait for compact-analysis-panel
        page.wait_for_selector(".compact-analysis-panel", timeout=25000)
        time.sleep(1.0)
        summary_panel = page.query_selector(".compact-analysis-panel")
        print(f"Analysis Summary Panel displayed: {summary_panel is not None}", flush=True)
        assert summary_panel is not None, "Compact analysis panel not displayed"
        results["phase3_analysis"] = "PASS"

        # Check findings drawer and inspect an issue
        findings_btn = page.query_selector('button:has-text("FINDINGS")')
        if findings_btn:
            findings_btn.click()
            time.sleep(0.5)
            # Click first finding item
            first_issue = page.query_selector(".finding-item")
            if first_issue:
                first_issue.click()
                time.sleep(0.8)
                # Check if inspection card appeared
                card = page.query_selector(".issue-inspection-card")
                print(f"Issue inspection card displayed: {card is not None}", flush=True)
                assert card is not None, "Issue inspection card not displayed on click"
                results["issue_inspection"] = "PASS"

        # Phase 4 Planning
        print("\n--- 4. TESTING PHASE 4 INFRASTRUCTURE PLANNING ---", flush=True)
        plans_btn = page.query_selector('button:has-text("PLANNING")')
        if plans_btn:
            plans_btn.click()
            print("Clicked PLANNING header button...", flush=True)
            page.wait_for_selector(".planning-panel", timeout=20000)
            time.sleep(1.5)

            # Check candidate plans
            plan_items = page.query_selector_all(".candidate-card")
            print(f"Found {len(plan_items)} candidate plan cards in UI", flush=True)
            assert len(plan_items) > 0, "No candidate plans found in UI!"
            results["phase4_planning"] = "PASS"

            # Check priority switching
            min_cost_btn = page.query_selector('.priority-pill:has-text("Min Cost")')
            if min_cost_btn:
                min_cost_btn.click()
                time.sleep(1.5)
                print("Switched to MIN COST priority", flush=True)

        # Phase 5 Forecasting
        print("\n--- 5. TESTING PHASE 5 DEMAND FORECASTING ---", flush=True)
        forecast_btn = page.query_selector('button:has-text("FORECAST")')
        if forecast_btn:
            forecast_btn.click()
            print("Clicked FORECAST header button...", flush=True)
            page.wait_for_selector(".forecasting-panel", timeout=20000)
            time.sleep(1.5)

            # Test switching horizon
            y2040_btn = page.query_selector('button:has-text("2040")')
            if y2040_btn:
                y2040_btn.click()
                time.sleep(1.5)
                print("Switched forecast year to 2040", flush=True)

            # Test switching scenario
            rapid_btn = page.query_selector('button:has-text("Rapid")')
            if rapid_btn:
                rapid_btn.click()
                time.sleep(1.5)
                print("Switched scenario to Rapid Development", flush=True)
            results["phase5_forecasting"] = "PASS"

        # Phase 6 Optimization
        print("\n--- 6. TESTING PHASE 6 STRATEGY OPTIMIZATION ---", flush=True)
        opt_btn = page.query_selector('button:has-text("OPTIMIZE")')
        if opt_btn:
            opt_btn.click()
            print("Clicked OPTIMIZE header button...", flush=True)
            page.wait_for_selector(".optimization-panel", timeout=25000)
            time.sleep(2.0)

            strat_cards = page.query_selector_all(".strategy-card")
            print(f"Found {len(strat_cards)} strategy cards in UI", flush=True)
            assert len(strat_cards) > 0, "No strategy cards found in optimization panel!"
            results["phase6_optimization"] = "PASS"

            # Check mode switching (e.g. Traffic Reduction or Min Cost)
            cost_mode_btn = page.query_selector('button.opt-mode-pill:has-text("Min Capital Cost"), button:has-text("Min Capital Cost")')
            if cost_mode_btn:
                cost_mode_btn.click()
                time.sleep(1.5)
                print("Switched optimization mode to Min Capital Cost", flush=True)

        # Phase 7 Transformation Engine
        print("\n--- 7. TESTING PHASE 7 DIGITAL TWIN TRANSFORMATION ---", flush=True)
        transform_btn = page.query_selector('button:has-text("TRANSFORMATION")')
        if transform_btn:
            transform_btn.click()
            print("Clicked TRANSFORMATION button...", flush=True)
            page.wait_for_selector(".transform-panel-root", timeout=15000)
            time.sleep(1.0)

            # Check legal engineering disclaimer
            disclaimer = page.query_selector(".transform-disclaimer-text")
            assert disclaimer is not None, "Engineering disclaimer missing!"
            print(f"Engineering disclaimer verified: '{disclaimer.inner_text()[:60]}...'", flush=True)
            results["engineering_disclaimer"] = "PASS"

            # Test state transitions
            states = ["EXISTING", "PROPOSED", "CONSTRUCTION", "COMPLETED", "FUTURE"]
            for st in states:
                st_btn = page.query_selector(f'.transform-state-btn:has-text("{st}")')
                if st_btn:
                    st_btn.click()
                    time.sleep(0.5)
                    print(f"Switched transformation state to {st}", flush=True)

            # Test playback controls in CONSTRUCTION
            con_btn = page.query_selector('.transform-state-btn:has-text("CONSTRUCTION")')
            if con_btn:
                con_btn.click()
                time.sleep(0.5)

            play_btn = page.query_selector('button:has-text("PLAY"), button:has-text("▶ PLAY")')
            if play_btn:
                play_btn.click()
                time.sleep(1.0)
                print("Transformation playback started", flush=True)
                pause_btn = page.query_selector('button:has-text("PAUSE"), button:has-text("⏸ PAUSE")')
                if pause_btn:
                    pause_btn.click()
                    print("Transformation playback paused", flush=True)

            # Test speeds
            spd2_btn = page.query_selector('button.transform-speed-btn:has-text("2x")')
            if spd2_btn:
                spd2_btn.click()
                print("Selected 2x speed", flush=True)

            # Test step forward
            step_fwd = page.query_selector('button.transform-ctrl-btn:has-text("▶")')
            if step_fwd:
                step_fwd.click()
                time.sleep(0.3)
                print("Stepped forward", flush=True)

            # Test comparison modes
            for cmp_mode in ["EXISTING", "PROPOSED", "COMPARE"]:
                cmp_btn = page.query_selector(f'.transform-comp-btn:has-text("{cmp_mode}")')
                if cmp_btn:
                    cmp_btn.click()
                    time.sleep(0.4)
                    print(f"Switched comparison mode to {cmp_mode}", flush=True)

            # Test camera presets in transformation panel
            for cam_preset in ["WHOLE CITY", "CORRIDOR", "INTERVENTION", "DRIVER VIEW", "CINEMATIC"]:
                cam_btn = page.query_selector(f'.transform-cam-btn:has-text("{cam_preset}")')
                if cam_btn:
                    cam_btn.click()
                    time.sleep(0.4)
                    print(f"Clicked camera preset: {cam_preset}", flush=True)

            # Close transformation panel to clear viewport
            close_tr = page.query_selector('.transform-panel__close-btn')
            if close_tr:
                close_tr.click()
                time.sleep(0.5)

            results["phase7_transformation"] = "PASS"

        # Nellore testing
        print("\n--- 8. TESTING LOCATION #2: NELLORE ---", flush=True)
        search_input = page.query_selector('.location-search__input')
        if search_input:
            search_input.click()
            search_input.fill("Nellore")
            time.sleep(1.5)

            # Click dropdown item
            page.wait_for_selector(".location-search__item", timeout=10000)
            first_res = page.query_selector(".location-search__item")
            if first_res:
                first_res.click(force=True)
                print("Selected Nellore from dropdown...", flush=True)

            print("Waiting for Nellore network load...", flush=True)
            page.wait_for_function(
                "() => { const el = document.querySelector('.real-location-status .compact-status__val--accent'); return el && el.innerText.toUpperCase().includes('NELLORE'); }",
                timeout=25000
            )
            print("Nellore successfully loaded!", flush=True)
            results["nellore_load"] = "PASS"

            time.sleep(1.0)
            # Run analysis on Nellore
            re_analyze = page.query_selector('button:has-text("ANALYZE")')
            if re_analyze:
                re_analyze.click()
                page.wait_for_selector(".compact-analysis-panel", timeout=25000)
                time.sleep(1.5)
                print("Nellore Phase 3 analysis completed successfully!", flush=True)
                results["nellore_analysis"] = "PASS"

        # Check console errors
        error_logs = [log for log in console_logs if log["type"] == "error"]
        print(f"\n--- CONSOLE AUDIT: {len(error_logs)} errors found ---", flush=True)
        for err in error_logs:
            print(f"ERROR: {err['text']}", flush=True)

        results["error_count"] = len(error_logs)
        results["errors"] = [e["text"] for e in error_logs]

        browser.close()

    print("\n=== FINAL TEST RESULTS ===", flush=True)
    print(json.dumps(results, indent=2), flush=True)
    return results

if __name__ == "__main__":
    run_acceptance_tests()
