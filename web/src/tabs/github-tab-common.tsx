import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useWorkspace } from "@/workspace/context";

export function dateLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function MarkdownBody({ children }: { children: string | null | undefined }) {
  if (!children) return <p className="github-empty-body">No description.</p>;
  return <div className="github-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown></div>;
}

export function useRepositoryIdentity() {
  const workspace = useWorkspace();
  return {
    workspace,
    fullName: workspace.workspace?.repository.fullName ?? "",
    token: workspace.token,
  };
}

export function LoadingState({ label }: { label: string }) {
  return <div className="tab-empty"><span>Loading {label}…</span></div>;
}

export function ErrorState({ error }: { error: string }) {
  return <div className="tab-empty"><strong>GitHub request failed</strong><span>{error}</span></div>;
}

export function RepositoryRequired() {
  return <div className="tab-empty"><strong>No workspace active</strong><span>Open a GitHub repository first.</span></div>;
}
