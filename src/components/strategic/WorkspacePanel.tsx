"use client";

import { useEffect, useState, type ReactElement } from "react";
import type { DatasetHealth } from "@/lib/dataset/types";
import type { Workspace } from "@/lib/workspace/types";

interface WorkspacePanelProps {
  workspace: Workspace | null;
  health: DatasetHealth | null;
  onOpen: (workspace: Workspace) => void;
  onCreate: (name: string) => Promise<void>;
}

export function WorkspacePanel({ workspace, health, onOpen, onCreate }: WorkspacePanelProps): ReactElement {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    fetch("/api/workspaces")
      .then((response) => response.json() as Promise<{ workspaces?: Workspace[] }>)
      .then((body) => setWorkspaces(body.workspaces ?? []))
      .catch(() => setWorkspaces([]));
  }, [workspace?.id]);

  const create = async (): Promise<void> => {
    if (!name.trim()) return;
    await onCreate(name.trim());
    setName("");
    setCreating(false);
  };

  return (
    <section className="border-b border-cyan-400/10 pb-3 mb-3 space-y-2" data-testid="workspace-panel">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Рабочее пространство</div>
          {workspace ? <div className="text-xs font-mono text-cyan-300" data-testid="workspace-name">{workspace.name}</div> : <div className="text-[10px] text-slate-500">Локальный режим</div>}
        </div>
        {health && <span className={`text-[8px] font-mono ${health.status === "OPERATIONAL" ? "text-emerald-400" : "text-amber-400"}`}>{health.status}</span>}
      </div>
      {health?.datasetVersion && <div className="text-[8px] font-mono text-slate-600">dataset {health.datasetVersion}</div>}
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setCreating((value) => !value)} className="flex-1 rounded border border-cyan-400/20 px-2 py-1.5 text-[9px] font-mono text-cyan-300 hover:bg-cyan-400/10">Создать workspace</button>
        {workspaces.length > 0 && (
          <select aria-label="Открыть workspace" value={workspace?.id ?? ""} onChange={(event) => { const selected = workspaces.find((item) => item.id === event.target.value); if (selected) onOpen(selected); }} className="min-w-0 flex-1 rounded border border-white/10 bg-slate-900 px-1 text-[9px] font-mono text-slate-300">
            <option value="">Открыть...</option>
            {workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}
      </div>
      {creating && (
        <div className="flex gap-1.5">
          <label className="sr-only" htmlFor="workspace-name">Название workspace</label>
          <input id="workspace-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Название workspace" className="min-w-0 flex-1 rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-[10px] text-slate-200" />
          <button type="button" onClick={() => void create()} className="rounded bg-cyan-400/15 px-2 text-[9px] font-mono text-cyan-300 hover:bg-cyan-400/25">Сохранить workspace</button>
        </div>
      )}
    </section>
  );
}
