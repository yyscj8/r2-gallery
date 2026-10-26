# 0001. Pass and Access Code Authentication

## Context and Problem Statement
The gallery needs to support paid access via Mianbaoduo, 30-day rolling subscriptions, multi-device (PC + mobile, max 2 devices), and bookmark retention across renewals, while eliminating all user registration friction (no email, no password forms).

## Decision
We decouple the user's permanent identity (**Pass**) from the single-use 30-day top-up keys (**Access Code**):
- When a user enters their first Access Code, a persistent `Pass` is minted in D1 with `expires_at = now + 30 days`.
- The user's device receives an HttpOnly session cookie bound to this `Pass`.
- To renew access after or before expiration, the user enters a newly purchased Access Code into the renewal box. D1 invalidates the new code and extends `expires_at = (expires_at > now ? expires_at : now) + 30 days`.
- `Bookmark` records and `Device Session` records are permanently owned by the `Pass`, ensuring zero bookmark loss and zero device re-authentication hassle upon renewal.
