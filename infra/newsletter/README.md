# Gauntlet newsletter infrastructure

This directory begins the migration from Buttondown to a Gauntlet-controlled newsletter system:

- **listmonk** manages subscribers, lists, opt-in, campaigns, templates, archives, analytics, and suppression;
- **PostgreSQL** stores listmonk data;
- **Amazon SES** will provide outbound SMTP delivery;
- **newsletter.gauntlet.run** is the intended public listmonk hostname;
- **updates@gauntlet.run** is the intended visible From address;
- **bounce.gauntlet.run** is the recommended custom MAIL FROM domain.

The live website must continue using Buttondown until this system has a production host, verified SES identity, working bounce processing, and a tested public subscription endpoint.

## Current status

This foundation provides:

- a pinned listmonk v6.2.0 and PostgreSQL 17 Docker Compose stack;
- local-only port binding so listmonk is not accidentally exposed without HTTPS;
- persistent database and upload volumes;
- an environment-variable example with no real credentials;
- a database backup command;
- a Caddy reverse-proxy example;
- a reusable Gauntlet campaign template; and
- the v0.6.1 announcement stored as the first campaign source.

It does **not** create AWS resources, publish DNS records, deploy a server, migrate subscribers, or modify the live gauntlet.run form.

## Local startup

Requirements:

- Docker Engine or Docker Desktop with Docker Compose v2;
- port 9000 free locally.

```bash
cd infra/newsletter
cp .env.example .env
```

Replace both example passwords in `.env`, then validate and start the stack:

```bash
make config
make up
make logs
```

Open `http://127.0.0.1:9000/`. The administrator is created from `LISTMONK_ADMIN_USER` and `LISTMONK_ADMIN_PASSWORD` on the first startup.

Create a backup with:

```bash
make backup
```

Backups are ignored by Git and must be copied to separate secure storage.

## Recommended production topology

Run the Compose stack on a small persistent Linux host. Keep listmonk bound to `127.0.0.1:9000` and publish it through an HTTPS reverse proxy. `Caddyfile.example` shows the intended hostname.

The host must provide:

- persistent disk for Docker volumes;
- automatic security updates;
- regular encrypted off-host backups;
- outbound access to the SES SMTP endpoint on port 587;
- inbound HTTPS access for subscription pages, tracked links, and the SES bounce webhook.

Do not place SES SMTP credentials, AWS access keys, database passwords, or administrator passwords in the repository.

## Amazon SES setup

Use one AWS Region for the SES identity, SMTP credentials, SNS topic, and listmonk SMTP configuration. `us-east-1` is the provisional default in `.env.example`; changing it is safe before production.

1. In SES, create a domain identity for `gauntlet.run` with Easy DKIM.
2. Publish the SES-provided DKIM CNAME records in the domain's DNS.
3. Configure `bounce.gauntlet.run` as a custom MAIL FROM domain.
4. Publish the SES-provided MX and SPF records for the custom MAIL FROM domain.
5. Add an initial DMARC record at `_dmarc.gauntlet.run`, starting with monitoring policy, for example:

   ```text
   v=DMARC1; p=none; adkim=s; aspf=r; pct=100
   ```

6. Request SES production access. Accounts in the SES sandbox cannot send campaigns to ordinary unverified recipients.
7. Create SES SMTP credentials in the same Region. These credentials are different from ordinary AWS access keys and are Region-specific.
8. Enter the SMTP endpoint, port 587, username, and password under listmonk **Settings → SMTP**. Use STARTTLS.
9. Set the default sender to `Gauntlet <updates@gauntlet.run>` and send test messages before importing any subscriber.

## Bounce and complaint processing

Automatic SES feedback processing is required before production sending.

1. In listmonk **Settings → Bounces**:
   - enable bounce processing;
   - enable bounce webhooks;
   - enable SES;
   - blocklist after one hard bounce;
   - blocklist after one complaint.
2. Create an Amazon SNS Standard topic such as `ses-bounces` in the same Region.
3. Create an HTTPS subscription pointing to:

   ```text
   https://newsletter.gauntlet.run/webhooks/service/ses
   ```

   Leave raw message delivery disabled.
4. On the SES `gauntlet.run` identity, route bounce and complaint notifications to that SNS topic and include original headers.
5. Test with the SES mailbox simulator addresses for bounce and complaint events before sending a real campaign.

## Initial listmonk configuration

After the first launch:

1. Set the public root URL to `https://newsletter.gauntlet.run`.
2. Create a public, double-opt-in list named **Gauntlet Development Updates**.
3. Import `templates/gauntlet-campaign.html` under **Campaigns → Templates**. It contains the required `{{ template "content" . }}` insertion point and listmonk's subscription-management links.
4. Customize the opt-in confirmation email and public subscription pages to match the Gauntlet palette.
5. Decide whether view and click tracking should be anonymous, identified, or disabled. Default to the least invasive setting that still answers a real project need.

## Buttondown migration

There is currently only one outside subscriber. After the new system is fully tested:

1. Add that address to the new double-opt-in list without preconfirming it, so listmonk sends a fresh confirmation request.
2. Confirm that subscription, unsubscribe, export, and data-deletion flows all work.
3. Replace the Buttondown form on `gauntlet.run` with a POST to:

   ```text
   https://newsletter.gauntlet.run/api/public/subscription
   ```

   The request must include the subscriber email and the public list UUID. For an HTML form, listmonk accepts the list UUID as a hidden field named `l`.
4. Verify successful and duplicate-subscription responses in the live browser.
5. Remove the Buttondown embed only after the new form and opt-in email have passed production testing.

## Deployment checklist

- [ ] Choose the persistent production host.
- [ ] Point `newsletter.gauntlet.run` to it.
- [ ] Install Docker and an HTTPS reverse proxy.
- [ ] Generate production secrets and start the stack.
- [ ] Configure off-host database backups.
- [ ] Create and verify the SES domain identity.
- [ ] Configure custom MAIL FROM, SPF, DKIM, and DMARC.
- [ ] Request SES production access.
- [ ] Create Region-specific SES SMTP credentials.
- [ ] Configure and test listmonk SMTP.
- [ ] Configure SNS bounce and complaint processing.
- [ ] Create the double-opt-in public list.
- [ ] Import and test the Gauntlet campaign template.
- [ ] Reconfirm the existing subscriber.
- [ ] Switch the website subscription form.
- [ ] Retire Buttondown after one successful production campaign.
