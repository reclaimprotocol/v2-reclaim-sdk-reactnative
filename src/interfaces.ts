export interface Reclaim {
  verify(options: VerifyOptions): void;
  buildHttpProviderV2ByIds(providerIds: string[]): Promise<ProviderV2[]>;
  signProofRequest(request: ProofRequest, privateKey: string): ProofRequest;
  requestProof(request: ProofRequest): Promise<string>;
  registerHandlers(options: HandlersOptions): void;
  deepLinkData: any;
}

export interface VerifyOptions {
  title: string;
  providerIds: string[];
  onSuccessCallback: (proofs: Proof[]) => void;
  onFailureCallback: (error: Error | unknown) => void;
  privateKey: string;
  contextAddress?: string;
  contextMessage?: string;
}

export interface HandlersOptions {
  onSuccessCallback: (proofs: Proof[]) => void;
  onFailureCallback: (error: Error | unknown) => void;
}

export interface ProofRequest {
  title: string;
  requestedProofs: ProviderV2[];
  contextMessage?: string;
  contextAddress?: string;
  requestorSignature?: string;
  appCallbackUrl: string;
}

export interface ProviderV2 {
  id: string;
  name: string;
  logoUrl: string;
  url: string;
  urlType: string;
  Method: 'GET' | 'POST';
  Body: Object | null;
  loginURL: string;
  loginCookies: string[];
  loginHeaders: string[];
  isActive: boolean;
  responseSelections: ResponseSelection[];
  completedTrigger: string;
  customInjection: string;
  bodySniff: BodySniff;
  userAgent: string | null;
  isApproved: boolean;
}

export interface ResponseSelection {
  JSONPath: string;
  XPath: string;
  responseMatch: string;
}

export interface BodySniff {
  enabled: boolean;
  regex: string;
}

export interface Proof {
  identifier: string;
  claimData: ProviderClaimData;
  signatures: string[];
  witnesses: WitnessData[];
}

export interface WitnessData {
  id: string;
  url: string;
}

export interface ProviderClaimData {
  provider: string;
  parameters: string;
  owner: string;
  timestampS: number;
  context: string;
  /**
   * identifier of the claim;
   * Hash of (provider, parameters, context)
   *
   * This is different from the claimId returned
   * from the smart contract
   */
  identifier: string;
  epoch: number;
}
