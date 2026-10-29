# Sources and activation — SmartGuard 0.4.0

## Active in the delivered APK

- Bundled official-domain catalog (53 brands / 312 domains). Some entries have legacy-pending
  provenance in the repository; catalogue membership is not a safety guarantee.
- Local link rules and local message patterns (Spanish heuristics, not a semantic AI model).
- Existing team check-link service for destination, redirects, observed HTML and RDAP age when
  returned. Popular-domain enrichment depends on the existing server dataset, not this APK.
- Google Public DNS JSON API: only the hostname is sent for public links.

## Prepared but NOT active

check-threats supports four adapters. Provider coverage is reported per response as clear,
match, unavailable, not-configured or skipped. Missing credentials, quota and parsing errors
are never interpreted as a clean lookup. No provider data is bundled or redistributed.

1. Google Web Risk — WEB_RISK_API_KEY (appropriate product for commercial threat lookup).
2. Google Safe Browsing — SAFE_BROWSING_API_KEY and SAFE_BROWSING_NONCOMMERCIAL=true.
   Only enable for eligible non-commercial use. It overlaps Web Risk; more providers do not
   mean independent evidence and a lack of reports does not guarantee safety.
3. URLhaus — URLHAUS_AUTH_KEY. Only current online reports are matched; historical/offline
   records do not become an unconditional red warning. Review abuse.ch fair-use terms.
4. PhishTank — PHISHTANK_APP_KEY. A match requires verified=true and valid=true.

No API keys were available and the Supabase connection did not include the team's project.
No unrelated project was used. OpenPhish is not integrated: its terms restrict commercial
use and sharing; an approved license/program would be needed for the intended use.

## Team activation procedure

Use the team's project tzweryoduyrsbvnzjqmb, not other personal/municipal projects.
Review the Edge Function code and provider terms, then store provider keys as server secrets.
Never place these secrets in VITE_ variables, the mobile env file or the APK.

Deploy the new check-threats function using the Supabase CLI with the team project ref and
public invocation configured. Do not replace check-link or apply unrelated migrations.
The source references the shared local privacy module in src/lib/link-analysis/url-privacy.ts;
include it in the deployment bundle. Check that the deployed gateway accepts the project's
publishable key, as the current destination function does. Add gateway rate limiting and
provider-account budgets before production. The in-memory per-instance request budget is
only a small-instance safeguard, not a distributed billing limit.

Test a known benign URL, the provider's official harmless test URLs, a private token URL
(which must be skipped without external requests), missing keys and provider outages.
The Android flag VITE_THREAT_CHECK_ENABLED stays false until those checks pass. Then set
it to true in .env.mobile and rebuild the APK with the same pilot signing key.

## Not implemented or not verified

No full visual clone detection, browser execution of remote pages, file downloads/scans,
certificate ownership validation, automatic rule hot-updates, push reporting backend or
semantic LLM analysis is claimed. Native SMS, battery/manufacturer behaviour, head-up
appearance and Clerk sign-in still require a real-device test.

## Primary documentation checked 2026-10-15

- https://developers.google.com/speed/public-dns/docs/doh/json
- https://docs.cloud.google.com/web-risk/docs/overview
- https://developers.google.com/safe-browsing/reference
- https://urlhaus.abuse.ch/api/
- https://phishtank.org/api_info.php
- https://www.openphish.com/terms.html
