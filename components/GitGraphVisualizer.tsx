'use client';
import { Gitgraph, templateExtend, TemplateName } from "@gitgraph/react";

interface Commit {
  message: string;
  files: string[];
  ts: number;
}

interface GitGraphVisualizerProps {
  commits: Commit[];
  branch: string;
}

export default function GitGraphVisualizer({ commits, branch }: GitGraphVisualizerProps) {
  if (!commits || commits.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-4xl mb-4">🌱</div>
          <p className="text-stone-200 font-mono text-sm">No commits yet.</p>
          <p className="text-stone-300 text-xs mt-1">Use git add and git commit to see your graph here.</p>
        </div>
      </div>
    );
  }

  return (
   <div className="flex-grow p-6 bg-[#0d1117] overflow-auto">
  <div className="mb-4 flex items-center gap-2">
    <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest">Commit Graph</span>
    <span className="text-xs text-stone-300 font-mono">current branch: {branch}</span>
  </div>

  <div className="bg-[#161b22] rounded-xl border border-white/10 p-4 min-h-[300px] [&_svg_text]:fill-[#e5e7eb] [&_svg_tspan]:fill-[#e5e7eb]">
    <Gitgraph
      options={{
        template: templateExtend(TemplateName.BlackArrow, {
          colors: ["#f59e0b", "#3b82f6", "#22c55e"],
          branch: { label: { font: "bold 12px monospace" } },
          commit: { message: { font: "12px monospace", displayAuthor: false } },
        }),
      }}
    >
      {(gitgraph) => {
        const mainBranch = gitgraph.branch(branch || "main");
        commits.forEach((c) => {
          mainBranch.commit(c.message || "commit");
        });
      }}
    </Gitgraph>
  </div>
</div>
  );
}