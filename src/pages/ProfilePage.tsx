import { defaultPermissions } from "../data/auth";
import type { AuthUser } from "../types/auth";

type ProfilePageProps = {
  user: AuthUser;
};

const ProfilePage = ({ user }: ProfilePageProps) => {
  const tokenExpiry = user.tokenExpiresAt
    ? new Date(user.tokenExpiresAt).toLocaleString()
    : "Unknown";
  const registerTime = user.registerTime
    ? new Date(user.registerTime).toLocaleString()
    : "Unknown";

  return (
  <section className="px-6 py-12">
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="rounded-3xl border border-sky-100 bg-white/90 p-8 shadow-card">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
              Profile
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-ink-900">
              Welcome back, {user.username}
            </h1>
            <p className="mt-2 text-sm text-ink-700">
              Manage your access details and see which permissions are enabled.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold text-sky-700">
              Authenticated session
            </span>
            <span className="rounded-full bg-ink-800 px-4 py-2 text-xs font-semibold text-white">
              JWT access
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink-900">Account details</h2>
          <dl className="mt-4 space-y-4 text-sm text-ink-700">
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-ink-900">User ID</dt>
              <dd>{user.userId ?? user.username}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-ink-900">Email</dt>
              <dd>{user.email || "Not set"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-ink-900">User type</dt>
              <dd>{user.userType ?? "Unknown"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-ink-900">User level</dt>
              <dd>{user.userLevel ?? "Unknown"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-ink-900">Credit</dt>
              <dd>{user.credit ?? "Unknown"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-ink-900">Registered</dt>
              <dd>{registerTime}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-ink-900">Token expires</dt>
              <dd>{tokenExpiry}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink-900">Permissions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {defaultPermissions.map((permission) => (
              <span
                key={permission.id}
                className="rounded-full border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700"
              >
                {permission.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
  );
};

export default ProfilePage;
