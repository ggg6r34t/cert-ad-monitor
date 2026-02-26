# CERT Ad Monitor Operations Runbook

## Scope

This runbook covers internal production operations for:
- token handling
- scan scheduler health
- datastore backup/restore
- alert channel checks
- incident recovery

## Daily Checks (5-10 min)

1. Open Settings panel and confirm:
- token is configured (`env` or `stored`)
- datastore is writable
- automation status is enabled and leader is healthy
- Slack/Telegram channel config is present
2. Review automation trend table for:
- sudden failures
- zero active scans across all clients
- unusual new flagged spikes
3. Trigger a manual automation run once per shift if no scheduled run occurred.

## Token Rotation

1. Generate a new Meta token from the official Ad Library API page.
2. In Settings:
- provide `INTERNAL_API_KEY`
- save new token in **Meta Token (Secure Server Storage)**
3. Refresh health and confirm `tokenConfigured=true`.
4. Trigger one test scan on a known client.
5. If using env token, redeploy with updated secret and verify health again.

## Alert Channel Validation

Slack:
- Ensure `SLACK_WEBHOOK_URL` is set.
- Trigger a scan expected to create a new flagged active ad.

Telegram:
- Ensure both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set.
- Trigger a scan expected to create a new flagged active ad.

If one channel fails, automation continues and logs channel failure.

## Datastore Backup

Requires `INTERNAL_API_KEY`.

Endpoint:
- `GET /api/state/backup`
- Header: `x-internal-api-key: <INTERNAL_API_KEY>`

Store the JSON response in internal backup storage.

Recommended cadence:
- nightly automated backup
- pre-release backup

## Datastore Restore

Requires `INTERNAL_API_KEY`.

Endpoint:
- `POST /api/state/backup`
- Header: `x-internal-api-key: <INTERNAL_API_KEY>`
- Body:

```json
{
  "state": {
    "clients": [],
    "triageMap": {},
    "version": 0
  }
}
```

After restore:
1. refresh the dashboard
2. run one client scan
3. confirm expected clients and triage records

## Meta API Failure Handling

The service includes retry/backoff and a circuit breaker.

When breaker opens:
- scan endpoints return temporary `503`
- wait for cooldown window
- verify internet/API status and token validity

If persistent:
1. verify token expiry/permission
2. reduce scan frequency (`AUTO_SCAN_INTERVAL_MINUTES`)
3. check Meta status and re-run after cooldown

## Scheduler Recovery

If automation appears stuck:
1. check `/api/health`
2. verify leader is true on at least one node
3. trigger `POST /api/automation/run` manually
4. restart container if no progress after 2 cycles

## Incident Recovery (Service Unavailable)

1. Validate env config (`META_AD_LIBRARY_TOKEN`, encryption key, internal key).
2. Confirm datastore path permissions.
3. Restart service.
4. Restore latest backup if state is corrupted.
5. Run manual scan and alert test before handoff.

