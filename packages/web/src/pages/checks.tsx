import { createElement, useEffect, useState } from "react";

interface ActionRun {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  html_url: string;
  event: string;
}

/** Page listing recent workflow runs and check suites. */
export function ChecksPage({ repo }: { repo: string }) {
  const [runs, setRuns] = useState<ActionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchRuns() {
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=10`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (active) {
          setRuns(data.workflow_runs || []);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }
    fetchRuns();
    return () => { active = false; };
  }, [repo]);

  return createElement("div", { className: "p-6" }, [
    createElement("h1", { className: "text-2xl font-bold mb-4" }, "Checks & Suites"),
    loading && createElement("p", null, "Loading checks..."),
    error && createElement("p", { className: "text-red-500" }, `Error: ${error.message}`),
    !loading && !error && runs.length === 0 && createElement("p", null, "No action runs found."),
    createElement("div", null, runs.map((run) => 
      createElement("div", { key: run.id, className: "p-4 border border-gray-200 rounded-lg shadow-sm mb-4" }, [
        createElement("div", { className: "flex justify-between items-center" }, [
          createElement("h3", { className: "text-lg font-semibold" }, [
            createElement("a", { href: run.html_url, target: "_blank", rel: "noopener noreferrer", className: "hover:underline" }, run.name),
            createElement("span", { className: "text-gray-500 ml-2" }, `(${run.event})`)
          ]),
          createElement("span", { className: `px-2 py-1 rounded text-xs ${run.status === "completed" ? (run.conclusion === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800") : "bg-yellow-100 text-yellow-800"}` }, 
            run.status === "completed" ? run.conclusion : run.status
          )
        ])
      ])
    ))
  ]);
}
export { ChecksPage as RunsPage };
