export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">sitecms</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Redigera din hemsida — enkelt och tryggt. Inloggning kommer i nästa
          steg.
        </p>
        <div className="mt-6 space-y-3" aria-hidden>
          <div className="h-10 rounded-lg bg-neutral-100" />
          <div className="h-10 rounded-lg bg-neutral-100" />
          <div className="h-10 rounded-lg bg-neutral-900/90" />
        </div>
      </div>
    </main>
  );
}
