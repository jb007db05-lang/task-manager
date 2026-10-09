import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Rocket,
  Plug,
  ShieldCheck,
  FlaskConical,
  ArrowUpCircle,
  XCircle,
  History,
  AlertTriangle,
  Undo2,
  Layers,
} from "lucide-react";
import {
  promptService,
  PromptItem,
  PromptDeployment,
  PromptDeploymentEvent,
  PromptFeature,
  PromptVersion,
  PromptVersionStatus,
  DeployStrategy,
} from "@/services/prompts";

interface PromptDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  prompt: PromptItem;
  onChanged?: () => void;
}

const ACTION_LABELS: Record<PromptDeploymentEvent["action"], string> = {
  "set-production": "Deployed to production",
  "start-canary": "Started canary",
  "update-canary": "Changed canary traffic",
  "promote-canary": "Promoted canary",
  "abort-canary": "Stopped canary",
  rollback: "Rolled back to staging",
  "bind-feature": "Connected to feature",
  "unbind-feature": "Disconnected from feature",
};

const STATUS_STYLES: Record<PromptVersionStatus, string> = {
  production: "bg-emerald-50 text-emerald-800 border-emerald-200",
  canary: "bg-amber-50 text-amber-800 border-amber-200",
  staging: "bg-sky-50 text-sky-800 border-sky-200",
  draft: "bg-olive-50 text-olive-600 border-olive-200",
};

const getErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e.response?.data?.message || e.message || fallback;
};

