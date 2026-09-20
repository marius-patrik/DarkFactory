import { createElement, useEffect, useState } from "react";
import type { DocsPage } from "@darkfactory/docs/content";

/** Documentation and Content graph explorer. */
export function DocsPageExplorer() {
  const [pages, setPages] = useState<DocsPage[]>([]);
  const [selected, setSelected] = useState<DocsPage | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDocs() {
      try {
        const response = await fetch("./content.json");
        if (response.ok) {
          const graph = await response.json();
          if (active) {
            setPages(graph.pages || []);
            if (graph.pages && graph.pages.length > 0) {
              setSelected(graph.pages[0]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load content.json for docs explorer", err);
      }
    }
    loadDocs();
    return () => { active = false; };
  }, []);

  return createElement("div", { className: "p-6 flex gap-6" }, [
    createElement("div", { key: "sidebar", className: "w-64 border-r pr-6 border-gray-200 dark:border-gray-800" }, [
      createElement("h2", { className: "font-bold text-lg mb-4" }, "Topics"),
      createElement("ul", { className: "space-y-2" }, 
        pages.map((p) => 
          createElement("li", { key: p.id }, 
            createElement("button", { 
              onClick: () => setSelected(p),
              className: `w-full text-left px-3 py-2 rounded text-sm ${selected?.id === p.id ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}`
            }, p.title)
          )
        )
      )
    ]),
    createElement("div", { key: "content", className: "flex-1" }, 
      selected ? [
        createElement("h1", { key: "title", className: "text-3xl font-extrabold mb-4" }, selected.title),
        createElement("div", { 
          key: "body", 
          className: "prose max-w-none dark:prose-invert",
          dangerouslySetInnerHTML: { __html: selected.markdown } // Note: we'd ideally render the processed html, or we fallback here
        })
      ] : createElement("p", null, "No topic selected.")
    )
  ]);
}
