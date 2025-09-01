export interface SetupScript {
  name: string;
  description: string;
  execute: (db: any) => Promise<void>;
  dependsOn?: string[];
}

export interface SetupResult {
  scriptName: string;
  success: boolean;
  duration: number;
  error?: string;
}

export interface SetupExecutionContext {
  config: any;
  results: SetupResult[];
  startTime: Date;
}

export type SetupPhase = 'preparation' | 'seeding' | 'validation' | 'cleanup';

export interface SetupOptions {
  scripts?: string[];
  phases?: SetupPhase[];
  continueOnError?: boolean;
  verbose?: boolean;
}