export const PromptDeploymentModal: React.FC<PromptDeploymentModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  prompt,
  onChanged,
}) => {
  const [deployment, setDeployment] = useState<PromptDeployment | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [features, setFeatures] = useState<PromptFeature[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [featureKey, setFeatureKey] = useState<string>("");
  const [deployVersion, setDeployVersion] = useState<number>(1);
  const [strategy, setStrategy] = useState<DeployStrategy>("direct");
  const [deployPercentage, setDeployPercentage] = useState<number>(10);
  const [canaryTraffic, setCanaryTraffic] = useState<number>(10);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, prompt._id]);

  const syncForm = (d: PromptDeployment, versionList: PromptVersion[]) => {
    setFeatureKey(d.featureKey || "");
    setCanaryTraffic(d.canary?.percentage ?? 10);
    // Default to the newest version that is not already live.
    const candidate = versionList.find(
      (v) => v.version !== d.productionVersion && v.version !== d.canary?.version,
    );
    setDeployVersion(candidate ? candidate.version : d.productionVersion);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [d, versionList, featureList] = await Promise.all([
        promptService.getDeployment(workspaceId, prompt._id),
        promptService.getPromptVersions(workspaceId, prompt._id),
        promptService.listFeatures(workspaceId),
      ]);
      setDeployment(d);
      setVersions(versionList);
      setFeatures(featureList);
      syncForm(d, versionList);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load deployment."));
    } finally {
      setIsLoading(false);
    }
  };

  const run = async (key: string, action: () => Promise<PromptDeployment>) => {
    try {
      setBusyAction(key);
      setError(null);
      const updated = await action();
      // Version statuses (production / canary / staging) change with every action.
      const versionList = await promptService.getPromptVersions(workspaceId, prompt._id);
      setDeployment(updated);
      setVersions(versionList);
      syncForm(updated, versionList);
      if (key === "bind") {
        setFeatures(await promptService.listFeatures(workspaceId));
      }
      onChanged?.();
    } catch (err) {
      setError(getErrorMessage(err, "Deployment action failed."));
    } finally {
      setBusyAction(null);
    }
  };

  const selectedFeature = useMemo(
    () => features.find((f) => f.key === featureKey) || null,
    [features, featureKey],
  );

  if (!isOpen) return null;

  const canary = deployment?.canary || null;
  const deployCandidates = versions.filter(
    (v) => v.version !== deployment?.productionVersion,
  );
  const percentageValid = deployPercentage >= 1 && deployPercentage <= 99;
  const boundFeature = features.find((f) => f.key === deployment?.featureKey);
  const featureTakenBy =
    selectedFeature?.binding && selectedFeature.binding.promptId !== prompt._id &&
    selectedFeature.key !== deployment?.featureKey
      ? selectedFeature.binding.promptName
      : null;

  const versionLabel = (v: PromptVersion) =>
    `v${v.version}${v.changeNote ? ` — ${v.changeNote}` : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-olive-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-olive-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-olive-950">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-olive-200 bg-olive-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-olive-100 text-olive-800 border border-olive-200">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-olive-950">Deploy — {prompt.name}</h2>
              <p className="text-xs text-olive-600">
                Choose which AI feature uses this prompt, which version is in production, and roll out new versions with a canary.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-olive-400 hover:text-olive-950 hover:bg-olive-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading || !deployment ? (
            <div className="text-center py-12 text-olive-500 text-xs">Loading deployment...</div>
          ) : (
            <>
              {/* Feature binding */}
              <section className="p-4 rounded-2xl border border-olive-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Plug className="w-4 h-4 text-olive-700" /> Used by feature
                  </h3>
                  <span className="text-[11px] text-olive-600">
                    {boundFeature
                      ? `Serving ${boundFeature.label}`
                      : "Not connected — AI features use their built-in prompts"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={featureKey}
                    onChange={(e) => setFeatureKey(e.target.value)}
                    className="flex-1 min-w-[220px] bg-white border border-olive-200 text-olive-900 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="">Not connected</option>
                    {features.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                        {f.binding && f.binding.promptId !== prompt._id && f.key !== deployment.featureKey
                          ? ` (currently: ${f.binding.promptName})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={busyAction !== null || featureKey === (deployment.featureKey || "")}
                    onClick={() =>
                      run("bind", () =>
                        promptService.bindFeature(workspaceId, prompt._id, featureKey || null),
                      )
                    }
                    className="px-3.5 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busyAction === "bind" ? "Saving..." : "Save"}
                  </button>
                </div>
                {selectedFeature && (
                  <div className="space-y-2 text-[11px] text-olive-600">
                    <p>{selectedFeature.description}</p>
                    {featureTakenBy && (
                      <p className="text-amber-700">
                        Saving moves this feature off “{featureTakenBy}”.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>Variables supplied:</span>
                      {selectedFeature.variables.length === 0 ? (
                        <span className="italic">none</span>
                      ) : (
                        selectedFeature.variables.map((v) => (
                          <span
                            key={v.name}
                            title={v.description}
                            className="font-mono px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200"
                          >
                            {`{{${v.name}}}`}
                          </span>
                        ))
                      )}
                    </div>
                    <p>
                      The prompt's system/developer blocks (or its body) become the feature's system prompt. Other variables need a default value.
                    </p>
                  </div>
                )}
              </section>

              {/* Environments: one production, optional canary, one staging */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <ShieldCheck className="w-4 h-4" /> Production
                  </div>
                  <div className="text-2xl font-mono font-bold">v{deployment.productionVersion}</div>
                  <p className="text-[11px] text-olive-600">
                    {canary ? `Serving ${100 - canary.percentage}% of users` : "Serving all users"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                    <FlaskConical className="w-4 h-4" /> Canary
                  </div>
                  {canary ? (
                    <>
                      <div className="text-2xl font-mono font-bold">v{canary.version}</div>
                      <p className="text-[11px] text-olive-600">
                        {canary.percentage}% of users since {new Date(canary.startedAt).toLocaleDateString()}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-mono font-bold text-olive-300">—</div>
                      <p className="text-[11px] text-olive-500">No canary running</p>
                    </>
                  )}
                </div>

                <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/40 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-800">
                    <Layers className="w-4 h-4" /> Staging
                  </div>
                  {deployment.stagingVersion ? (
                    <>
                      <div className="text-2xl font-mono font-bold">v{deployment.stagingVersion}</div>
                      <button
                        disabled={busyAction !== null}
                        onClick={() => run("rollback", () => promptService.rollbackProduction(workspaceId, prompt._id))}
                        className="text-[11px] font-semibold text-sky-800 hover:text-sky-950 flex items-center gap-1 disabled:opacity-40"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        {busyAction === "rollback" ? "Rolling back..." : `Roll back to v${deployment.stagingVersion}`}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-mono font-bold text-olive-300">—</div>
                      <p className="text-[11px] text-olive-500">Previous production lands here</p>
                    </>
                  )}
                </div>
              </section>

              {/* Running canary controls */}
              {canary && (
                <section className="p-4 rounded-2xl border border-amber-200 space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-amber-600" /> Canary v{canary.version} in progress
                  </h3>
                  <p className="text-[11px] text-olive-600">
                    Each user keeps the same version for the whole rollout. Promoting makes v{canary.version} production
                    and moves v{deployment.productionVersion} to staging.
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <input
                        type="range"
                        min={1}
                        max={99}
                        value={canaryTraffic}
                        onChange={(e) => setCanaryTraffic(Number(e.target.value))}
                        className="w-36 accent-amber-600"
                      />
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={canaryTraffic}
                        onChange={(e) => setCanaryTraffic(Number(e.target.value))}
                        className="w-14 bg-white border border-olive-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none"
                      />
                      <span className="text-olive-600">%</span>
                      <button
                        disabled={
                          busyAction !== null ||
                          canaryTraffic < 1 ||
                          canaryTraffic > 99 ||
                          canaryTraffic === canary.percentage
                        }
                        onClick={() =>
                          run("traffic", () =>
                            promptService.startCanary(workspaceId, prompt._id, canary.version, canaryTraffic),
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {busyAction === "traffic" ? "Saving..." : "Update traffic"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={busyAction !== null}
                        onClick={() => run("abort", () => promptService.abortCanary(workspaceId, prompt._id))}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                      >
                        <XCircle className="w-3.5 h-3.5" /> {busyAction === "abort" ? "Stopping..." : "Stop canary"}
                      </button>
                      <button
                        disabled={busyAction !== null}
                        onClick={() => run("promote", () => promptService.promoteCanary(workspaceId, prompt._id))}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        {busyAction === "promote" ? "Promoting..." : "Promote to production"}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Deploy a version: direct production or canary production */}
              <section className="p-4 rounded-2xl border border-olive-200 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-olive-700" /> Deploy a version
                </h3>
                {deployCandidates.length === 0 ? (
                  <p className="text-[11px] text-olive-500 italic">
                    v{deployment.productionVersion} is the only version. Edit the prompt to create a new version to deploy.
                  </p>
                ) : (
                  <>
                    <select
                      value={deployVersion}
                      onChange={(e) => setDeployVersion(Number(e.target.value))}
                      className="w-full bg-white border border-olive-200 text-olive-900 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none"
                    >
                      {deployCandidates.map((v) => (
                        <option key={v.version} value={v.version}>
                          {versionLabel(v)}
                          {v.status && v.status !== "draft" ? ` (${v.status})` : ""}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          strategy === "direct" ? "border-emerald-400 bg-emerald-50/50" : "border-olive-200 hover:bg-olive-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <input
                            type="radio"
                            name="deploy-strategy"
                            checked={strategy === "direct"}
                            onChange={() => setStrategy("direct")}
                            className="accent-emerald-700"
                          />
                          Direct production
                        </div>
                        <p className="text-[11px] text-olive-600 mt-1">
                          All users get v{deployVersion} now. v{deployment.productionVersion} moves to staging.
                        </p>
                      </label>
                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          strategy === "canary" ? "border-amber-400 bg-amber-50/50" : "border-olive-200 hover:bg-olive-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <input
                            type="radio"
                            name="deploy-strategy"
                            checked={strategy === "canary"}
                            onChange={() => setStrategy("canary")}
                            className="accent-amber-600"
                          />
                          Canary production
                        </div>
                        <p className="text-[11px] text-olive-600 mt-1">
                          A share of users get v{deployVersion}; production stays v{deployment.productionVersion} until you
                          promote.
                        </p>
                      </label>
                    </div>

                    {strategy === "canary" && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-olive-600">Traffic to canary</span>
                        <input
                          type="range"
                          min={1}
                          max={99}
                          value={deployPercentage}
                          onChange={(e) => setDeployPercentage(Number(e.target.value))}
                          className="w-36 accent-amber-600"
                        />
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={deployPercentage}
                          onChange={(e) => setDeployPercentage(Number(e.target.value))}
                          className="w-14 bg-white border border-olive-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none"
                        />
                        <span className="text-olive-600">%</span>
                      </div>
                    )}

                    {strategy === "canary" && canary && canary.version !== deployVersion && (
                      <p className="text-[11px] text-amber-700">This replaces the running canary (v{canary.version}).</p>
                    )}

                    <div className="flex justify-end">
                      <button
                        disabled={busyAction !== null || (strategy === "canary" && !percentageValid)}
                        onClick={() =>
                          run("deploy", () =>
                            promptService.deployVersion(workspaceId, prompt._id, {
                              version: deployVersion,
                              strategy,
                              percentage: strategy === "canary" ? deployPercentage : undefined,
                            }),
                          )
                        }
                        className={`px-4 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                          strategy === "direct" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-amber-600 hover:bg-amber-700"
                        }`}
                      >
                        {strategy === "direct" ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : (
                          <FlaskConical className="w-3.5 h-3.5" />
                        )}
                        {busyAction === "deploy"
                          ? "Deploying..."
                          : strategy === "direct"
                            ? `Deploy v${deployVersion} to production`
                            : `Start canary for v${deployVersion}`}
                      </button>
                    </div>
                  </>
                )}
              </section>

              {/* Versions with their status */}
              <section className="p-4 rounded-2xl border border-olive-200 space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-olive-700" /> Versions
                </h3>
                <ul className="divide-y divide-olive-100 text-xs">
                  {versions.map((v) => {
                    const status = v.status || "draft";
                    return (
                      <li key={v.version} className="py-2 flex items-center justify-between gap-3">
                        <span className="text-olive-800 truncate">
                          <span className="font-mono font-semibold">v{v.version}</span>
                          {v.changeNote ? <span className="text-olive-500"> — {v.changeNote}</span> : null}
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-olive-500">{new Date(v.createdAt).toLocaleDateString()}</span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${STATUS_STYLES[status]}`}
                          >
                            {status}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* History */}
              <section className="p-4 rounded-2xl border border-olive-200 space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-olive-700" /> Deployment history
                </h3>
                {deployment.history.length === 0 ? (
                  <p className="text-[11px] text-olive-500 italic">No deployment changes yet.</p>
                ) : (
                  <ul className="divide-y divide-olive-100 text-xs">
                    {deployment.history.map((event, idx) => {
                      const actorName =
                        typeof event.actor === "object" && event.actor
                          ? event.actor.name || event.actor.email
                          : null;
                      const feature = features.find((f) => f.key === event.featureKey);
                      return (
                        <li key={idx} className="py-2 flex items-center justify-between gap-3">
                          <span className="text-olive-800">
                            <span className="font-semibold">{ACTION_LABELS[event.action]}</span>
                            {event.version ? <span className="font-mono"> v{event.version}</span> : null}
                            {event.previousVersion ? (
                              <span className="text-olive-500 font-mono"> (was v{event.previousVersion})</span>
                            ) : null}
                            {event.percentage ? <span className="text-olive-500"> · {event.percentage}%</span> : null}
                            {feature ? <span className="text-olive-500"> · {feature.label}</span> : null}
                          </span>
                          <span className="text-[11px] text-olive-500 shrink-0">
                            {actorName ? `${actorName} · ` : ""}
                            {new Date(event.at).toLocaleString()}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptDeploymentModal;
