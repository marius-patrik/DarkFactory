import { createElement } from "react";
import { useGitHubIssues, IssueItem } from "../components/github";

/** Page listing current Planning issues. */
export function PlanningPage({ repo }: { repo: string }) {
  const { issues, loading, error } = useGitHubIssues(repo);

  const planning = issues.filter((i) => 
    i.labels.some((l) => {
      const name = typeof l === "string" ? l : l.name;
      return name.toLowerCase().includes("planning");
    })
  );

  return createElement("div", { className: "p-6" }, [
    createElement("h1", { className: "text-2xl font-bold mb-4" }, "Planning State"),
    loading && createElement("p", null, "Loading planning items..."),
    error && createElement("p", { className: "text-red-500" }, `Error: ${error.message}`),
    !loading && !error && planning.length === 0 && createElement("p", null, "No open planning issues found."),
    createElement("div", null, planning.map((item) => createElement(IssueItem, { key: item.id, issue: item })))
  ]);
}
