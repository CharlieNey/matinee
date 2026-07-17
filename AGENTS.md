<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Browser testing: use cmux browser tools

For QA, screenshots, and dogfooding, use the `cmux browser …` CLI (detect availability via `command -v cmux`). It drives a real WebKit pane that opens visibly in a side split. Quick recipe:

```
cmux browser open http://localhost:3000            # spawns a browser surface, prints surface ref
cmux browser --surface surface:N goto <url>        # navigate
cmux browser --surface surface:N snapshot -i       # AX tree with [ref=eN] handles
cmux browser --surface surface:N screenshot --out /tmp/x.png
cmux browser --surface surface:N eval '<js>'       # run JS in page
```

**Selectors:** Playwright-style `:has-text(...)` is **not** a valid CSS selector and will throw `js_error`. Use one of:
- `cmux browser <surface> find role button --name "Rush"` (preferred — uses AX tree)
- `eval '[...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Rush").click()'`

**Other gotchas:**
- `cmux browser network requests` returns `not_supported on WKWebView` — use `eval` to wrap `fetch`/install a `PerformanceObserver` if you need network introspection.
- Each click that navigates may change the active surface — re-run `cmux tree` to confirm the browser surface ref before issuing more commands.
- Surface refs are ephemeral; never hardcode them. Run `cmux ping` and `cmux tree --all` to verify the socket and discover the current browser surface.
- `cmux read-screen --surface <s>` reads another pane's terminal output (useful for tailing the dev-server pane).
