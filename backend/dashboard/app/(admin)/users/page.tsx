"use client";

import { useEffect, useState } from "react";
import { listUsers, updateUserStatus, UserMe } from "@/lib/api-client";

export default function UsersPage() {
  const [users, setUsers] = useState<UserMe[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    listUsers()
      .then((res) => {
        setUsers(res.items);
        setTotal(res.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStatus = async (user: UserMe) => {
    const next = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await updateUserStatus(user.id, next);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (loading) return <p className="text-gray-400">Loading users...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Users</h1>
      <p className="mb-6 text-sm text-gray-400">{total} total users</p>
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-card text-gray-400">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-surface-border">
                <td className="px-4 py-3 text-gray-200">{u.email}</td>
                <td className="px-4 py-3 text-gray-400">{u.displayName ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400">{u.roles.join(", ")}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      u.status === "ACTIVE" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleStatus(u)}
                    className="text-xs text-accent hover:underline"
                  >
                    {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
