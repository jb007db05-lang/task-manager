import api from '@/services/api';

export type SdkIntegrationStatus = 'pending' | 'connected' | 'disabled' | 'revoked';
export type SdkEnvironment = 'development' | 'staging' | 'production';
/**
 * Chosen when the integration is created. Sandbox integrations work from
 * localhost, see draft guides/surveys and keep all their data as sandbox data.
 */
export type SdkIntegrationMode = 'sandbox' | 'production';
/** Which data an SDK key reads and writes: the live key or the sandbox key. */
export type DataEnvironment = 'live' | 'sandbox';

export interface SdkSandbox {
  enabled: boolean;
  keyMasked?: string;
  createdAt?: string | null;
  lastRequestAt?: string | null;
}

export interface SandboxPurgeResult {
  events: number;
  exposures: number;
  surveyResponses: number;
  users: number;
}

export interface SdkIntegration {
  id: string;
  name: string;
  mode: SdkIntegrationMode;
  environment: SdkEnvironment;
  domain: string;
  allowedOrigins: string[];
  description?: string;
  status: SdkIntegrationStatus;
  sdkKeyMasked: string;
  sandbox: SdkSandbox;
  sdkVersion?: string | null;
  firstConnectedAt?: string | null;
  lastConnectedAt?: string | null;
  lastRuntimeRequestAt?: string | null;
  lastEventRequestAt?: string | null;
  lastHeartbeatAt?: string | null;
  connectionCount: number;
  latestOrigin?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiEnvelope<T> { data: T }
interface IntegrationResponse { integration: SdkIntegration }
interface CreateResponse { integration: SdkIntegration; sdkKey: string }

export const listIntegrations = async (): Promise<SdkIntegration[]> => {
  const res = await api.get<ApiEnvelope<{ integrations: SdkIntegration[] }>>('/sdk-integrations');
  return res.data.data.integrations;
};

export const getIntegration = async (id: string): Promise<SdkIntegration> => {
  const res = await api.get<ApiEnvelope<IntegrationResponse>>(`/sdk-integrations/${id}`);
  return res.data.data.integration;
};

export const createIntegration = async (payload: {
  name: string;
  mode: SdkIntegrationMode;
  environment: SdkEnvironment;
  domain: string;
  allowedOrigins?: string[];
  description?: string;
}): Promise<CreateResponse> => {
  const res = await api.post<ApiEnvelope<CreateResponse>>('/sdk-integrations', payload);
  return res.data.data;
};

export const updateIntegration = async (
  id: string,
  payload: {
    name?: string;
    environment?: string;
    domain?: string;
    allowedOrigins?: string[];
    description?: string;
  }
): Promise<SdkIntegration> => {
  const res = await api.patch<ApiEnvelope<IntegrationResponse>>(`/sdk-integrations/${id}`, payload);
  return res.data.data.integration;
};

export const regenerateKey = async (id: string): Promise<CreateResponse> => {
  const res = await api.post<ApiEnvelope<CreateResponse>>(`/sdk-integrations/${id}/regenerate-key`);
  return res.data.data;
};

interface SandboxKeyResponse { integration: SdkIntegration; sandboxKey: string }

/** Creates the sandbox key; the raw key is only returned once. */
export const createSandbox = async (id: string): Promise<SandboxKeyResponse> => {
  const res = await api.post<ApiEnvelope<SandboxKeyResponse>>(`/sdk-integrations/${id}/sandbox`);
  return res.data.data;
};

export const regenerateSandboxKey = async (id: string): Promise<SandboxKeyResponse> => {
  const res = await api.post<ApiEnvelope<SandboxKeyResponse>>(`/sdk-integrations/${id}/sandbox/regenerate-key`);
  return res.data.data;
};

/** Deletes sandbox events, exposures, survey responses and users; keeps the key. */
export const resetSandbox = async (id: string): Promise<SandboxPurgeResult> => {
  const res = await api.post<ApiEnvelope<{ purged: SandboxPurgeResult }>>(`/sdk-integrations/${id}/sandbox/reset`);
  return res.data.data.purged;
};

/** Removes the sandbox key and all sandbox data. */
export const deleteSandbox = async (id: string): Promise<SandboxPurgeResult> => {
  const res = await api.delete<ApiEnvelope<{ purged: SandboxPurgeResult }>>(`/sdk-integrations/${id}/sandbox`);
  return res.data.data.purged;
};

export const disableIntegration = async (id: string): Promise<SdkIntegration> => {
  const res = await api.post<ApiEnvelope<IntegrationResponse>>(`/sdk-integrations/${id}/disable`);
  return res.data.data.integration;
};

export const enableIntegration = async (id: string): Promise<SdkIntegration> => {
  const res = await api.post<ApiEnvelope<IntegrationResponse>>(`/sdk-integrations/${id}/enable`);
  return res.data.data.integration;
};

export const deleteIntegration = async (id: string): Promise<void> => {
  await api.delete(`/sdk-integrations/${id}`);
};
