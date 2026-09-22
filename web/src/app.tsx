import { RepositoryDialog } from "./workspace/repository-dialog";
import { WorkspaceProvider } from "./workspace/context";
import { WorkbenchShell } from "./workbench/shell";

export function WorkbenchApp() {
  return (
    <WorkspaceProvider>
      <WorkbenchShell />
      <RepositoryDialog />
    </WorkspaceProvider>
  );
}
