declare module "turndown" {
  export interface TurndownOptions {
    headingStyle?: "setext" | "atx";
    bulletListMarker?: "-" | "+" | "*";
    codeBlockStyle?: "indented" | "fenced";
  }

  export type Plugin = unknown;

  export default class TurndownService {
    constructor(options?: TurndownOptions);
    use(plugin: Plugin): this;
    keep(selector: string | string[]): this;
    turndown(input: string): string;
  }
}

declare module "turndown-plugin-gfm" {
  import type { Plugin } from "turndown";

  export const gfm: Plugin;
}
