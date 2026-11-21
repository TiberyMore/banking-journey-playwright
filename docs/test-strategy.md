# Test strategy

## Highest-value risks

**Wrong financial data.** The balance formatting test checks a fixed expected business value. Submission combines a UI assertion with a direct API check of amount in cents, status and owner. Absence of HTTP errors alone cannot prove correctness.

**Duplicate application.** Three concurrent requests with one key must produce exactly one record. A different payload with the same key must be rejected without changing the existing amount.

**Unauthorized access.** Anonymous access is rejected. Two distinct users prove ownership boundaries using an application created by one of them. Logout revokes API access from the browser context, not just the visible page.

**Service failure.** A controlled 503 must show a meaningful error, leave no false success message and create no record. A delayed account response must eventually display correct data using a web-first assertion, without fixed synchronization sleeps in the test flow.

## Distribution by level

Boundary and ownership rules are checked directly through the API. A smaller UI layer checks journeys, rendering and error feedback. This keeps business validation from depending entirely on browser navigation.

API setup is intentionally used to provision users and seed records. The portfolio is about testing the portal and submission contract, not repeated UI registration. Assertions stay in test cases rather than being hidden inside the Page Object.

## Isolation and diagnostics

Every test creates unique user data. Separate API contexts isolate cookies; each UI test gets a fresh browser context. The server lives for one suite run and its memory is discarded afterwards. No test resets shared state while other workers are using it.

Retries are disabled so a flaky test is not silently rescued. Reports identify the failing step; traces and video are kept for failures. A happy-path network collector checks relevant API errors, while expected 401/422/503 responses are asserted explicitly in negative tests.

## Demonstrating failure detection

The test server supports a local-only fault flag that changes the starting balance by one cent. The negative-control script runs the balance test against this fault and verifies that the assertion sees USD 1,250.76 instead of USD 1,250.75. This checks one specific failure mode; it is not a mutation score or proof of complete coverage.

## Useful next changes for the owner

- Prove idempotency keys are scoped per user by reusing a key across two accounts.
- Test recovery after the mocked 503 is removed.
- Add a missing-idempotency-key test and duplicate registration tests.
- Add Firefox/WebKit after verifying local and CI browser support.
- Add accessibility checks, an input-validation UI test and a documented bug report.
- Inspect an intentionally failed trace and record the diagnosis in your own words.

These are proposed extensions, not features already demonstrated by the initial suite.
