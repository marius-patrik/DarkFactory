import React from "react";
import { createRoot } from "react-dom/client";
import "dockview-react/dist/styles/dockview.css";
import "./workbench.css";
import "./workbench/root-layout.css";
import "./publication.css";
import { WorkbenchApp } from "./app";
import { TooltipProvider } from "@/components/ui/tooltip";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={300}>
      <WorkbenchApp />
    </TooltipProvider>
  </React.StrictMode>,
);
