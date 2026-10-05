import { useEffect, useState } from 'react';
import { type LucideIcon, Smartphone, Tablet, Monitor, Info, Trash2, Save, RefreshCcw } from 'lucide-react';
import api from '@/services/api';
import { useConfirm } from '@/context/ConfirmationContext';
import Modal from './Modal';

interface CompanionDevice {
  id: string;
  deviceName: string;
  deviceType: string;
  status: 'active' | 'revoked' | 'pending';
  createdAt?: string;
  updatedAt?: string;
}

interface CompanionDevicesResponse {
  message: string;
  data: {
    devices: CompanionDevice[];
  };
}

interface ManageDevicesModalProps {
  onClose: () => void;
  onDevicesChanged?: (count: number) => void;
}

const deviceIconMap: Record<string, LucideIcon> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
  assistant: Info,
};

function ManageDevicesModal({ onClose, onDevicesChanged }: ManageDevicesModalProps): JSX.Element {
  const [devices, setDevices] = useState<CompanionDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, { deviceName: string; deviceType: string }>>({});
  const confirm = useConfirm();

  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<CompanionDevicesResponse>('/auth/devices');
      const fetched = response.data.data?.devices ?? [];
      setDevices(fetched);
      onDevicesChanged?.(fetched.length);

      // Initialize drafts
      const drafts: Record<string, { deviceName: string; deviceType: string }> = {};
      fetched.forEach(d => {
        drafts[d.id] = { deviceName: d.deviceName, deviceType: d.deviceType };
      });
      setRenameDrafts(drafts);
    } catch {
      setError('Failed to load companion devices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDevices();
  }, []);

  const handleUpdate = async (deviceId: string) => {
    const draft = renameDrafts[deviceId];
    if (!draft || !draft.deviceName.trim()) return;

    setActiveActionId(deviceId);
    try {
      await api.patch(`/auth/devices/${deviceId}`, {
        deviceName: draft.deviceName.trim(),
        deviceType: draft.deviceType
      });
      await loadDevices();
    } catch {
      setError('Failed to update device.');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    const isConfirmed = await confirm({
      title: 'Revoke Device',
      message: 'Revoke this companion device immediately? It will be signed out and unable to reconnect without a new key.',
      confirmText: 'Revoke Device',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setActiveActionId(deviceId);
    try {
      await api.delete(`/auth/devices/${deviceId}`);
      await loadDevices();
    } catch {
      setError('Failed to revoke device.');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleDraftChange = (deviceId: string, field: 'deviceName' | 'deviceType', value: string) => {
    setRenameDrafts((prev: Record<string, { deviceName: string; deviceType: string }>) => ({
      ...prev,
      [deviceId]: { ...prev[deviceId], [field]: value }
    }));
  };

  const ghostBtn = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-olive-200 rounded text-olive-750 text-xs font-semibold hover:bg-olive-50 disabled:opacity-50 transition-colors shadow-xs';
  const dangerBtn = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-red-200 rounded text-red-650 text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors shadow-xs';

  return (
    <Modal onClose={onClose} title="Manage Companion Devices" panelClassName="max-w-[550px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-olive-500 m-0 leading-relaxed">
            You can rename or revoke access for your secondary devices below.
          </p>
          <button
            onClick={() => void loadDevices()}
            disabled={loading}
            className="p-1 rounded hover:bg-olive-100 text-olive-400 transition-colors shrink-0"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded border border-red-200 m-0">{error}</p>}

        <div className="flex flex-col gap-3 min-h-[100px] overflow-y-auto max-h-[350px] pr-1">
          {loading && devices.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-olive-400 italic text-xs">
              Syncing device list...
            </div>
          ) : devices.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-olive-400 italic text-xs">
              No registered companion devices.
            </div>
          ) : (
            devices.map((device: CompanionDevice) => {
              const draft = renameDrafts[device.id] ?? { deviceName: device.deviceName, deviceType: device.deviceType };
              const Icon = deviceIconMap[device.deviceType] || Info;
              const isWorking = activeActionId === device.id;

              return (
                <div key={device.id} className="p-3.5 rounded border border-olive-200 bg-white flex flex-col gap-3 shadow-xs">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 flex items-center justify-center rounded bg-olive-100 text-olive-650 shrink-0">
                        <Icon size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-olive-950 text-xs">
                            {device.deviceName}
                          </span>
                          {device.status === 'pending' && (
                            <span className="text-[11px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200/50 uppercase">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-olive-400 m-0 uppercase tracking-wider font-bold">
                          {device.deviceType}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${device.status === 'pending'
                      ? 'bg-amber-100/50 text-amber-600 border-amber-200/50'
                      : 'bg-green-100/50 text-green-600 border-green-200/50'
                      }`}>
                      {device.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-olive-400 uppercase tracking-widest pl-0.5">Name</label>
                      <input
                        className="bg-white border border-olive-200 rounded px-2.5 py-1.5 text-xs text-olive-950 focus:outline-none focus:border-olive-500"
                        value={draft.deviceName}
                        onChange={e => handleDraftChange(device.id, 'deviceName', e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-olive-400 uppercase tracking-widest pl-0.5">Category</label>
                      <select
                        className="bg-white border border-olive-200 rounded px-2.5 py-1.5 text-xs text-olive-950 focus:outline-none focus:border-olive-500"
                        value={draft.deviceType}
                        onChange={e => handleDraftChange(device.id, 'deviceType', e.target.value)}
                      >
                        <option value="mobile">Mobile</option>
                        <option value="tablet">Tablet</option>
                        <option value="desktop">Desktop</option>
                        <option value="assistant">Assistant</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-olive-100">
                    <button
                      className={ghostBtn}
                      disabled={isWorking || (draft.deviceName === device.deviceName && draft.deviceType === device.deviceType)}
                      onClick={() => void handleUpdate(device.id)}
                    >
                      <Save size={12} />
                      {isWorking ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      className={dangerBtn}
                      disabled={isWorking}
                      onClick={() => void handleRevoke(device.id)}
                    >
                      <Trash2 size={12} />
                      {isWorking ? 'Revoking...' : 'Revoke'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

export default ManageDevicesModal;