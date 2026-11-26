export function ScoringMethodology() {
  const categories = [
    {
      name: 'Boot & Render',
      weight: '50 pts',
      detail:
        'Executable load, kernel/API shims, first frame output, menu rendering, and entering the playable world.',
    },
    {
      name: 'World & Foliage',
      weight: '15 pts',
      detail:
        'Streaming geometry, terrain LODs, vegetation rendering, and texture/asset decompression fidelity.',
    },
    {
      name: 'Lighting & Shaders',
      weight: '15 pts',
      detail:
        'DXIL/SPIR-V shader translation, global illumination, sky/ambient passes, and shadow stability.',
    },
    {
      name: 'Audio & Physics',
      weight: '10 pts',
      detail:
        'Audio buffer mixing, spatial sound output, vehicle handling, and ragdoll/collision parity.',
    },
    {
      name: 'Frame Pacing & Stability',
      weight: '10 pts',
      detail:
        'Sustained FPS, 1% lows, memory footprint headroom, and crash-free session longevity.',
    },
  ];

  return (
    <section
      id="scoring"
      aria-label="Scoring Methodology"
      className="scroll-mt-24 pt-4"
    >
      <div className="max-w-2xl mb-6">
        <p className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400">
          Methodology
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#0D0E14] dark:text-white mt-1">
          How the progress score works
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          Every repository is scored on one transparent 100-point weighted scale. Unbenchmarked repositories strictly display <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">N/A</span> until real measurements are logged—no estimates or synthetic numbers are ever fabricated.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {categories.map((cat, idx) => (
          <div
            key={cat.name}
            className="rounded-2xl bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-[#1E2636] p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                  0{idx + 1}
                </span>
                <span className="font-mono text-xs font-bold text-pink-600 dark:text-pink-400 tabular-nums">
                  {cat.weight}
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-[#0D0E14] dark:text-white mt-3">
                {cat.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {cat.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
