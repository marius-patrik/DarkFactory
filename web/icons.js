import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import * as AnimatedIcons from "https://esm.sh/lucide-animated@1.0.5?deps=react@18.3.1,motion@13.4.0";

const roots = new WeakMap();

function resolveIcon(names) {
  for (const name of names) {
    const candidate = AnimatedIcons[name];
    if (candidate) return candidate;
  }
  return AnimatedIcons.ChevronsUpDownIcon || null;
}

export function setAnimatedIcon(target, names, options = {}) {
  if (!target) return;
  const list = Array.isArray(names)
    ? names
    : String(names || "").split("|").map(value => value.trim()).filter(Boolean);
  const Icon = resolveIcon(list);
  if (!Icon) return;

  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(
    React.createElement(Icon, {
      size: options.size || Number(target.dataset.iconSize || 18),
      animateOnHover: options.animateOnHover !== false,
      className: options.className || "animated-icon",
      "aria-hidden": true,
    })
  );
}

export function mountAnimatedIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(target => {
    setAnimatedIcon(target, target.dataset.icon, {
      size: Number(target.dataset.iconSize || 18),
    });
  });
}
