import { AnimatedIcon } from "@/components/animated-icon";
import { TooltipAction } from "./viewer-ui";

export type AppTab = {
  id: string;
  kind: "document" | "source" | "settings";
  title: string;
  path?: string;
};

export function AppTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
}: {
  tabs: AppTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="app-tabbar" role="tablist" aria-label="Open tabs">
      <div className="app-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={tab.id === activeId ? "app-tab active" : "app-tab"}
            title={tab.path || tab.title}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab.id === activeId}
              className="app-tab-main"
              onClick={() => onSelect(tab.id)}
            >
              <AnimatedIcon
                names={
                  tab.kind === "settings"
                    ? ["SettingsIcon"]
                    : tab.kind === "source"
                      ? ["FileCode2Icon", "FileIcon"]
                      : ["FileTextIcon"]
                }
              />
              <span className="app-tab-title">{tab.title}</span>
            </button>
            {tab.id !== "document" && (
              <button
                type="button"
                className="app-tab-close"
                aria-label={"Close " + tab.title}
                onClick={() => onClose(tab.id)}
              >
                <AnimatedIcon names={["XIcon"]} />
              </button>
            )}
          </div>
        ))}
      </div>
      <TooltipAction
        label="New tab"
        icon={["PlusIcon"]}
        onClick={onNew}
        className="new-tab-action"
      />
    </div>
  );
}
