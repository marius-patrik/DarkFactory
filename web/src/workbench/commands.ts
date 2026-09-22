import { useEffect } from "react";

type CommandHandlers = {
  togglePrimary: () => void;
  toggleSecondary: () => void;
  togglePanel: () => void;
  focusNavigation: () => void;
  focusCommands: () => void;
};

function modifier(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey;
}

export function useWorkbenchShortcuts(handlers: CommandHandlers) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !modifier(event)) return;
      const key = event.key.toLowerCase();
      let handled = true;

      if (key === "b" && event.altKey && !event.shiftKey) handlers.toggleSecondary();
      else if (key === "b" && !event.altKey && !event.shiftKey) handlers.togglePrimary();
      else if (key === "j" && !event.altKey && !event.shiftKey) handlers.togglePanel();
      else if (key === "p" && event.shiftKey && !event.altKey) handlers.focusCommands();
      else if (key === "p" && !event.shiftKey && !event.altKey) handlers.focusNavigation();
      else handled = false;

      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
