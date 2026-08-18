"use client";

import { useEffect, useState } from "react";
import { listAuditLogs, AuditLog } from "@/lib/api-client";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");

  useEffect(() => {
    listAuditLogs(1, action || undefined)
      .then((res) => {
        setLogs(res.items);
        setTotal(res.total);
      })
      .catch(console.error);
  }, [action]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Audit Logs</h1>
      <p className="mb-4 text-sm text-gray-400">{total} entries</p>
      <input
        placeholder="Filter by action..."
        value={action}
        onChange={(e) => setAction(e.target.value)}
        className="mb-4 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-white"
      />
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-card text-gray-400">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-surface-border">
                <td className="px-4 py-3 text-gray-400">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-200">{log.action}</td>
                <td className="px-4 py-3 text-gray-400">
                  {log.resource}
                  {log.resourceId ? ` / ${log.resourceId}` : ""}
                </td>
                <td className="px-4 py-3 text-gray-400">{log.actorRole ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
