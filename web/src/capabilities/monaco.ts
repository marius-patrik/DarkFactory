type MonacoLanguages = {
  getLanguages: () => Array<{ id: string }>;
  register: (definition: {
    id: string;
    extensions?: string[];
    aliases?: string[];
  }) => void;
  setMonarchTokensProvider: (languageId: string, provider: unknown) => void;
  setLanguageConfiguration: (languageId: string, configuration: unknown) => void;
};

export type MonacoCapabilityApi = {
  languages: MonacoLanguages;
};

export function registerCapabilityLanguages(monaco: MonacoCapabilityApi) {
  if (monaco.languages.getLanguages().some((language) => language.id === "typst")) return;

  monaco.languages.register({
    id: "typst",
    extensions: [".typ"],
    aliases: ["Typst", "typst"],
  });

  monaco.languages.setLanguageConfiguration("typst", {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: """, close: """ },
      { open: "$", close: "$" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: """, close: """ },
      { open: "$", close: "$" },
      { open: "*", close: "*" },
      { open: "_", close: "_" },
    ],
  });

  monaco.languages.setMonarchTokensProvider("typst", {
    tokenizer: {
      root: [
        [/\/\*/, "comment", "@comment"],
        [/\/\/.*$/, "comment"],
        [/^\s*=+\s.*$/, "keyword"],
        [/#(?:let|set|show|if|else|for|while|import|include|context|return|break|continue)\b/, "keyword"],
        [/#(?:[A-Za-z_][\w-]*)(?=\s*\()/, "type.identifier"],
        [/\b(?:true|false|none|auto)\b/, "constant"],
        [/\b\d+(?:\.\d+)?(?:pt|mm|cm|in|em|fr|%)?\b/, "number"],
        [/"(?:[^"\\]|\\.)*"/, "string"],
        [/\$[^$]*\$/, "string"],
        [/\*[^*]+\*/, "strong"],
        [/_([^_]+)_/, "emphasis"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\/\*/, "comment", "@push"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  });
}
