# Banking journey · TypeScript + Playwright

A small, reproducible **learning portfolio** for testing a banking-style client portal. The test target is a synthetic local service, not a real bank. No employer code, customer records, real credentials or external banking APIs are used.

An AI-assisted project for Anna Aleksandrova, focused on test design, data consistency, isolated fixtures and actionable failure diagnostics. Architecture choices and scope are documented so reviewers can assess the tests as well as the results.

## What the suite demonstrates

- End-to-end sign-in and application submission, with API verification of persisted amounts and status.
- Service-to-UI consistency: a record created through the API is displayed in the portal.
- Direct API checks for authorization, amount boundaries, idempotency and session revocation.
- A controlled 503 response and delayed service response, with observable UI assertions.
- Unique users and separate request contexts so tests can run in parallel without global resets.
- A small Page Object for user actions; business assertions remain visible in the tests.
- HTML/JUnit reports and traces, screenshots and video retained for failed UI runs.
- A negative control: deliberately corrupt the balance and verify that the UI assertion fails.

## Run locally

Requires Node.js 24 and npm. From this directory:

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm test
npm run test:negative-control
```

Playwright starts and stops the local service automatically at `http://127.0.0.1:4317`. Leave that port free. No separate server, account or environment file is required.

```sh
npm run test:api    # request-context checks; no browser installation needed
npm run test:ui     # Chromium UI checks
npm run report     # open the last normal run's HTML report
```

The negative-control command is expected to print one failed Playwright test and then a success message saying the deliberate regression was detected. The command itself returns zero only for the expected assertion failure; startup errors do not count as success. Its artifacts are separate from the normal report.

## Product contract

- Each synthetic account starts with **125075 cents / USD 1,250.75**.
- Application amounts are integer cents from **10000 through 1000000 inclusive** (USD 100–10,000).
- A successful submission creates an application with status `submitted`.
- A repeated idempotency key for the same user and amount returns the original record.
- The same key with a different amount returns 409 and must not change the original record.
- An authenticated user cannot list or retrieve another user's applications.
- After sign-out, the revoked session must no longer read account data.

Expected results come from this contract, not from reading the implementation's constants into the tests.

## Layout

```text
demo/                     Local synthetic service and minimal test UI
tests/fixtures.ts         Isolated users and API request contexts
tests/pages/portal.ts     UI actions
tests/api.spec.ts         Direct API contracts and negative cases
tests/ui.spec.ts          Business journeys and service failure handling
scripts/negative-control.mjs
.github/workflows/tests.yml
docs/test-strategy.md
docs/interview-walkthrough-ru.md
```

## CI

The included GitHub Actions workflow installs Chromium, checks TypeScript, runs the suite and verifies the negative control. HTML/JUnit reports and diagnostic artifacts are uploaded even on failure. **A local passing run does not imply that GitHub Actions has run**; the workflow needs to execute after the repository is published.

## Local verification

Verified on Windows with Node.js 24 on 21 November 2026:

- TypeScript check passed.
- **20 tests passed**: 13 API cases and 7 Chromium UI cases.
- The negative control detected the deliberately incorrect balance (USD 1,250.76 instead of USD 1,250.75).

These results apply to the synthetic local target and the versions in `package-lock.json`.

## Scope and limitations

This is a deliberately small test exercise. The service uses disposable in-memory data, plain demo passwords and simplified cookie authentication; it is bound to loopback only and is not suitable for production or public hosting. Restarting it removes all records. The service is a test double, not a real microservice integration. The outage scenario uses network interception and is not a production resilience assessment.

Only Chromium is in the initial matrix. This repository does not demonstrate payment processing, database/SQL verification, real identity flows, MFA, load testing, PCI compliance or a full security assessment. More test cases are not automatically better coverage: see the risk-based choices in [test strategy](docs/test-strategy.md).

## Before sharing

1. Run the suite and inspect an HTML report and a failure trace.
2. Explain one API test and one UI test without reading a script.
3. Make one personal improvement and describe why it matters in a commit.
4. Keep the learning-project and AI-assistance descriptions accurate.
5. Publish to your own GitHub repository and use its URL in LinkedIn Featured.

Implementation references: [Playwright fixtures](https://playwright.dev/docs/test-fixtures), [web server lifecycle](https://playwright.dev/docs/test-webserver), [API testing](https://playwright.dev/docs/api-testing).
