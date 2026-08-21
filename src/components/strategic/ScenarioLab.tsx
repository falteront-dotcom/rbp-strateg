"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import type { DatasetHealth } from "@/lib/dataset/types";
import type { Workspace, WorkspaceScenario } from "@/lib/workspace/types";
import { DEFAULT_SCENARIO_PARAMS, type ScenarioParams } from "@/lib/what-if-engine";
import type { CountryCompareData } from "@/lib/comparison";
import { WorkspacePanel } from "./WorkspacePanel";

interface AnalysisResponse {
  metadata: { datasetVersion: string | null; formulaVersion: string; confidence: { level: string; score: number }; warnings: string[] };
  explanation: { componentDeltas: Array<{ component: string; label: string; delta: number }>; topPositiveDrivers: Array<{ label: string; delta: number }>; topNegativeDrivers: Array<{ label: string; delta: number }>; };
  base: { totalBP: number; rank: number };
  scenario: { totalBP: number; rank: number; totalDelta: number };
}

interface ScenarioLabProps {
  allCountries: CountryCompareData[];
  selectedIso: string | null;
  onWorkspaceChange: (id: string | null) => void;
  onSelectedIsoChange?: (iso: string) => void;
}

const BRANCH_PARAMS: ScenarioParams[] = [
  { ...DEFAULT_SCENARIO_PARAMS, budgetChange: 0.2 },
  { ...DEFAULT_SCENARIO_PARAMS, personnelChange: 0.2, atWar: true },
];

