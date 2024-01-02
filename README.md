# Reclaim ReactNative SDK v2

Designed to request proofs from the Reclaim protocol and manage the flow of claims.

## Installation

```sh
npm install v2-reclaim-sdk-reactnative
```

## Interfaces:

- ### Reclaim Interface

  - #### `requestProof(request: ProofRequest, AppCallbackUrl: string):`

    Requests proof using the provided proof request.

    **Parameters:**

    - `request`: ProofRequest (The proof request object)
    - `AppCallbackUrl`: callback url which will receive the proof from AppClip/InstantApp

- ### ProofRequest Interface

  - **title:** `string` - Title of the request
  - **requestedProofs:** `ProviderV2[]` - Proofs requested by the application
  - **contextMessage?:** `string` - Context message for the proof request
  - **contextAddress?:** `string` - Context address for the proof request (can be zero address)
  - **requestorSignature?:** `string` - Signature of the requestor

- ### Provider V2

  - **name:** string
  - **logoUrl:** string
  - **url:** string
  - **urlType:** string
  - **Method:** GET | POST
  - **Body:** Object | null
  - **loginURL:** string
  - **loginCookies:** string[]
  - **loginHeaders:** string[]
  - **isActive:** boolean
  - **responseSelections:** Object[]
    - JSON Path: string
    - XPath: string
    - Response Match: string
  - **completedTrigger:** string
  - **customInjection:** string
  - **Body Sniff:** Object
    - Enabled: false
    - Regex: "(.\*?)"
  - **userAgent:** string | null
  - **isApproved:** boolean

- ### ResponseRedaction Interface:

  - **xPath?:** `string` _(XPath for HTML response)_
  - **jsonPath?:** `string` _(JSONPath for JSON response)_
  - **regex?:** `string` _(Regex for response matching)_

- ### ResponseMatch Interface:

  - **type:** `'regex' | 'contains'` _("regex" or "contains" indicating the matching type)_
  - **value:** `string` _(The string/regex to match against)_

## Usage Flow

<img src="./readme/usage-flow-2.svg">

## Dependency Diagram

<img src='./readme/dep-diagram-reactnative-2.svg' width='600' />

## Error Codes

- `InvalidProofRequest`: The provided proof request is invalid or contains errors.

- `ProofRequestTimeout`: The proof request process timed out without receiving the necessary information.

- `ProofSubmissionFailed`: An error occurred while submitting the proof.

- `InsufficientPermissions`: The application does not have sufficient permissions to perform the requested actions.

- `NetworkError`: A network error occurred during the proof request or submission process.

- `UnexpectedError`: An unexpected error occurred, and the operation could not be completed.

- `UserCanceled`: The user canceled the proof request or submission process.

## Create ProofRequest Example

```typescript
const privateKey = 'YOUR_PRIVATE_KEY';

const proofRequest: ProofRequest = {
  title: 'Example Proof Request',
  requestedProofs: [
    {
      url: 'https://api.example.com/data',
      method: 'GET',
      responseRedactions: [
        { start: 10, end: 20 },
        { start: 30, end: 40 },
      ],
      responseMatches: [
        { type: 'string', value: 'important-data' },
        { type: 'regex', pattern: '\\d{3}-\\d{2}-\\d{4}' },
      ],
      geoLocation: '37.7749,-122.4194',
    },
  ],
  contextMessage: 'Please provide the necessary proofs for verification.',
  contextAddress: '0x0',
};

const dataToSign = JSON.stringify(proofRequest);

const signature = signData(dataToSign, privateKey);

const proofRequestWithSignature: ProofRequest = {
  ...proofRequestWithoutSensitiveHeaders,
  requestorSignature: signature,
};

// Send the proof request to the AppClip/InstantApp
// Verify the signature on the AppClip side
const isSignatureValid = verifySignature(dataToSign, signature);
```

## License

MIT
