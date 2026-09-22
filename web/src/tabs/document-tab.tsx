import type { AppearanceMode } from "@/settings";
import type { WorkbenchTab } from "@/workbench/model";
import { EditorTab } from "./editor-tab";

export function DocumentTab({
  tab,
  theme,
  updateState,
}: {
  tab: WorkbenchTab;
  theme: AppearanceMode;
  updateState: (patch: Record<string, unknown>) => void;
}) {
  const normalized: WorkbenchTab = {
    ...tab,
    state: {
      renderer: "browser",
      review: false,
      compare: "none",
      compareTarget: "",
      representation: "auto",
      ...tab.state,
    },
  };
  return <EditorTab tab={normalized} theme={theme} updateState={updateState} />;
}
