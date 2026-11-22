import { useMatches } from "react-router-dom";

type TitleHandle = {
  title?: string;
};

export function usePageTitle(): string {
  const matches = useMatches();
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const handle = matches[index]?.handle as TitleHandle | undefined;
    if (handle?.title) return handle.title;
  }
  return "";
}
