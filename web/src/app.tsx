import { GithubAuthController } from "./github/auth-controller";
import { RepositoryDialog } from "./workspace/repository-dialog";
import { WorkspaceProvider } from "./workspace/context";
import { WorkbenchShell } from "./workbench/shell";

export function WorkbenchApp() {
  return (
    <WorkspaceProvider>
      <GithubAuthController />
      <WorkbenchShell />
      <RepositoryDialog />
    </WorkspaceProvider>
  );
}
