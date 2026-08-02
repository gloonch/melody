# Golmelo Measurement Runbook

## Setup

Set `VITE_GA4_MEASUREMENT_ID` in the production build environment. The client does not load Google Analytics when the value is empty. When deploying with Compose, pass the production env file during the build so the Vite build receives the value:

```sh
docker compose --env-file .prod.env -f docker-compose-prod.yml up -d --build
```

Mark these GA4 events as primary conversions:

- `order_submitted`
- `course_request_submitted`

Mark these as secondary conversions:

- `signup_completed`
- `contact_form_submitted`

## Baseline

On release day, export the previous 90 days and record:

- GA4 users, sessions, source/medium, landing pages, and each conversion count/rate.
- GSC clicks, impressions, CTR, average position, indexed pages, and top queries/pages.

Compare against the following 90 days. Keep the first four weeks as the initial monitoring window and annotate the deployment date in GA4.

## CRO Experiments

Run only one experiment at a time after the first four-week baseline is stable:

1. Compare the specific hero CTA copy against the previous generic copy. Use submitted orders and course requests as the decision metrics, not clicks alone.
2. Compare the current image-only product cards against cards that also show the real base price. Keep product order, images, and grid unchanged.

Do not declare a winner from a small sample. Record each variant's date range and traffic allocation in the GA4 annotation/export.

## Privacy

Only predefined event parameters are accepted. Never send phone numbers, names, addresses, free-text messages, order notes, or full URLs containing user-entered query values.
