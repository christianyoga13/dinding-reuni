export type ImageOrientation = "portrait" | "landscape";

const IMAGE_ORIENTATION_QUERY_KEY = "dr_orient";

export function withImageOrientationMarker(
  imageUrl: string,
  orientation: ImageOrientation
): string {
  try {
    const parsed = new URL(imageUrl);
    parsed.searchParams.set(IMAGE_ORIENTATION_QUERY_KEY, orientation === "portrait" ? "p" : "l");
    return parsed.toString();
  } catch {
    const separator = imageUrl.includes("?") ? "&" : "?";
    const marker = orientation === "portrait" ? "p" : "l";
    return `${imageUrl}${separator}${IMAGE_ORIENTATION_QUERY_KEY}=${marker}`;
  }
}

export function parseImageOrientationFromUrl(
  imageUrl: string
): ImageOrientation | undefined {
  try {
    const parsed = new URL(imageUrl);
    const marker = parsed.searchParams.get(IMAGE_ORIENTATION_QUERY_KEY);
    if (marker === "p") {
      return "portrait";
    }

    if (marker === "l") {
      return "landscape";
    }

    return undefined;
  } catch {
    const marker = imageUrl.match(/[?&]dr_orient=(p|l)(?:[&#]|$)/i)?.[1]?.toLowerCase();
    if (marker === "p") {
      return "portrait";
    }

    if (marker === "l") {
      return "landscape";
    }

    return undefined;
  }
}
