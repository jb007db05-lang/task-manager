import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  KeyRound,
  RefreshCcw,
  Shield,
  Smartphone,
  Settings2,
  Eye,
  EyeOff
} from 'lucide-react';

import ManageDevicesModal from '@/components/ManageDevicesModal';
import Modal from '@/components/Modal';
import SectionCard from '@/components/SectionCard';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/api';
import { getSlaConfigs, updateSlaConfig } from '@/services/sla';
import type { SlaConfig, TaskPriority } from '@/types/task';
import type { Project } from '@/types/project';
import {
  SYNC_CHATGPT_ACTION_SCHEMA,
  SYNC_CHATGPT_INSTRUCTION_TEXT
} from '@/features/sync/schema';

interface RegenerateSyncKeyResponse {
  message: string;
  data: {
    syncApiKey: string;
  };
}

interface CompanionDevice {
  id: string;
  deviceName: string;
  deviceType: string;
  status: 'active' | 'revoked' | 'pending';
  createdAt?: string;
  updatedAt?: string;
  revokedAt?: string | null;
}

interface CompanionDevicesResponse {
  message: string;
  data: {
    devices: CompanionDevice[];
  };
}

interface CompanionKeyResponse {
  message: string;
  data: {
    key: string;
    maxCompanionDevices: number;
    activeCompanionDevices: number;
  };
}

const chatGptIntegrationSteps = [
  {
    title: "Step 1: Open GPTs from ChatGPT sidebar",
    summary: "Navigate to the GPTs section to access and create custom GPTs.",
    details: [
      "From the ChatGPT home page, look at the left sidebar.",
      "Find the option labeled 'GPTs'.",
      "Click 'GPTs' to open the GPT explorer page.",
      "This section allows you to browse, manage, and create your own GPTs."
    ],
    image: "https://res.cloudinary.com/diqzswlyr/image/upload/q_auto/f_auto/v1776863067/step1_fv1uo6.png"
  },
  {
    title: "Step 2: Click on Create to start a new GPT",
    summary: "Start building your custom GPT by clicking the Create button on the GPTs page.",
    details: [
      "On the GPTs explorer page, look at the top-right corner.",
      "Click the '+ Create' button next to 'My GPTs'.",
      "This opens the GPT Builder interface.",
      "You’ll be taken to the screen where you configure your custom GPT."
    ],
    image: "https://res.cloudinary.com/diqzswlyr/image/upload/q_auto/f_auto/v1776863066/step2_xi5if1.png"
  },
  {
    title: "Step 3: Configure your GPT details",
    summary: "Fill in the basic configuration including name, description, and instructions to define your GPT’s behavior.",
    details: [
      "In the Configure tab, enter a name for your GPT.",
      "Add a short description explaining what your GPT does.",
      "Upload a logo if you want one.",
      "Paste the following instructions:"
    ],
    code: SYNC_CHATGPT_INSTRUCTION_TEXT,
    image: "https://res.cloudinary.com/diqzswlyr/image/upload/q_auto/f_auto/v1776863066/step3_sgj3se.png"
  },
  {
    title: "Step 4: Add actions and connect your API",
    summary: "Create a new action and paste your OpenAPI schema to connect your backend.",
    details: [
      "Scroll down to the bottom of the Configure page.",
      "Click on 'Create new action'.",
      "A new screen will open with Authentication and Schema fields.",
      "You will configure API Key authentication for this action in the next step.",
      "Copy and paste the following schema into the Schema field:"
    ],
    code: SYNC_CHATGPT_ACTION_SCHEMA,
    image: "https://res.cloudinary.com/diqzswlyr/image/upload/q_auto/f_auto/v1776863066/step4_b9fukz.png"
  },
  {
    title: "Step 5: Configure API authentication",
    summary: "Set up API key authentication so your GPT can securely call your backend.",
    details: [
      "In the Authentication settings, select 'API Key'.",
      "Enter your sync API key from the app settings.",
      "Under Auth Type, select 'Custom'.",
      "In 'Custom Header Name', enter: x-sync-api-key",
      "Click 'Save' to apply the authentication settings."
    ],
    image: "https://res.cloudinary.com/diqzswlyr/image/upload/q_auto/f_auto/v1776863066/step5_o7jbyl.png"
  },
  {
    title: "Step 6: Create your GPT",
    summary: "Finalize and create your custom GPT with the configured settings.",
    details: [
      "Review all your configurations including instructions, actions, and authentication.",
      "Click the 'Create' button at the top right.",
      "Select Create App For Only Me.",
      "Your custom GPT will now be created and ready to use.",
      "You can immediately start testing tasks, epics, project notes, and summary queries."
    ],
    image: "https://res.cloudinary.com/diqzswlyr/image/upload/q_auto/f_auto/v1776863065/step6_ix2pos.png"
  }
];

