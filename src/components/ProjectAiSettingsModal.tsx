import { useEffect, useState } from 'react';
import { Save, ShieldAlert, CheckCircle2, XCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { getProjectAiConfig, updateProjectAiConfig, testAiConnection } from '@/services/aiPlanning';
import type { ProjectAiConfig } from '@/types/aiPlanning';
import Modal from './Modal';

interface ProjectAiSettingsModalProps {
  projectId: string;
  isAdmin: boolean;
  onClose: () => void;
}

const PROVIDER_PRESETS = {
  openai: {
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: ['GPT-5', 'GPT-5 Mini']
  },
  anthropic: {
    name: 'Anthropic Claude',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    models: ['Claude Sonnet', 'Claude Opus']
  },
  gemini: {
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['Gemini 3.6 Flash', 'Gemini 1.5 Flash', 'Gemini 1.5 Pro']
  }
};

type ProviderKey = keyof typeof PROVIDER_PRESETS;

function ProjectAiSettingsModal({ projectId, isAdmin, onClose }: ProjectAiSettingsModalProps): JSX.Element {
  const [config, setConfig] = useState<ProjectAiConfig>({
    enabled: false,
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    modelName: 'Gemini 3.6 Flash'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isReplacingKey, setIsReplacingKey] = useState(false);
  
  // Connection status indicator
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const data = await getProjectAiConfig(projectId);
        setConfig(data);
        setIsReplacingKey(false);
      } catch {
        setErrorMessage('Failed to load AI configuration.');
      } finally {
        setLoading(false);
      }
    };
    void fetchConfig();
  }, [projectId]);

  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTestResult(null);
    try {
      const updated = await updateProjectAiConfig(projectId, config);
      setConfig(updated);
      setIsReplacingKey(false);
      setSuccessMessage('AI configuration saved successfully.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMessage(error?.response?.data?.message || 'Failed to save AI configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!isAdmin) return;
    setTesting(true);
    setTestResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await testAiConnection(projectId, config);
      if (res.success) {
        setTestResult({ success: true, message: res.message || 'Connection test succeeded.' });
      } else {
        setTestResult({ success: false, message: res.error || 'Connection test failed.' });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setTestResult({
        success: false,
        message: error?.response?.data?.message || 'Network error during connection test.'
      });
    } finally {
      setTesting(false);
    }
  };

  const updateField = (field: keyof ProjectAiConfig, value: string | boolean) => {
    setConfig((prev) => {
      const newConfig = { ...prev, [field]: value };
      
      // If provider changes, update model preset if the previous model is not in the new provider's presets
      if (field === 'provider') {
        const providerKey = value as ProviderKey;
        const preset = PROVIDER_PRESETS[providerKey];
        if (preset && !preset.models.includes(newConfig.modelName)) {
          newConfig.modelName = preset.models[0];
        }
      }
      
      return newConfig;
    });
  };

  const currentPreset = PROVIDER_PRESETS[config.provider as ProviderKey];

  return (
    <Modal onClose={onClose} title="Project AI Configuration" maxWidth="max-w-[550px]">
      <div className="flex flex-col gap-4 text-olive-950">
        {!isAdmin && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <ShieldAlert className="flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-semibold m-0">View-Only Mode</p>
              <p className="m-0 text-xs">Only project administrators can modify and test connection settings.</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            <XCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-olive-500 italic text-sm gap-2">
            <Loader2 className="animate-spin text-olive-600" size={24} />
            <span>Loading AI Settings...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Enable AI Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-olive-200 bg-olive-50/50">
              <div>
                <span className="font-semibold text-sm">Enable Custom AI Planner</span>
                <p className="text-xs text-olive-500 m-0">Route planning requests to this model instead of static fallbacks.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.enabled}
                  disabled={!isAdmin}
                  onChange={(e) => updateField('enabled', e.target.checked)}
                />
                <div className="w-11 h-6 bg-olive-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-olive-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-olive-600"></div>
              </label>
            </div>

            <div className={`flex flex-col gap-4 transition-opacity ${config.enabled ? 'opacity-100' : 'opacity-60 pointer-events-none select-none'}`}>
              {/* Provider Selection */}
              <div className="flex flex-col gap-1">
                <label className="text-[0.7rem] font-bold text-olive-500 uppercase tracking-widest pl-1">AI Model Provider</label>
                <select
                  className="bg-white border border-olive-200 rounded-lg px-3 py-2 text-sm text-olive-950 focus:outline-none focus:ring-1 focus:ring-olive-500 disabled:bg-olive-50"
                  value={config.provider}
                  disabled={!isAdmin || !config.enabled}
                  onChange={(e) => updateField('provider', e.target.value)}
                >
                  {Object.entries(PROVIDER_PRESETS).map(([key, info]) => (
                    <option key={key} value={key}>{info.name}</option>
                  ))}
                </select>
              </div>

              {/* Model Selection Preset Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[0.7rem] font-bold text-olive-500 uppercase tracking-widest pl-1">Model Name</label>
                <select
                  className="bg-white border border-olive-200 rounded-lg px-3 py-2 text-sm text-olive-950 focus:outline-none focus:ring-1 focus:ring-olive-500 disabled:bg-olive-50"
                  value={config.modelName}
                  disabled={!isAdmin || !config.enabled}
                  onChange={(e) => updateField('modelName', e.target.value)}
                >
                  {currentPreset?.models.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              {/* API Key Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[0.7rem] font-bold text-olive-500 uppercase tracking-widest pl-1">API Key</label>
                {config.apiKey === '••••••••' && !isReplacingKey ? (
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        type="password"
                        className="w-full bg-olive-50 border border-olive-200 rounded-lg pl-3 pr-10 py-2 text-sm text-olive-950/60 select-none cursor-not-allowed"
                        value="••••••••"
                        disabled
                        readOnly
                      />
                    </div>
                    {isAdmin && config.enabled && (
                      <button
                        type="button"
                        className="px-3.5 py-2 bg-olive-700 hover:bg-olive-800 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                        onClick={() => {
                          setIsReplacingKey(true);
                          updateField('apiKey', '');
                        }}
                      >
                        Replace API Key
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? 'text' : 'password'}
                        className="w-full bg-white border border-olive-200 rounded-lg pl-3 pr-10 py-2 text-sm text-olive-950 focus:outline-none focus:ring-1 focus:ring-olive-500 disabled:bg-olive-50"
                        placeholder="Enter API credential key"
                        value={config.apiKey}
                        disabled={!isAdmin || !config.enabled}
                        onChange={(e) => updateField('apiKey', e.target.value)}
                        autoFocus={isReplacingKey}
                      />
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-olive-400 hover:text-olive-600 disabled:opacity-50"
                        disabled={!isAdmin || !config.enabled}
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {isReplacingKey && (
                      <button
                        type="button"
                        className="px-3.5 py-2 border border-olive-200 hover:bg-olive-50 text-olive-700 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                        onClick={() => {
                          setIsReplacingKey(false);
                          updateField('apiKey', '••••••••');
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Custom Endpoint Base URL Override */}
              <div className="flex flex-col gap-1">
                <label className="text-[0.7rem] font-bold text-olive-500 uppercase tracking-widest pl-1">
                  API Base URL Override <span className="text-[11px] font-normal text-olive-400 italic">(Optional)</span>
                </label>
                <input
                  type="text"
                  className="bg-white border border-olive-200 rounded-lg px-3 py-2 text-sm text-olive-950 focus:outline-none focus:ring-1 focus:ring-olive-500 disabled:bg-olive-50"
                  placeholder={currentPreset?.defaultBaseUrl}
                  value={config.baseUrl}
                  disabled={!isAdmin || !config.enabled}
                  onChange={(e) => updateField('baseUrl', e.target.value)}
                />
                <span className="text-[11px] text-olive-400 italic pl-1">
                  Defaults to {currentPreset?.defaultBaseUrl}
                </span>
              </div>
            </div>

            {/* Connection Test Results */}
            {testResult && (
              <div className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                testResult.success 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="flex-shrink-0 mt-0.5" size={16} />
                ) : (
                  <XCircle className="flex-shrink-0 mt-0.5" size={16} />
                )}
                <div>
                  <span className="font-semibold">{testResult.success ? 'Success' : 'Connection Failed'}</span>
                  <p className="m-0 mt-0.5 break-all text-xs">{testResult.message}</p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-olive-100">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-olive-200 text-olive-700 bg-white hover:bg-olive-50 disabled:opacity-50 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  disabled={!isAdmin || testing || saving || !config.enabled}
                  onClick={() => void handleTest()}
                >
                  {testing && <Loader2 size={16} className="animate-spin text-olive-600" />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-olive-200 text-olive-700 hover:bg-olive-50 rounded-lg text-sm font-semibold transition-colors"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-olive-600 hover:bg-olive-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  disabled={!isAdmin || saving || testing}
                  onClick={() => void handleSave()}
                >
                  {saving && <Loader2 size={16} className="animate-spin text-white" />}
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Config'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ProjectAiSettingsModal;
