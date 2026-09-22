import { rendererCapabilityForPath } from "@/renderers/capabilities";
import type { WorkbenchTab } from "@/workbench/model";
import { useWorkbenchRuntime } from "@/workbench/runtime";
import { RenderedResource, useResourceComparison } from "./resource-view";

export function DocumentTab({ tab }: { tab: WorkbenchTab }) {
  const runtime = useWorkbenchRuntime();
  const path = typeof tab.state.path === "string" ? tab.state.path : "";
  const resource = useResourceComparison(path, "none", "");
  const capability = rendererCapabilityForPath(path);

  if (!path) {
    return (
      <div className="tab-empty">
        <strong>Document</strong>
        <span>No rendered resource is open.</span>
      </div>
    );
  }

  return (
    <div className="resource-tab">
      <div className="resource-controls">
        <span className="resource-path" title={path}>{path}</span>
        <span className="resource-representation">{capability.label}</span>
        <button
          type="button"
          onClick={() => runtime.openTab("editor", "main", { path, renderer: "editor" })}
        >
          Open Editor
        </button>
      </div>
      <div className="resource-body">
        {resource.loading ? (
          <div className="tab-empty"><span>Loading renderer…</span></div>
        ) : resource.error ? (
          <div className="tab-empty">
            <strong>Renderer unavailable</strong>
            <span>{resource.error}</span>
          </div>
        ) : (
          <RenderedResource path={path} snapshot={resource.current} />
        )}
      </div>
    </div>
  );
}
