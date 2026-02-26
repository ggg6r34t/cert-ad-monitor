import Header from "@/components/Header";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Header dangerCount={0} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h1 className="mb-4 text-2xl font-bold text-white">Terms of Service</h1>
          <p className="mb-6 text-sm text-slate-300">Effective Date: February 26, 2026</p>

          <div className="space-y-6 text-sm leading-6 text-slate-200">
            <section>
              <h2 className="mb-2 text-base font-semibold text-white">1. Internal Use Only</h2>
              <p>
                CERT Ad Monitor is provided only for internal organizational security operations. You may
                use the tool only if you are an authorized user.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">2. Permitted Use</h2>
              <p>You agree to use the Service only for lawful security and brand-protection purposes.</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>No unauthorized access attempts.</li>
                <li>No misuse of API credentials or internal keys.</li>
                <li>No use that violates Meta Platform Terms or Developer Policies.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">3. Data and Confidentiality</h2>
              <p>
                Data in the Service may contain sensitive operational information. You must protect it,
                follow internal policy, and avoid unauthorized disclosure.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">4. Availability</h2>
              <p>
                The Service is provided on an internal best-effort basis. Availability may be interrupted
                for maintenance, incidents, or upstream API limitations.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">5. No Warranty</h2>
              <p>
                The Service is provided &quot;as is&quot; for internal operations. Detection outputs are
                assistive and may contain false positives or false negatives.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">6. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, the maintainer is not liable for indirect,
                incidental, or consequential damages arising from use of the Service.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">7. Changes</h2>
              <p>
                These terms may be updated at any time. Continued use after updates means acceptance of
                the revised terms.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-white">8. Contact</h2>
              <p>Email: lincoln.cly@gmail.com</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
