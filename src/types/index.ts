export interface DetectedItem {
  text: string;
  type: 'email' | 'ip' | 'creditCard' | 'secret' | 'pii';
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface ProcessingState {
  status: 'idle' | 'loading' | 'scanning' | 'redacting' | 'complete' | 'error';
  progress: number;
  message: string;
}

export interface BatchItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'complete' | 'error';
  detectedCount: number;
  detectedBreakdown: {
    emails: number;
    ips: number;
    creditCards: number;
    secrets: number;
    pii: number;
  };
  dataUrl: string | null;
}

export interface BatchProgress {
  current: number;
  total: number;
  isProcessing: boolean;
}

export interface DetectionSettings {
  email: boolean;
  ip: boolean;
  creditCard: boolean;
  secret: boolean;
  pii: boolean;
}
