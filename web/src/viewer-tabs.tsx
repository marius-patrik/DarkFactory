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
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeId}
            className={tab.id === activeId ? "app-tab active" : "app-tab"}
            onClick={() => onSelect(tab.id)}
            title={tab.path || tab.title}
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
            {tab.id !== "document" && (
              <span
                role="button"
                tabIndex={0}
                className="app-tab-close"
                aria-label={"Close " + tab.title}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose(tab.id);
                  }
                }}
              >
                <AnimatedIcon names={["XIcon"]} />
              </span>
            )}
          </button>
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