export function ScenarioLab({ allCountries, selectedIso, onWorkspaceChange, onSelectedIsoChange }: ScenarioLabProps): ReactElement {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [scenarios, setScenarios] = useState<WorkspaceScenario[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResponse>>({});
  const [health, setHealth] = useState<DatasetHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);

  const loadWorkspace = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/workspaces/${id}`);
    if (!response.ok) return;
    const body = await response.json() as { workspace: Workspace; scenarios: WorkspaceScenario[] };
    setWorkspace(body.workspace);
    setScenarios(body.scenarios);
    setAnalyses({});
    onSelectedIsoChange?.(body.workspace.selectedCountryIso);
    onWorkspaceChange(id);
  }, [onSelectedIsoChange, onWorkspaceChange]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dataset/health")
      .then((response) => response.ok ? response.json() as Promise<DatasetHealth> : Promise.reject(new Error("health")))
      .then((value) => { if (!cancelled) setHealth(value); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const createWorkspace = useCallback(async (name: string): Promise<void> => {
    const response = await fetch("/api/workspaces", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, selectedCountryIso: selectedIso ?? "USA" }) });
    if (!response.ok) { setError("Не удалось создать workspace"); return; }
    const body = await response.json() as { workspace: Workspace };
    setWorkspace(body.workspace);
    setScenarios([]);
    setAnalyses({});
    onWorkspaceChange(body.workspace.id);
  }, [onWorkspaceChange, selectedIso]);

  const deleteWorkspace = useCallback(async (): Promise<void> => {
    if (!workspace) return;
    const response = await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
    if (!response.ok) { setError("Не удалось удалить workspace"); return; }
    setWorkspace(null); setScenarios([]); setAnalyses({}); onWorkspaceChange(null);
  }, [onWorkspaceChange, workspace]);

  const updateBranch = useCallback(async (scenarioId: string, patch: Record<string, unknown>): Promise<void> => {
    if (!workspace) return;
    const response = await fetch(`/api/workspaces/${workspace.id}/scenarios/${scenarioId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    if (!response.ok) { setError("Не удалось обновить ветку"); return; }
    const body = await response.json() as { scenario: WorkspaceScenario };
    setScenarios((current) => current.map((scenario) => scenario.id === scenarioId ? body.scenario : scenario));
    setAnalyses((current) => { const next = { ...current }; delete next[scenarioId]; return next; });
    setEditingScenarioId(null);
  }, [workspace]);

  const deleteBranch = useCallback(async (scenarioId: string): Promise<void> => {
    if (!workspace) return;
    const response = await fetch(`/api/workspaces/${workspace.id}/scenarios/${scenarioId}`, { method: "DELETE" });
    if (!response.ok) { setError("Не удалось удалить ветку"); return; }
    setScenarios((current) => current.filter((scenario) => scenario.id !== scenarioId));
    setAnalyses((current) => { const next = { ...current }; delete next[scenarioId]; return next; });
  }, [workspace]);

  const addBranch = useCallback(async (): Promise<void> => {
    if (!workspace || scenarios.length >= 2) return;
    const response = await fetch(`/api/workspaces/${workspace.id}/scenarios`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: `Ветка ${scenarios.length + 1}`, params: BRANCH_PARAMS[scenarios.length] }) });
    if (!response.ok) { setError("Не удалось сохранить ветку"); return; }
    const body = await response.json() as { scenario: WorkspaceScenario };
    setScenarios((current) => [...current, body.scenario]);
  }, [scenarios.length, workspace]);

  useEffect(() => {
    if (!workspace) return;
    for (const scenario of scenarios) {
      if (analyses[scenario.id]) continue;
      fetch(`/api/workspaces/${workspace.id}/analysis?scenarioId=${scenario.id}`)
        .then((response) => response.ok ? response.json() as Promise<AnalysisResponse> : Promise.reject(new Error("analysis")))
        .then((analysis) => setAnalyses((current) => ({ ...current, [scenario.id]: analysis })))
        .catch(() => setError("Не удалось рассчитать ветку"));
    }
  }, [analyses, scenarios, workspace]);

  const selectedName = useMemo(() => allCountries.find((country) => country.isoCode === selectedIso)?.nameRu ?? selectedIso ?? "—", [allCountries, selectedIso]);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[min(760px,100vw)] overflow-y-auto border-l border-cyan-400/10 bg-[#0e1520]/98 p-5 text-slate-100 shadow-2xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-400/70">RBP analytical complex</div>
          <h2 className="mt-1 text-lg font-mono font-bold text-cyan-300">Сценарная лаборатория</h2>
          <div className="text-[10px] font-mono text-slate-500">База: {selectedName}</div>
        </div>
        <button type="button" aria-label="Закрыть сценарную лабораторию" onClick={() => onWorkspaceChange(null)} className="text-slate-500 hover:text-cyan-300">×</button>
      </div>

      <WorkspacePanel workspace={workspace} health={health} onOpen={(item) => void loadWorkspace(item.id)} onCreate={createWorkspace} onDelete={deleteWorkspace} />
      {error && <div role="alert" className="mb-3 rounded border border-amber-400/20 bg-amber-400/5 p-2 text-[10px] text-amber-300">{error}</div>}

      {!workspace ? (
        <div className="rounded border border-white/10 p-5 text-center text-xs text-slate-500">Создайте workspace, чтобы сравнить две стратегические ветви.</div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Ветки сценария</div>
            <button type="button" onClick={() => void addBranch()} disabled={scenarios.length >= 2} className="rounded border border-cyan-400/25 px-3 py-1.5 text-[10px] font-mono text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">Добавить ветку</button>
          </div>
          {analyses[scenarios[0]?.id ?? ""] && <div className="mb-3 rounded border border-white/10 bg-slate-900/40 p-3" data-testid="scenario-base-card"><div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Base dataset</div><div className="mt-1 text-sm font-mono text-slate-200">BP {analyses[scenarios[0]?.id ?? ""].base.totalBP.toFixed(2)} · rank {analyses[scenarios[0]?.id ?? ""].base.rank}</div><div className="text-[9px] text-slate-500">Ветки сравниваются с этим базовым профилем.</div></div>}
          <div className="grid gap-3 md:grid-cols-2">
            {scenarios.map((scenario) => {
              const analysis = analyses[scenario.id];
              return <article key={scenario.id} data-testid="scenario-branch-card" className="rounded border border-white/10 bg-slate-900/50 p-3">
                <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-mono text-cyan-200">{scenario.name}</h3><div className="flex items-center gap-2"><span className="text-[9px] text-slate-600">{scenario.id.slice(0, 6)}</span><button type="button" onClick={() => setEditingScenarioId(editingScenarioId === scenario.id ? null : scenario.id)} className="text-[9px] text-cyan-300 hover:text-cyan-100">изменить</button><button type="button" aria-label={`Удалить ${scenario.name}`} onClick={() => void deleteBranch(scenario.id)} className="text-[9px] text-red-300 hover:text-red-100">удалить</button></div></div>
                {editingScenarioId === scenario.id && <div className="mb-3 space-y-2 rounded border border-cyan-400/15 bg-cyan-400/5 p-2"><label className="block text-[9px] text-slate-400">Бюджет <input aria-label={`Бюджет ${scenario.name}`} type="number" min={-1} max={2} step={0.05} defaultValue={scenario.params.budgetChange} onChange={(event) => { const value = Number(event.target.value); void updateBranch(scenario.id, { params: { budgetChange: value } }); }} className="ml-2 w-20 rounded bg-slate-900 px-1 text-slate-200" /></label><label className="block text-[9px] text-slate-400"><input type="checkbox" defaultChecked={scenario.params.atWar} onChange={(event) => { void updateBranch(scenario.id, { params: { atWar: event.target.checked } }); }} className="mr-1" /> конфликт</label></div>}
                {analysis ? <><div className="flex items-end justify-between border-b border-white/5 pb-2"><div><div className="text-[8px] uppercase text-slate-500">BP delta</div><div className={analysis.scenario.totalDelta >= 0 ? "text-lg text-emerald-300" : "text-lg text-red-300"}>{analysis.scenario.totalDelta.toFixed(2)}</div></div><div className="text-right text-[9px] text-slate-500">rank {analysis.base.rank} → {analysis.scenario.rank}<br />confidence {analysis.metadata.confidence.level}</div></div><div className="mt-2 space-y-1">{analysis.explanation.componentDeltas.map((delta) => <div key={delta.component} className="flex justify-between text-[9px] font-mono"><span className="text-slate-400">{delta.label}</span><span className={delta.delta >= 0 ? "text-emerald-300" : "text-red-300"}>{delta.delta >= 0 ? "+" : ""}{delta.delta.toFixed(2)}</span></div>)}</div><div className="mt-2 text-[9px] text-slate-500">{analysis.explanation.topPositiveDrivers.slice(0, 2).map((driver) => `+ ${driver.label}`).join(" · ") || "Нет положительных драйверов"}</div>{analysis.metadata.warnings.length > 0 && <div className="mt-1 text-[9px] text-amber-300">{analysis.metadata.warnings.join("; ")}</div>}</> : <div className="text-[10px] text-slate-600">Расчёт ветви…</div>}
              </article>;
            })}
          </div>
          {scenarios.length > 0 && <div data-testid="scenario-explanation" className="mt-4 rounded border border-cyan-400/15 bg-cyan-400/5 p-3 text-[10px] font-mono text-slate-400">Каждая ветвь пересчитывается на активной опубликованной версии dataset; формулы BP остаются общими.</div>}
        </>
      )}
    </div>
  );
}
