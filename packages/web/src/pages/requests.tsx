import { createElement } from "react";
import { useGitHubIssues, IssueItem } from "./github";

/** Page listing current open DarkFactory Requests. */
export function RequestsPage({ repo }: { repo: string }) {
  const { issues, loading, error } = useGitHubIssues(repo);

  // Filter issues with label "request" or similar
  const requests = issues.filter((i) => 
    i.labels.some((l) => {
      const name = typeof l === "string" ? l : l.name;
      return name.toLowerCase().includes("request");
    })
  );

  return createElement("div", { className: "p-6" }, [
    createElement("h1", { className: "text-2xl font-bold mb-4" }, "Requests"),
    loading && createElement("p", null, "Loading requests..."),
    error && createElement("p", { className: "text-red-500" }, `Error: ${error.message}`),
    !loading && !error && requests.length === 0 && createElement("p", null, "No open requests found."),
    createElement("div", null, requests.map((req) => createElement(IssueItem, { key: req.id, issue: req })))
  ]);
}
