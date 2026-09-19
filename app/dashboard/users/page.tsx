"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  ApiClientError,
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
} from "@/lib/api-client";
import type { UserDTO, UserRole } from "@/types/user";
import { LoadingRow } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function UsersPage() {
  const { t } = useLanguage();
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserDTO[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "real_estate_officer" as UserRole });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [sessionStatus, session, router]);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetchUsers();
      setUsers(res.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user.role === "admin") {
      load();
    }
  }, [sessionStatus, session, load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormErrors({});
    setCreating(true);
    try {
      const res = await createUser(form);
      setUsers((prev) => [res.data, ...prev]);
      setForm({ name: "", email: "", password: "", role: "real_estate_officer" });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        if (err.fieldErrors) setFormErrors(err.fieldErrors);
      } else {
        setFormError(t("form.genericError"));
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(user: UserDTO, role: UserRole) {
    const prev = users;
    setUsers((list) => list.map((u) => (u._id === user._id ? { ...u, role } : u)));
    try {
      await updateUser(user._id, { role });
    } catch (err) {
      setUsers(prev);
      if (err instanceof ApiClientError) alert(err.message);
    }
  }

  async function handleActiveToggle(user: UserDTO) {
    const prev = users;
    const active = !user.active;
    setUsers((list) => list.map((u) => (u._id === user._id ? { ...u, active } : u)));
    try {
      await updateUser(user._id, { active });
    } catch (err) {
      setUsers(prev);
      if (err instanceof ApiClientError) alert(err.message);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await deleteUser(pendingDeleteId);
      setUsers((list) => list.filter((u) => u._id !== pendingDeleteId));
    } catch (err) {
      if (err instanceof ApiClientError) alert(err.message);
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  }

  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && session?.user.role !== "admin")) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-brass-600">
        {t("users.eyebrow")}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
        {t("users.title")}
      </h1>
      <p className="mt-2 text-ink-500">{t("users.subtitle")}</p>

      <div className="mt-8 rounded-lg border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="font-display text-base font-semibold text-ink-800">{t("users.addUser")}</h2>
        {formError && (
          <div className="mt-3 rounded-md border border-rust-500/30 bg-rust-50 px-4 py-3 text-sm text-rust-600">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="label-field" htmlFor="name">{t("users.name")}</label>
            <input
              id="name"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            {formErrors.name && <p className="field-error">{formErrors.name}</p>}
          </div>
          <div>
            <label className="label-field" htmlFor="email">{t("auth.email")}</label>
            <input
              id="email"
              type="email"
              className="input-field"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            {formErrors.email && <p className="field-error">{formErrors.email}</p>}
          </div>
          <div>
            <label className="label-field" htmlFor="password">{t("auth.password")}</label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
            {formErrors.password && <p className="field-error">{formErrors.password}</p>}
          </div>
          <div>
            <label className="label-field" htmlFor="role">{t("users.role")}</label>
            <select
              id="role"
              className="input-field"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            >
              <option value="real_estate_officer">{t("users.roleRealEstateOfficer")}</option>
              <option value="sales_officer">{t("users.roleSalesOfficer")}</option>
              <option value="project_manager">{t("users.roleProjectManager")}</option>
              <option value="admin">{t("users.roleAdmin")}</option>
            </select>
          </div>
          <div className="sm:col-span-4">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? t("form.saving") : t("users.addUser")}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8">
        {status === "loading" && <LoadingRow />}
        {status === "error" && <ErrorState onRetry={load} />}
        {status === "ready" && (
          <div className="overflow-x-auto rounded-lg border border-ink-100 bg-white shadow-card">
            <table className="w-full min-w-[640px] text-start text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 text-start font-semibold">{t("users.name")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("auth.email")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("users.role")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("users.active")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("dashboard.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u._id === session?.user.id;
                  return (
                    <tr key={u._id} className="border-b border-ink-50 last:border-0 hover:bg-stone-50">
                      <td className="px-4 py-3 font-medium text-ink-800">
                        {u.name}
                        {isSelf && <span className="ms-2 text-xs font-normal text-ink-400">({t("users.you")})</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          className="input-field w-auto py-1.5 text-xs"
                          disabled={isSelf}
                        >
                          <option value="real_estate_officer">{t("users.roleRealEstateOfficer")}</option>
                          <option value="sales_officer">{t("users.roleSalesOfficer")}</option>
                          <option value="project_manager">{t("users.roleProjectManager")}</option>
                          <option value="admin">{t("users.roleAdmin")}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleActiveToggle(u)}
                          disabled={isSelf}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                            u.active ? "bg-moss-100 text-moss-600" : "bg-stone-200 text-ink-400"
                          }`}
                        >
                          {u.active ? t("users.active") : t("users.inactive")}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => setPendingDeleteId(u._id)}
                            disabled={isSelf}
                            className="btn-danger px-3 py-1.5 text-xs disabled:opacity-40"
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title={t("users.confirmDeleteTitle")}
        description={t("users.confirmDeleteDesc")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
