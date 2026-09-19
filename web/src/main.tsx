import React from "react";
import { createRoot } from "react-dom/client";
import "pdfjs-dist/web/pdf_viewer.css";
import "./viewer.css";
import { ViewerApp } from "./app";
import { TooltipProvider } from "@/components/ui/tooltip";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={300}>
      <ViewerApp />
    </TooltipProvider>
  </React.StrictMode>,
);
