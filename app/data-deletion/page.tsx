import Header from "@/components/Header";

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Header dangerCount={0} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h1 className="mb-4 text-2xl font-bold text-white">Data Deletion Instructions</h1>
          <div className="space-y-4 text-sm leading-6 text-slate-200">
            <p>
              CERT Ad Monitor is an internal tool. If you want your data removed from this application,
              email <span className="font-medium text-white">lincoln.cly@gmail.com</span> with the subject
              line <span className="font-medium text-white">&quot;CERT Ad Monitor Data Deletion Request&quot;</span>.
            </p>
            <p>Please include:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Your work email used with the tool.</li>
              <li>The client record(s) or scan data you want deleted.</li>
              <li>Any relevant date range.</li>
            </ul>
            <p>
              We will verify the request and process deletion within a reasonable period, subject to legal,
              security, and audit retention requirements.
            </p>
            <p>
              Some records may be retained where required for incident response integrity, compliance, or
              legal obligations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
