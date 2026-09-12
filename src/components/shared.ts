import { useEffect, useState } from "react";
import type { ArchivedFile } from "../types";

export const cx = (...values: (string | false | undefined)[]) =>
  values.filter(Boolean).join(" ");

export const shortPath = (value: string) => value.split("/").slice(-2).join("/");

/** Solution-ish files stay behind the prediction gate of a real mission. */
export const isReferenceFile = (file: ArchivedFile) =>
  /(?:^|\/)(?:refactored|solution)(?:\/|\.|$)|SOLUTION\.md$/i.test(file.path);

/** Live match against a media query; false on the server or without matchMedia. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let list: MediaQueryList;
    try {
      list = window.matchMedia(query);
    } catch {
      return;
    }
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** The two-column mission layout only exists at 1050 px and up. */
export const DESKTOP_QUERY = "(min-width: 1050px)";
