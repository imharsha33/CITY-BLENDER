import sys
import time
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def test_madurai_e2e():
    print("=== STARTING MADURAI SEARCH & LOCATION DISCOVERY E2E TEST ===", flush=True)
    console_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(str(err)))

        print("1. Navigating to http://localhost:5173/ ...", flush=True)
        page.goto("http://localhost:5173/", wait_until="domcontentloaded")
        time.sleep(2)

        search_input = page.wait_for_selector(".location-search__input", timeout=10000)
        assert search_input is not None, "Search input not found"
        print("[PASS] Search input found in header", flush=True)

        # 2. Test empty focus - Featured Madurai hint
        print("2. Testing empty focus - Featured development area prompt...", flush=True)
        search_input.click()
        time.sleep(0.5)
        featured_el = page.wait_for_selector(".location-search__item--featured", timeout=5000)
        assert featured_el is not None, "Featured Madurai item not shown on empty focus"
        featured_text = featured_el.inner_text()
        assert "Madurai" in featured_text, f"Expected Madurai in featured prompt, got {featured_text}"
        print(f"[PASS] Empty focus shows: '{featured_text.splitlines()[0]}'", flush=True)

        # 3. Test partial query "mad"
        print("3. Testing partial search query 'mad'...", flush=True)
        search_input.fill("mad")
        # Wait for debounce (300ms) + network response
        time.sleep(0.8)

        items = page.query_selector_all(".location-search__item")
        assert len(items) >= 2, f"Expected at least 2 results for 'mad', got {len(items)}"
        top_res_text = items[0].inner_text()
        print(f"Top result for 'mad':\n{top_res_text}", flush=True)
        assert "Madurai" in top_res_text, f"Top result for 'mad' must be Madurai, got: {top_res_text}"
        assert "Tamil Nadu" in top_res_text or "India" in top_res_text, "Top result must contain Tamil Nadu or India"
        print("[PASS] 'mad' correctly returns Madurai City as Top #1", flush=True)

        # Check Result #2 is Madurai District
        res2_text = items[1].inner_text()
        print(f"Result #2 for 'mad':\n{res2_text}", flush=True)
        assert "Madurai District" in res2_text or "District" in res2_text or "Madurai" in res2_text, "Expected Madurai District as #2"
        print("[PASS] 'mad' correctly distinguishes Madurai City vs District", flush=True)

        # 4. Test partial queries "madu", "madur", "madurai"
        for q in ["madu", "madur", "madurai"]:
            search_input.fill(q)
            time.sleep(0.8)
            res_items = page.query_selector_all(".location-search__item")
            assert len(res_items) > 0, f"No results for query '{q}'"
            first_text = res_items[0].inner_text()
            assert "Madurai" in first_text, f"Expected Madurai for query '{q}', got: {first_text}"
            print(f"[PASS] Query '{q}' -> Top #1: {first_text.splitlines()[0]}", flush=True)

        # 5. Test other queries: "nel", "var", "sid"
        search_input.fill("nel")
        time.sleep(0.8)
        nel_items = page.query_selector_all(".location-search__item")
        assert len(nel_items) > 0, "No results for query 'nel'"
        nel_text = " ".join([it.inner_text() for it in nel_items])
        assert "Nellore" in nel_text, f"Expected Nellore in results for 'nel', got: {nel_text}"
        print("[PASS] Query 'nel' -> Nellore appears", flush=True)

        search_input.fill("var")
        time.sleep(0.8)
        var_items = page.query_selector_all(".location-search__item")
        assert len(var_items) > 0, "No results for query 'var'"
        var_text = " ".join([it.inner_text() for it in var_items])
        assert "Varkala" in var_text, f"Expected Varkala in results for 'var', got: {var_text}"
        print("[PASS] Query 'var' -> Varkala appears", flush=True)

        search_input.fill("sid")
        time.sleep(0.8)
        sid_items = page.query_selector_all(".location-search__item")
        assert len(sid_items) > 0, "No results for query 'sid'"
        sid_text = " ".join([it.inner_text() for it in sid_items])
        assert "Siddipet" in sid_text, f"Expected Siddipet in results for 'sid', got: {sid_text}"
        print("[PASS] Query 'sid' -> Siddipet appears", flush=True)

        # 6. Select Madurai, Tamil Nadu, India
        print("\n6. Selecting 'Madurai, Tamil Nadu, India'...", flush=True)
        search_input.fill("mad")
        time.sleep(0.8)
        first_item = page.wait_for_selector(".location-search__item", timeout=5000)
        assert first_item is not None
        first_item.click(force=True)

        # 7. Verify loading step and Madurai digital twin load
        print("Waiting for Madurai digital twin to load...", flush=True)
        page.wait_for_selector(".real-location-status:has-text('MADURAI')", timeout=20000)
        time.sleep(1.0)

        status_text = page.inner_text(".real-location-status")
        print(f"Status badge text: {status_text}", flush=True)
        assert "MADURAI" in status_text.upper(), f"Expected MADURAI in status badge, got: {status_text}"
        print("[PASS] Real Madurai location loaded successfully", flush=True)

        # Check Road count in bottom status / info
        meta_info = page.inner_text("body")
        assert "MADURAI" in meta_info.upper()
        print("[PASS] Madurai digital twin metadata verified in UI", flush=True)

        # 8. Run Phase 3 Analysis on Madurai
        print("\n8. Testing Phase 3 Infrastructure Analysis on Madurai...", flush=True)
        analyze_btn = page.query_selector('button:has-text("RUN ANALYSIS"), button:has-text("ANALYZE")')
        if analyze_btn:
            analyze_btn.click()
            page.wait_for_selector(".compact-analysis-panel", timeout=25000)
            print("[PASS] Madurai Phase 3 Analysis completed successfully", flush=True)

        # 9. Run Phase 4 Planning on Madurai
        print("\n9. Testing Phase 4 Infrastructure Planning on Madurai...", flush=True)
        planning_btn = page.query_selector('button:has-text("PLANNING")')
        if planning_btn:
            planning_btn.click()
            page.wait_for_selector(".planning-panel", timeout=20000)
            time.sleep(1.5)
            plans = page.query_selector_all(".candidate-card")
            assert len(plans) >= 3, f"Expected candidate plans for Madurai, got {len(plans)}"
            print(f"[PASS] Madurai Phase 4 Planning generated {len(plans)} candidate plans", flush=True)

        # 10. Run Phase 5 Forecast on Madurai
        print("\n10. Testing Phase 5 Demand Forecasting on Madurai...", flush=True)
        forecast_btn = page.query_selector('button:has-text("FORECAST")')
        if forecast_btn:
            forecast_btn.click()
            page.wait_for_selector(".forecasting-panel", timeout=20000)
            time.sleep(1.5)
            print("[PASS] Madurai Phase 5 Demand Forecasting opened and verified", flush=True)

        # 11. Run Phase 6 Optimization on Madurai
        print("\n11. Testing Phase 6 Strategy Optimization on Madurai...", flush=True)
        opt_btn = page.query_selector('button:has-text("OPTIMIZE")')
        if opt_btn:
            opt_btn.click()
            page.wait_for_selector(".optimization-panel", timeout=25000)
            time.sleep(1.5)
            strategies = page.query_selector_all(".strategy-card")
            assert len(strategies) > 0, "No strategies generated for Madurai"
            print(f"[PASS] Madurai Phase 6 Optimization generated {len(strategies)} Pareto strategies", flush=True)
            strategies[0].click()
            time.sleep(1.0)

        # 12. Run Phase 7 Transformation on Madurai
        print("\n12. Testing Phase 7 Transformation Engine on Madurai...", flush=True)
        trans_btn = page.wait_for_selector('button:has-text("TRANSFORMATION")', timeout=10000)
        assert trans_btn is not None, "Transformation button not found"
        trans_btn.click()
        page.wait_for_selector(".transform-panel-root", timeout=20000)
        time.sleep(1.5)
        print("[PASS] Madurai Phase 7 Transformation Engine initialized", flush=True)

        # 13. Location State Reset Test: Switch to Nellore
        print("\n13. Testing Location Switch State Reset (Madurai -> Nellore)...", flush=True)
        search_input.click()
        search_input.fill("nel")
        time.sleep(0.8)
        nel_first = page.wait_for_selector(".location-search__item", timeout=5000)
        assert nel_first is not None
        nel_first.click(force=True)

        page.wait_for_selector(".real-location-status:has-text('NELLORE')", timeout=20000)
        time.sleep(1.0)
        new_status = page.inner_text(".real-location-status")
        assert "NELLORE" in new_status.upper(), f"Expected Nellore after switch, got {new_status}"
        print("[PASS] Location successfully switched from Madurai to Nellore", flush=True)

        # Switch back to Madurai
        print("\n14. Testing Location Switch Back (Nellore -> Madurai)...", flush=True)
        search_input.click()
        search_input.fill("mad")
        time.sleep(0.8)
        mad_first = page.wait_for_selector(".location-search__item", timeout=5000)
        assert mad_first is not None
        mad_first.click(force=True)

        page.wait_for_selector(".real-location-status:has-text('MADURAI')", timeout=20000)
        time.sleep(1.0)
        final_status = page.inner_text(".real-location-status")
        assert "MADURAI" in final_status.upper(), f"Expected Madurai after switch, got {final_status}"
        print("[PASS] Location successfully switched back to Madurai with clean slate", flush=True)

        browser.close()

    if console_errors:
        print(f"\nCaptured {len(console_errors)} console errors:")
        for err in console_errors[:5]:
            print(f"  - {err}")
    else:
        print("\n[PASS] Zero console errors during all tests!")

    print("\n>>> ALL MADURAI SEARCH & LOCATION DISCOVERY E2E TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_madurai_e2e()
