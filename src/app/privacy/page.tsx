import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "No accounts, no cookies, no tracking",
    body: "Pendant has no sign-in, sets no cookies and runs no analytics or advertising. Nobody follows you around the museum.",
  },
  {
    title: "Your choices stay on your device",
    body: (
      <>
        What you choose in the taste room, the works you save and your settings are kept in your browser&apos;s own
        storage, on your device. They are never sent to us. Your own room is worked out in your browser from them.
        You can wipe them at any time on the <Link href="/reset" className="underline underline-offset-2">reset page</Link>,
        or by clearing this site&apos;s data in your browser.
      </>
    ),
  },
  {
    title: "Links you share",
    body: "When you share your taste or a spot in the museum, the link itself carries what it shows (a summary of your taste, or a work's name). Only the people you send it to see it.",
  },
  {
    title: "Hosting",
    body: "The site is hosted by Vercel Inc. (USA). Like any web server, Vercel briefly logs each request (your IP address, browser and the time) to run the service and keep it secure. We do not use these logs to identify anyone.",
  },
  {
    title: "Images",
    body: "Every work's picture is served by the site itself. Only when you look very closely at a work does its full-resolution image load from Wikimedia Commons (Wikimedia Foundation, USA), which then sees your IP address as any website would. The images, and texts drawn from Wikipedia, are used under their open licences: each work's page links to its image's source, author and licence.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-12 pb-24 sm:px-8">
      <p className="label text-muted">Privacy</p>
      <h1 className="mt-3 font-serif text-[34px] leading-tight md:text-[40px]">What this museum knows about you</h1>
      <p className="mt-4 text-muted">Very little, and almost all of it stays with you.</p>
      <div className="mt-10 flex flex-col gap-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-serif text-[22px] italic">{s.title}</h2>
            <p className="mt-2 leading-relaxed text-fg/85">{s.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
