// src/components/layout/HeroSection.tsx
export function HeroSection() {
  return (
    <section className="relative w-full h-[600px] overflow-hidden rounded-[48px] bg-slate-900">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      >
        {/* Use a relative path from the public folder */}
        <source src="/videos/hero-citizen-report.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Overlay content... */}
    </section>
  );
}