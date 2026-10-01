"use client";

// What the visitor sees while the building goes up: the museum's name and a
// thin line filling as the first works arrive. Shown while the 3D code loads
// (as next/dynamic's placeholder), then over the scene until its first images
// are in (World3D's SceneVeil), then it fades away and does not come back as
// more load on the walk. Kept free of three.js, so it shows at once.

export function Veil({ progress = 0, fading = false }: { progress?: number; fading?: boolean }) {
  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-[#0b0a09] transition-opacity duration-700 ${fading ? "pointer-events-none opacity-0" : ""}`}
      role="status"
      aria-label="Opening the museum"
    >
      <p className="font-serif text-[28px] text-white/85">Pendant</p>
      <div className="h-px w-40 bg-white/10">
        <div className="h-full bg-[#c2ae86] transition-[width] duration-500" style={{ width: `${Math.max(4, progress)}%` }} />
      </div>
      <p className="label text-white/40">Opening the museum</p>
    </div>
  );
}
