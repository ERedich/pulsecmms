import { getStoredUser } from "../lib/auth";

export function HomePage() {
  const user = getStoredUser();

  return (
    <div className="py-8">
      <h1 className="px-3 text-lg leading-6 font-semibold text-on-surface">
        Dashboard
      </h1>

      {user ? (
        <dl className="mt-8 grid max-w-xl grid-cols-1 gap-x-8 gap-y-4 px-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium leading-4 text-on-surface-variant">
              Benutzer
            </dt>
            <dd className="mt-1 text-base leading-6 text-on-surface">
              <span className="font-semibold">{user.key}</span> · {user.loginName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium leading-4 text-on-surface-variant">
              Hauptmandant
            </dt>
            <dd className="mt-1 text-base leading-6 text-on-surface">
              <span className="font-semibold">{user.primarySite.key}</span> —{" "}
              {user.primarySite.name}
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
