import { createElement, useEffect, useState } from "react";
import type { GitHubIssue } from "@darkfactory/github";

/** State wrapper for loading GitHub issues/epics. */
export function useGitHubIssues(repo: string, state: string = "open") {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchIssues() {
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}/issues?state=${state}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (active) {
          setIssues(data);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }
    fetchIssues();
    return () => { active = false; };
  }, [repo, state]);

  return { issues, loading, error };
}

/** Render a generic GitHub issue card or item. */
export function IssueItem({ issue }: { issue: GitHubIssue }) {
  return createElement("div", { className: "p-4 border border-gray-200 rounded-lg shadow-sm mb-4" }, [
    createElement("div", { className: "flex justify-between items-center" }, [
      createElement("h3", { className: "text-lg font-semibold" }, [
        createElement("a", { href: issue.html_url, target: "_blank", rel: "noopener noreferrer", className: "hover:underline" }, issue.title),
        createElement("span", { className: "text-gray-500 ml-2" }, `#${issue.number}`)
      ]),
      createElement("span", { className: `px-2 py-1 rounded text-xs ${issue.state === "open" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}` }, issue.state)
    ]),
    issue.body && createElement("p", { className: "text-sm text-gray-600 mt-2 line-clamp-2" }, issue.body),
    createElement("div", { className: "flex gap-2 mt-2" }, 
      issue.labels.map((l) => {
        const name = typeof l === "string" ? l : l.name;
        return createElement("span", { key: name, className: "px-2 py-1 rounded bg-gray-100 text-xs text-gray-700" }, name);
      })
    )
  ]);
}
