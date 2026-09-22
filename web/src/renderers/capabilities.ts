export {
  extensionForPath,
  isTextResourcePath,
  listResourceCapabilityProviders,
  mimeForPath,
  preferredWorkbenchTabForPath,
  registerResourceCapabilityProvider,
  representationForPath,
  resourceCapabilityForPath,
  type BrowserRendererId as RendererCapabilityId,
  type ResourceCapabilityProvider,
} from "@/capabilities/registry";

export { resourceCapabilityForPath as rendererCapabilityForPath } from "@/capabilities/registry";
