## Plan: Ignore `accept_connection` SECURITY DEFINER finding

The scanner will flag `public.accept_connection(uuid)` as a `SECURITY DEFINER` function executable by `authenticated`. This is intentional — the function must run with elevated rights to atomically accept a connection and create the DM thread inside one transaction that normal RLS would block. It self-authorizes by checking `auth.uid() IN (conn.user_a, conn.user_b)` before any writes.

### Steps
1. Run a fresh security scan to surface the new finding for `accept_connection`.
2. Call `manage_security_finding` with `operation: ignore` on that specific finding, with rationale: "SECURITY DEFINER required to atomically accept a connection and create the DM thread under RLS; the function verifies `auth.uid()` is one of the two parties before any write."
3. Update `@security-memory` to add `accept_connection` to the allow-list of intentionally `SECURITY DEFINER` functions (alongside the 7 RLS helpers already documented), so future scans don't re-flag it.

### Not doing
- No schema, policy, or app code changes.
- Not touching any other findings.
