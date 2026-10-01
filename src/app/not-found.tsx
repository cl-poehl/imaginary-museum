import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-32 text-center">
      <p className="label text-faint">Gallery closed</p>
      <h1 className="font-serif text-[28px] italic">This room is empty.</h1>
      <p className="text-muted">The work or page you were looking for isn&apos;t in the collection.</p>
      <Link href="/" className="label mt-4 text-muted transition-colors hover:text-fg">
        Back to the galleries
      </Link>
    </main>
  );
}
