import axios from 'axios';

export interface NormalizedApiError {
  message: string;
  code: string;
  status?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const normalizeApiError = (error: unknown): NormalizedApiError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    // For 5xx server errors, never display internal server traces or technical details
    if (status && status >= 500) {
      return {
        message: 'Internal server error',
        code: isRecord(responseData) && typeof responseData.code === 'string' ? responseData.code : 'INTERNAL_ERROR',
        status
      };
    }

    if (isRecord(responseData)) {
      let message =
        typeof responseData.message === 'string'
          ? responseData.message
          : typeof responseData.error === 'string'
            ? responseData.error
            : error.message;

      // Extra guard against leaked server traces in messages
      if (
        message.toLowerCase().includes('cast to objectid') ||
        message.toLowerCase().includes('mongo') ||
        message.toLowerCase().includes('syntaxerror') ||
        message.toLowerCase().includes('internal server')
      ) {
        message = 'Internal server error';
      }

      const code =
        typeof responseData.code === 'string'
          ? responseData.code
          : `HTTP_${error.response?.status ?? 'UNKNOWN'}`;

      return {
        message,
        code,
        status: error.response?.status
      };
    }

    return {
      message: status && status >= 500 ? 'Internal server error' : (error.message || 'Request failed'),
      code: `HTTP_${error.response?.status ?? 'UNKNOWN'}`,
      status: error.response?.status
    };
  }

  if (error instanceof Error) {
    let msg = error.message;
    if (msg.toLowerCase().includes('cast to objectid') || msg.toLowerCase().includes('mongo')) {
      msg = 'Internal server error';
    }
    return {
      message: msg,
      code: 'UNKNOWN_ERROR'
    };
  }

  return {
    message: 'Internal server error',
    code: 'UNKNOWN_ERROR'
  };
};

export const toDisplayErrorMessage = (error: unknown): string =>
  normalizeApiError(error).message;
