import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-medium">BTF Recipe Builder</h1>
        <p className="text-sm text-neutral-500">
          Build a nutritionally complete blenderized tube feeding recipe, step by step.
        </p>
        <Link
          href="/wizard"
          className="inline-block rounded bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Start building a recipe
        </Link>
      </div>
    </main>
  );
}
