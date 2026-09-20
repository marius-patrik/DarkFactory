import { createElement } from "react";
import { useGitHubIssues, IssueItem } from "../components/github";

/** Page listing current open DarkFactory Epics. */
export function EpicsPage({ repo }: { repo: string }) {
  const { issues, loading, error } = useGitHubIssues(repo);

  const epics = issues.filter((i) => 
    i.labels.some((l) => {
      const name = typeof l === "string" ? l : l.name;
      return name.toLowerCase().includes("epic");
    })
  );

  return createElement("div", { className: "p-6" }, [
    createElement("h1", { className: "text-2xl font-bold mb-4" }, "Epics"),
    loading && createElement("p", null, "Loading epics..."),
    error && createElement("p", { className: "text-red-500" }, `Error: ${error.message}`),
    !loading && !error && epics.length === 0 && createElement("p", null, "No open epics found."),
    createElement("div", null, epics.map((epic) => createElement(IssueItem, { key: epic.id, issue: epic })))
  ]);
}
