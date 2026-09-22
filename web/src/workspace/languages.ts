import { resourceCapabilityForPath } from "@/capabilities/registry";

export function languageForPath(path: string) {
  return resourceCapabilityForPath(path).language;
}
