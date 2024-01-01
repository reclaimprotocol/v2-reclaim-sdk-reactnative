export interface ResponseRedaction {
    xPath?: string;
    jsonPath?: string;
    regex?: string;
}

export interface ProviderV2 {
    name: string;
    logoUrl: string;
    url: string;
    urlType: string;
    method: 'GET' | 'POST';
    body: object | null;
    loginURL: string;
    loginCookies: string[];
    loginHeaders: string[];
    isActive: boolean;
    responseSelections: ResponseRedaction[];
    completedTrigger: string;
    customInjection: string;
    bodySniff: {
        enabled: boolean;
        regex: string;
    };
    userAgent: string | null;
    isApproved: boolean;
}

export interface ProofRequest {
    title: string;
    requestedProofs: ProviderV2[];
    contextMessage?: string;
    contextAddress?: string;
    requestorSignature?: string;
}