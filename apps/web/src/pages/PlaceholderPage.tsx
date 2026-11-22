import { usePageTitle } from "../lib/pageTitle";

export function PlaceholderPage() {
  const title = usePageTitle();

  return (
    <div className="px-3 py-8">
      {title ? (
        <h1 className="text-lg leading-6 font-semibold text-on-surface">
          {title}
        </h1>
      ) : null}
    </div>
  );
}