interface SettingsPanelProps {
  activeProject?: Project | null;
  onAiConfigChange?: (enabled: boolean, provider: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SettingsPanel({ activeProject, onAiConfigChange }: SettingsPanelProps): JSX.Element {
  const { refreshUser, session, user, updateProfile } = useAuth();
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [openStepIndex, setOpenStepIndex] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [devices, setDevices] = useState<CompanionDevice[]>([]);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isGeneratingCompanionKey, setIsGeneratingCompanionKey] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>('');
  const [deviceType, setDeviceType] = useState<string>('mobile');

  // Profile management state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Global AI Credentials state
  const [openaiKey, setOpenaiKey] = useState(user?.openaiApiKeyConfigured ? '••••••••' : '');
  const [anthropicKey, setAnthropicKey] = useState(user?.anthropicApiKeyConfigured ? '••••••••' : '');
  const [geminiKey, setGeminiKey] = useState(user?.geminiApiKeyConfigured ? '••••••••' : '');
  const [isSavingGlobalKeys, setIsSavingGlobalKeys] = useState(false);
  const [globalKeysSuccess, setGlobalKeysSuccess] = useState(false);
  const [globalKeysError, setGlobalKeysError] = useState<string | null>(null);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  useEffect(() => {
    if (user) {
      setOpenaiKey(user.openaiApiKeyConfigured ? '••••••••' : '');
      setAnthropicKey(user.anthropicApiKeyConfigured ? '••••••••' : '');
      setGeminiKey(user.geminiApiKeyConfigured ? '••••••••' : '');
    }
  }, [user]);

  const [slaConfigs, setSlaConfigs] = useState<SlaConfig[]>([]);
  const [slaSavingPriority, setSlaSavingPriority] = useState<TaskPriority | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    setProfileSuccess(false);
    try {
      await updateProfile({ 
        firstName: firstName.trim(), 
        lastName: lastName.trim() 
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      setErrorMessage('Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSaveGlobalKeys = async (): Promise<void> => {
    setIsSavingGlobalKeys(true);
    setGlobalKeysSuccess(false);
    setGlobalKeysError(null);
    try {
      await updateProfile({
        openaiApiKey: openaiKey,
        anthropicApiKey: anthropicKey,
        geminiApiKey: geminiKey,
      });
      setGlobalKeysSuccess(true);
      setTimeout(() => setGlobalKeysSuccess(false), 3000);
      showToast({ message: 'Global AI API keys updated successfully.', variant: 'success' });
    } catch {
      setGlobalKeysError('Failed to update AI keys.');
      showToast({ message: 'Failed to update AI keys.', variant: 'error' });
    } finally {
      setIsSavingGlobalKeys(false);
    }
  };

  const [generatedCompanionKey, setGeneratedCompanionKey] = useState<{
    key: string;
    deviceName: string;
  } | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const canManagePrimarySecurity = session?.deviceType === 'primary';
  const [isToggling2FA, setIsToggling2FA] = useState(false);

  const handleToggle2FA = async (enabled: boolean): Promise<void> => {
    setIsToggling2FA(true);
    try {
      await api.post('/auth/2fa/toggle', { enabled });
      await refreshUser();
      showToast({
        message: `Two-Factor Authentication has been ${enabled ? 'enabled' : 'disabled'} successfully.`,
        variant: 'success'
      });
    } catch {
      showToast({
        message: 'Failed to update Two-Factor Authentication status.',
        variant: 'error'
      });
    } finally {
      setIsToggling2FA(false);
    }
  };

  const loadDevices = async (): Promise<void> => {
    try {
      const response = await api.get<CompanionDevicesResponse>('/auth/devices');
      const fetched = response.data.data?.devices ?? [];
      setDevices(fetched);
    } catch (err) {
      console.error('[SettingsPanel] Error loading devices:', err);
    }
  };

  useEffect(() => {
    if (canManagePrimarySecurity) {
      void loadDevices();
    }
  }, [canManagePrimarySecurity]);

  useEffect(() => {
    getSlaConfigs()
      .then(setSlaConfigs)
      .catch(() => setErrorMessage('Unable to load SLA settings.'));
  }, []);

  const handleSlaFieldChange = (
    priority: TaskPriority,
    field: 'responseTimeHours' | 'resolutionTimeHours',
    value: string
  ): void => {
    const numeric = Number(value);
    setSlaConfigs((current) =>
      current.map((config) =>
        config.priority === priority ? { ...config, [field]: numeric } : config
      )
    );
  };

  const handleSaveSlaConfig = async (config: SlaConfig): Promise<void> => {
    setSlaSavingPriority(config.priority);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await updateSlaConfig(config);
      setSlaConfigs((current) =>
        current.map((entry) => (entry.priority === updated.priority ? updated : entry))
      );
      setSuccessMessage('SLA configuration updated.');
    } catch {
      setErrorMessage('Unable to update SLA configuration.');
    } finally {
      setSlaSavingPriority(null);
    }
  };

  const handleRegenerateKey = async (): Promise<void> => {
    const isConfirmed = await confirm({
      title: 'Regenerate Sync Key',
      message: 'Are you sure you want to regenerate your sync API key? Any existing GPT integrations using this key will stop working immediately.',
      confirmText: 'Regenerate Key',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setIsRegenerating(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await api.patch<RegenerateSyncKeyResponse>('/auth/regenerate-sync-key');
      await refreshUser();
      setSuccessMessage('Sync API key regenerated successfully.');
    } catch {
      setErrorMessage('Unable to regenerate sync API key right now.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleGenerateCompanionKey = async (): Promise<void> => {
    if (!deviceName.trim()) {
      setErrorMessage('Device name is required to generate a companion key.');
      return;
    }

    setIsGeneratingCompanionKey(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await api.post<CompanionKeyResponse>('/auth/companion-keys', {
        deviceName: deviceName.trim(),
        deviceType
      });
      setGeneratedCompanionKey({
        key: response.data.data.key,
        deviceName: deviceName.trim()
      });
      setDeviceName('');
      void loadDevices();
    } catch {
      setErrorMessage('Unable to generate companion key right now.');
    } finally {
      setIsGeneratingCompanionKey(false);
    }
  };

  const handleCopy = async (text: string, index: number): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      showToast({ message: 'Unable to copy to clipboard.', variant: 'error' });
    }
  };

  const ghostBtn = 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-olive-200 rounded text-olive-750 text-xs font-semibold hover:bg-olive-50 disabled:opacity-50 transition-colors shadow-xs';
  const primaryBtn = 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-olive-800 text-white rounded text-xs font-semibold hover:bg-olive-900 disabled:opacity-50 transition-colors shadow-xs';

  return (
    <div className="grid gap-4">
      {/* Profile Section */}
      <SectionCard>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="m-0 text-[15px] font-semibold text-olive-950">Profile Information</h2>
            <p className="text-olive-500 m-0 mt-0.5 text-[13px]">Update your personal details used across the workspace.</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1">
              <label className="field-label !mb-0">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-base"
                placeholder="Enter your first name"
              />
            </div>
            <div className="grid gap-1">
              <label className="field-label !mb-0">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-base"
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="grid gap-1">
            <label className="field-label !mb-0">Email Address</label>
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              className="input-base" disabled
            />
            <p className="field-hint m-0">Email cannot be changed directly. Contact support for help.</p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile || (firstName === (user?.firstName || '') && lastName === (user?.lastName || ''))}
              className="btn btn-primary"
            >
              {isUpdatingProfile ? (
                 <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
              ) : profileSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : null}
              {isUpdatingProfile ? 'Saving...' : profileSuccess ? 'Saved' : 'Save Changes'}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Global AI API Keys Card */}
      <SectionCard>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="m-0 text-[15px] font-semibold text-olive-950">Global AI Credentials</h2>
            <p className="text-olive-500 m-0 mt-0.5 text-[13px]">Configure API keys for your AI providers. These are encrypted and shared across all your projects.</p>
          </div>
        </div>

        <div className="grid gap-4">
          {/* OpenAI API Key */}
          <div className="flex flex-col gap-1">
            <label className="field-label !mb-0">OpenAI API Key</label>
            <div className="relative">
              <input
                type={showOpenaiKey ? 'text' : 'password'}
                className="input-base !pr-10"
                placeholder={user?.openaiApiKeyConfigured ? '••••••••' : 'Enter OpenAI API key'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-olive-400 hover:text-olive-600"
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              >
                {showOpenaiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Anthropic API Key */}
          <div className="flex flex-col gap-1">
            <label className="field-label !mb-0">Anthropic Claude API Key</label>
            <div className="relative">
              <input
                type={showAnthropicKey ? 'text' : 'password'}
                className="input-base !pr-10"
                placeholder={user?.anthropicApiKeyConfigured ? '••••••••' : 'Enter Anthropic API key'}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-olive-400 hover:text-olive-600"
                onClick={() => setShowAnthropicKey(!showAnthropicKey)}
              >
                {showAnthropicKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="flex flex-col gap-1">
            <label className="field-label !mb-0">Google Gemini API Key</label>
            <div className="relative">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                className="input-base !pr-10"
                placeholder={user?.geminiApiKeyConfigured ? '••••••••' : 'Enter Google Gemini API key'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-olive-400 hover:text-olive-600"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
              >
                {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSaveGlobalKeys}
              disabled={isSavingGlobalKeys || (openaiKey === (user?.openaiApiKeyConfigured ? '••••••••' : '') && anthropicKey === (user?.anthropicApiKeyConfigured ? '••••••••' : '') && geminiKey === (user?.geminiApiKeyConfigured ? '••••••••' : ''))}
              className="btn btn-primary"
            >
              {isSavingGlobalKeys ? (
                 <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
              ) : globalKeysSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : null}
              {isSavingGlobalKeys ? 'Saving...' : globalKeysSuccess ? 'Saved' : 'Save AI Credentials'}
            </button>
          </div>

          {globalKeysError && <p className="text-red-600 text-xs m-0 mt-1 font-medium">{globalKeysError}</p>}
        </div>
      </SectionCard>

      {/* SLA Configuration Card */}
      <SectionCard>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="m-0 text-[15px] font-semibold text-olive-950">SLA Configuration</h2>
            <p className="text-olive-500 m-0 mt-0.5 text-[13px]">Set response and resolution targets by task priority.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {slaConfigs.map((config) => (
            <div key={config.priority} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-olive-200 rounded bg-olive-50/50">
              <div className="min-w-[100px] shrink-0">
                <span className="text-[13px] font-medium text-olive-900 capitalize">{config.priority.toLowerCase()}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-olive-600">
                  <span>Response (h):</span>
                  <input
                    className="input-base !h-8 !w-20 !px-2 !text-[13px]"
                    min="0.01"
                    step="0.25"
                    type="number"
                    value={config.responseTimeHours}
                    onChange={(event) => handleSlaFieldChange(config.priority, 'responseTimeHours', event.target.value)}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-olive-600">
                  <span>Resolution (h):</span>
                  <input
                    className="input-base !h-8 !w-20 !px-2 !text-[13px]"
                    min="0.01"
                    step="0.25"
                    type="number"
                    value={config.resolutionTimeHours}
                    onChange={(event) => handleSlaFieldChange(config.priority, 'resolutionTimeHours', event.target.value)}
                  />
                </label>
              </div>
              <div className="shrink-0 flex justify-end">
                <button
                  className={primaryBtn}
                  disabled={slaSavingPriority === config.priority}
                  onClick={() => void handleSaveSlaConfig(config)}
                  type="button"
                >
                  {slaSavingPriority === config.priority ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Two-Factor Authentication Card */}
      <SectionCard>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="m-0 text-[15px] font-semibold text-olive-950">Two-Factor Authentication (2FA)</h2>
            <p className="text-olive-500 m-0 mt-0.5 text-[13px]">Add an extra layer of security to your account by requiring a verification code sent via email upon login.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-olive-50/50 border border-olive-200 rounded">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-olive-950">
              Status: {user?.twoFactorEnabled ? (
                <span className="text-emerald-700 font-bold">ENABLED</span>
              ) : (
                <span className="text-olive-500 font-bold">DISABLED</span>
              )}
            </span>
            <p className="text-olive-500 text-xs m-0">
              {user?.twoFactorEnabled 
                ? 'Your account is protected with email verification codes.' 
                : 'Enable to require a verification code sent via email when logging in.'}
            </p>
          </div>
          <button
            onClick={() => void handleToggle2FA(!user?.twoFactorEnabled)}
            disabled={isToggling2FA}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold shadow-xs transition-all ${
              user?.twoFactorEnabled 
                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                : 'bg-olive-800 text-white hover:bg-olive-900'
            }`}
          >
            {isToggling2FA ? 'Updating...' : user?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>
      </SectionCard>

      {/* Top grid: Security + Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sync API Key card */}
        <SectionCard>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="m-0 text-[15px] font-semibold text-olive-950">Sync API Key</h2>
              <p className="text-olive-500 m-0 mt-0.5 text-[13px]">Your unique key for connecting external task tools.</p>
            </div>
          </div>

          {/* Key display */}
          <div className="flex items-center gap-2 bg-olive-50 border border-olive-200 rounded px-3 py-2.5 mb-3">
            <KeyRound className="text-olive-400 shrink-0" size={14} />
            <code className="flex-1 text-[0.8rem] text-olive-700 break-all">{user?.syncApiKey || 'No key generated'}</code>
            <button
              className="flex items-center justify-center w-6 h-6 rounded text-olive-400 hover:text-olive-700 transition-colors"
              onClick={() => user?.syncApiKey && handleCopy(user.syncApiKey, -1)}
              type="button"
            >
              {copiedIndex === -1 ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>

          <button
            className={ghostBtn}
            disabled={isRegenerating}
            onClick={() => void handleRegenerateKey()}
            type="button"
          >
            <RefreshCcw className={isRegenerating ? 'animate-spin' : ''} size={12} />
            {isRegenerating ? 'Regenerating...' : 'Regenerate Key'}
          </button>

          {successMessage && <p className="text-teal-600 m-0 text-xs mt-2">{successMessage}</p>}
          {errorMessage && <p className="text-red-600 m-0 text-xs mt-2">{errorMessage}</p>}
        </SectionCard>

        {/* Companion Access card */}
        <SectionCard>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="m-0 text-[15px] font-semibold text-olive-950">Companion Access</h2>
              <p className="text-olive-500 m-0 mt-0.5 text-[13px]">Manage secure keys for mobile, desktop, or voice apps.</p>
            </div>
          </div>

          {canManagePrimarySecurity ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 bg-olive-50 rounded border border-dashed border-olive-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 flex items-center justify-center rounded bg-white shadow-xs text-olive-400 border border-olive-100">
                    <Smartphone size={14} />
                  </div>
                  <div>
                    <p className="section-label m-0 mb-0.5">Registry</p>
                    <p className="text-xs font-semibold text-olive-950 m-0">
                      {devices.length} registered {devices.length === 1 ? 'device' : 'devices'}
                    </p>
                  </div>
                </div>
                <button
                  className={ghostBtn}
                  onClick={() => setIsManageModalOpen(true)}
                  type="button"
                >
                  <Settings2 size={12} />
                  Manage
                </button>
              </div>

              <div className="flex flex-col gap-1.5 pt-2 border-t border-olive-100">
                <p className="section-label mb-1.5">New device key</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input-base !h-9 !w-auto"
                    onChange={(event) => setDeviceName(event.target.value)}
                    placeholder="e.g. Work Mobile"
                    value={deviceName}
                  />
                  <select
                    className="input-base !h-9 !w-auto"
                    onChange={(event) => setDeviceType(event.target.value)}
                    value={deviceType}
                  >
                    <option value="mobile">Mobile</option>
                    <option value="tablet">Tablet</option>
                    <option value="desktop">Desktop</option>
                  </select>
                </div>
                <button
                  className="w-full mt-1.5 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-olive-750 hover:bg-olive-800 text-white rounded text-xs font-semibold shadow-xs disabled:opacity-50"
                  disabled={isGeneratingCompanionKey || !deviceName.trim() || devices.length >= 5}
                  onClick={() => void handleGenerateCompanionKey()}
                  type="button"
                >
                  <Shield size={14} />
                  {isGeneratingCompanionKey ? 'Generating...' : 'Generate Device Key'}
                </button>
              </div>

              {isManageModalOpen && (
                <ManageDevicesModal
                  onClose={() => setIsManageModalOpen(false)}
                  onDevicesChanged={() => {
                    void loadDevices();
                  }}
                />
              )}
            </div>
          ) : (
            <div className="bg-olive-50 border border-olive-200 rounded p-4 text-center">
              <span className="text-olive-400 text-xs">Restricted on companion devices</span>
              <strong className="block mt-1 text-olive-700 text-xs">Only the main device can manage companion devices.</strong>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ChatGPT Integration */}
      <SectionCard>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="m-0 text-[15px] font-semibold text-olive-950">ChatGPT Integration</h2>
            <p className="text-olive-500 m-0 mt-0.5 text-[13px]">Configure a custom GPT to manage your tasks via voice or chat.</p>
          </div>
        </div>

        {/* Accordion steps */}
        <div className="grid gap-2">
          {chatGptIntegrationSteps.map((step, index) => {
            const isOpen = openStepIndex === index;
            const panelId = `chatgpt-step-panel-${index}`;

            return (
              <article
                key={step.title}
                className={[
                  'border border-olive-200 rounded overflow-hidden transition-all',
                  isOpen ? 'bg-olive-50/40' : 'bg-white'
                ].join(' ')}
              >
                {/* Trigger */}
                <button
                  aria-controls={panelId}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none"
                  onClick={() => setOpenStepIndex(isOpen ? null : index)}
                  type="button"
                >
                  <span className="grid gap-0.5">
                    <strong className="text-olive-950 text-xs font-semibold">{step.title}</strong>
                    <span className="text-olive-500 text-[0.7rem]">{step.summary}</span>
                  </span>
                  <span className="flex items-center justify-center w-5 h-5 text-olive-400 text-sm shrink-0">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                {/* Panel */}
                {isOpen && (
                  <div className="px-4 pb-4 grid gap-3" id={panelId}>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
                      <ol className="text-olive-700 text-xs list-decimal pl-4 grid gap-1.5">
                        {step.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ol>
                      {step.image && (
                        <div className="flex items-center justify-center">
                          <img
                            alt={step.title}
                            className="rounded border border-olive-200 w-full max-h-[140px] object-cover"
                            src={step.image}
                          />
                        </div>
                      )}
                    </div>
                    {step.code && (
                      <div className="relative mt-1">
                        <button
                          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-[11px] bg-white border border-olive-200 rounded text-olive-750 hover:bg-olive-50 transition-colors shadow-xs"
                          onClick={() => handleCopy(step.code!, index)}
                          type="button"
                        >
                          {copiedIndex === index ? <Check size={10} /> : <Copy size={10} />}
                          {copiedIndex === index ? 'Copied!' : 'Copy'}
                        </button>
                        <pre className="bg-olive-900 text-olive-100 text-[0.75rem] leading-relaxed rounded p-4 overflow-x-auto whitespace-pre-wrap max-h-[250px] overflow-y-auto">
                          <code>{step.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </SectionCard>

      {/* Generated key modal */}
      {generatedCompanionKey && (
        <Modal onClose={() => setGeneratedCompanionKey(null)} title="Companion Device Key">
          <div className="grid gap-3">
            <p className="text-olive-500 m-0 mt-0.5 text-[13px]">
              Key for <strong className="text-olive-900">{generatedCompanionKey?.deviceName}</strong>. Copy it now; it won't be shown again.
            </p>
            <code className="block bg-olive-900 text-olive-100 text-[0.8rem] rounded p-3 break-all font-mono">
              {generatedCompanionKey?.key}
            </code>
            <div className="flex gap-2 justify-end mt-1">
              <button className={ghostBtn} onClick={() => setGeneratedCompanionKey(null)} type="button">
                Close
              </button>
              <button className={primaryBtn} onClick={() => generatedCompanionKey?.key && void handleCopy(generatedCompanionKey.key, -2)} type="button">
                {copiedIndex === -2 ? <Check size={12} /> : <Copy size={12} />}
                Copy Key
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SettingsPanel;
