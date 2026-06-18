export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-6 text-center">
      <span className="rounded-full bg-blush-light px-4 py-1 text-sm font-medium text-blush-dark">
        قريبًا • Bientôt • Coming soon
      </span>
      <h1 className="font-arabic text-6xl font-bold tracking-tight text-ink">
        NONA
      </h1>
      <p className="max-w-md text-lg text-muted">
        متجر نسائي عصري — لانجري، فساتين، روبات وأحذية. الدفع عند الاستلام.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-blush" />
        <span className="h-2 w-2 rounded-full bg-gold" />
        <span className="h-2 w-2 rounded-full bg-ink" />
      </div>
    </main>
  );
}
