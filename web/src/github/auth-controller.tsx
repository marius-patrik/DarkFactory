import { useEffect, useRef } from "react";
import {
  completeGithubSignIn,
  hasGithubAuthCallback,
  markGithubSignInError,
  markGithubSignInSuccess,
} from "./auth";
import { useWorkspace } from "@/workspace/context";

export function GithubAuthController() {
  const { connectToken, setDialogOpen } = useWorkspace();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !hasGithubAuthCallback()) return;
    handled.current = true;
    setDialogOpen(true);
    void completeGithubSignIn()
      .then(async (token) => {
        if (!token) return;
        await connectToken(token);
        markGithubSignInSuccess();
      })
      .catch(markGithubSignInError);
  }, [connectToken, setDialogOpen]);

  return null;
}
