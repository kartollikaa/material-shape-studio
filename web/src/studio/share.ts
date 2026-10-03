import { decodeShare, type SharedShape } from "@material-shape-studio/core";

export async function loadSharedShape(page: Document, fragment = page.defaultView?.location.hash ?? ""): Promise<SharedShape | null> {
  if (!fragment.startsWith("#doc=")) return null;
  return decodeShare(fragment);
}
