import { createElement, useEffect, useState } from "react";
import type { GitHubPullRequest } from "@darkfactory/github";

/** Page listing current open Pull Requests. */
export function PRsPage({ repo }: { repo: string }) {
  const [prs, setPRs] = useState<GitHubPullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchPRs() {
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}/pulls?state=open`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (active) {
          setPRs(data);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }
    fetchPRs();
    return () => { active = false; };
  }, [repo]);

  return createElement("div", { className: "p-6" }, [
    createElement("h1", { className: "text-2xl font-bold mb-4" }, "Pull Requests"),
    loading && createElement("p", null, "Loading PRs..."),
    error && createElement("p", { className: "text-red-500" }, `Error: ${error.message}`),
    !loading && !error && prs.length === 0 && createElement("p", null, "No open pull requests found."),
    createElement("div", null, prs.map((pr) => 
      createElement("div", { key: pr.id, className: "p-4 border border-gray-200 rounded-lg shadow-sm mb-4" }, [
        createElement("div", { className: "flex justify-between items-center" }, [
          createElement("h3", { className: "text-lg font-semibold" }, [
            createElement("a", { href: pr.html_url, target: "_blank", rel: "noopener noreferrer", className: "hover:underline" }, pr.title),
            createElement("span", { className: "text-gray-500 ml-2" }, `#${pr.number}`)
          ]),
          createElement("span", { className: "px-2 py-1 rounded text-xs bg-blue-100 text-blue-800" }, "open")
        ]),
        createElement("p", { className: "text-sm text-gray-500 mt-1" }, `Branch: ${pr.head.ref} -> ${pr.base.ref}`),
        pr.body && createElement("p", { className: "text-sm text-gray-600 mt-2 line-clamp-2" }, pr.body)
      ])
    ))
  ]);
}
