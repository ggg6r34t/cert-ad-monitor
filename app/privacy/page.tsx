import Header from "@/components/Header";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Header dangerCount={0} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h1 className="mb-4 text-2xl font-bold text-white">Privacy Policy</h1>
          <p className="text-sm text-slate-300">
            Effective Date: February 26, 2026
          </p>
          <p className="mb-6 text-sm text-slate-300">
            Last Updated: February 26, 2026
          </p>

          <div className="space-y-6 text-sm leading-6 text-slate-200">
            <section>
              <p>
                This Privacy Policy describes how CERT Ad Monitor (the
                &quot;Service&quot;) processes information. The Service is an
                internal enterprise security tool used by authorized CERT
                personnel for brand protection and fraud monitoring using public
                ad data, including data made available through the Meta Ad
                Library API.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                1. Scope and Intended Use
              </h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>The Service is for internal organizational use only.</li>
                <li>
                  Access is restricted to authorized team members and approved
                  internal users.
                </li>
                <li>
                  The Service is not offered to the general public and is not
                  intended for consumer use.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                2. Data We Process
              </h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Operational user data: internal user identifiers (business
                  email, role, audit events).
                </li>
                <li>
                  Configuration data: monitored client names, domains, keywords,
                  countries, and workflow settings.
                </li>
                <li>
                  Scan and triage data: scan history, flagged records, statuses,
                  notes, and timestamps.
                </li>
                <li>
                  Meta Ad Library API data: public ad metadata returned by
                  Meta&apos;s Ad Library API.
                </li>
                <li>
                  Technical data: service logs, error logs, request metadata,
                  and security telemetry.
                </li>
                <li>
                  Alerting metadata: notification routing metadata for internal
                  Slack/Telegram alerting.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                3. Sources of Data
              </h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Authorized internal users of the Service.</li>
                <li>Meta Ad Library API (public ad data).</li>
                <li>System-generated logs and monitoring events.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                4. How We Use Data
              </h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Operate and maintain the Service.</li>
                <li>
                  Detect and investigate potentially fraudulent or impersonation
                  ads.
                </li>
                <li>
                  Support internal triage, reporting, and incident response
                  workflows.
                </li>
                <li>Generate security alerts for internal teams.</li>
                <li>Monitor system reliability, security, and abuse.</li>
                <li>Comply with legal and regulatory obligations.</li>
              </ul>
              <p className="mt-2">
                We do not use Service data for consumer advertising, marketing
                profiling, or unrelated commercial purposes.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                5. Legal Bases (Where Applicable)
              </h2>
              <p>
                Where GDPR/UK GDPR applies, processing is based on one or more
                of:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Legitimate interests (security monitoring, fraud prevention,
                  platform integrity).
                </li>
                <li>
                  Contractual necessity (delivery of internal security
                  services).
                </li>
                <li>
                  Legal obligation (compliance, law enforcement requests,
                  recordkeeping).
                </li>
                <li>Consent, where required by law.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                6. Meta Platform and API Compliance
              </h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Use data only for permitted security and brand-protection
                  purposes.
                </li>
                <li>
                  Follow applicable Meta Platform Terms and Meta Developer
                  Policies.
                </li>
                <li>
                  Do not perform unauthorized scraping or access attempts.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                7. Data Sharing
              </h2>
              <p>We may share data only with:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Authorized internal users and administrators.</li>
                <li>
                  Infrastructure and processor vendors supporting hosting,
                  storage, and operations under safeguards.
                </li>
                <li>Legal/regulatory authorities when required by law.</li>
                <li>
                  Successor entities in lawful corporate transactions subject to
                  legal protections.
                </li>
              </ul>
              <p className="mt-2">We do not sell personal information.</p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                8. Retention
              </h2>
              <p>
                We retain data only as long as necessary for security
                operations, incident response, legal obligations, and legitimate
                business needs. Retention periods vary by data type.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                9. Security Measures
              </h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Role-based and least-privilege access controls.</li>
                <li>Encryption in transit and secure secret handling.</li>
                <li>
                  Internal logging, monitoring, and incident response controls.
                </li>
                <li>
                  Restricted handling of API credentials and notification
                  tokens.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                10. International Transfers
              </h2>
              <p>
                If data is transferred internationally, we apply safeguards as
                required by applicable law, including contractual and technical
                protections.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                11. Privacy Rights
              </h2>
              <p>
                Depending on jurisdiction, individuals may have rights to
                access, correct, delete, restrict, or object to processing of
                personal data, and to lodge complaints with supervisory
                authorities.
              </p>
              <p className="mt-2">
                Requests can be submitted to: privacy@[your-domain].com
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                12. California Notice (CCPA/CPRA)
              </h2>
              <p>
                If California law applies, California residents may have rights
                to know, correct, and delete personal information, and to be
                free from discrimination for exercising privacy rights. We do
                not sell personal information.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                13. Children&apos;s Data
              </h2>
              <p>
                The Service is an internal enterprise tool and is not directed
                to children.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                14. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. Updates
                will be posted at this policy URL with a revised &quot;Last
                Updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">
                15. Contact
              </h2>
              <p>Owner: Internal CERT Tool Maintainer</p>
              <p>Email: licoln.cly@gmail.com</p>
              <p>
                This application is an internal tool and is not operated as a
                public commercial service.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
