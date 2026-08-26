import { V2_ONBOARDING_POINTS } from "../mockData";
import { CheckIcon } from "../icons";

function OrbSphere() {
  return (
    <div className="relative h-40 w-40 mx-auto flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, #00F2FE, #10B981, #00F2FE)",
          filter: "blur(22px)",
          opacity: 0.55,
        }}
        aria-hidden
      />
      <div
        className="absolute inset-3 rounded-full border-[3px]"
        style={{ borderColor: "#00F2FE", boxShadow: "0 0 30px -4px rgba(0,242,254,0.8)" }}
        aria-hidden
      />
      <div
        className="absolute inset-8 rounded-full border-2"
        style={{ borderColor: "#10B981", opacity: 0.8, boxShadow: "0 0 20px -4px rgba(16,185,129,0.7)" }}
        aria-hidden
      />
      <div className="absolute inset-[38%] rounded-full bg-[#0B0E14]" aria-hidden />
    </div>
  );
}

export function V2Onboarding({ onGetStarted, onExit }: { onGetStarted: () => void; onExit: () => void }) {
  return (
    <div className="min-h-screen flex flex-col justify-center px-2 pb-10">
      <div className="flex justify-end mb-6">
        <button
          onClick={onExit}
          className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full border border-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Exit prototype
        </button>
      </div>

      <OrbSphere />

      <h1 className="text-2xl font-extrabold text-center text-white mt-8 tracking-tight">
        Welcome to Runway <span className="text-teal-300">OS</span>
      </h1>

      <div className="mt-8 space-y-5">
        {V2_ONBOARDING_POINTS.map((pt) => (
          <div key={pt.title} className="flex items-start gap-3">
            <span
              className="mt-0.5 h-7 w-7 shrink-0 flex items-center justify-center rounded-full"
              style={{ background: "rgba(0,242,254,0.12)", color: "#00F2FE" }}
              aria-hidden
            >
              <CheckIcon size={14} />
            </span>
            <div>
              <p className="text-sm font-bold text-white">{pt.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{pt.body}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onGetStarted}
        className="mt-10 w-full py-4 rounded-full text-sm font-extrabold text-[#04120E] transition-transform active:scale-[0.98]"
        style={{
          background: "linear-gradient(90deg, #00F2FE, #10B981)",
          boxShadow: "0 0 24px -6px rgba(0,242,254,0.6)",
          transitionTimingFunction: "var(--ease-spring)",
        }}
      >
        Get started
      </button>
      <button className="mt-4 text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        Already have an account? <span className="text-teal-300 font-semibold">Sign in</span>
      </button>
    </div>
  );
}
