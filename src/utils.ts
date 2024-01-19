import URL from 'url-parse';
import type { ParsedURL, SignedClaim } from './types';
import type { Context } from './interfaces';
import { ethers } from 'ethers';
import canonicalize from 'canonicalize';
import {
  fetchWitnessListForClaim,
  makeBeacon,
  createSignDataForClaim,
} from '@reclaimprotocol/witness-sdk';

/*
    URL utils
*/
export function parse(url: string): ParsedURL {
  validateURL(url);

  const parsed = URL(url, /* parseQueryString */ true);

  for (const param in parsed.query) {
    parsed.query[param] = decodeURIComponent(parsed.query[param]!);
  }
  const queryParams = parsed.query;

  let path = parsed.pathname || null;
  let hostname = parsed.hostname || null;
  let scheme = parsed.protocol || null;

  if (scheme) {
    // Remove colon at end
    scheme = scheme.substring(0, scheme.length - 1);
  }

  return {
    hostname,
    path,
    queryParams,
    scheme,
  };
}

function validateURL(url: string): void {
  if (typeof url !== 'string') {
    throw new Error(`Invalid URL: ${url}. URL must be a string.`);
  }
  if (!url) {
    throw new Error(`Invalid URL: ${url}. URL cannot be empty`);
  }
}

/*
    Context utils
*/

export function encodeContext(
  ctx: Context,
  sessionId: string,
  fromProof: boolean
): string {
  const context = {
    contextMessage: !fromProof
      ? ethers.keccak256(ethers.toUtf8Bytes(ctx.contextMessage))
      : ctx.contextMessage,
    contextAddress: ctx.contextAddress,
    sessionId: sessionId,
  };
  return canonicalize(context)!;
}

export function decodeContext(ctx: string): Context {
  const context: Context = JSON.parse(ctx);
  return context;
}

/*
  Witness Utils
*/

export async function getWitnessesForClaim(
  epoch: number,
  identifier: string,
  timestampS: number
) {
  const beacon = makeBeacon();
  const state = await beacon.getState(epoch);
  const witnessList = fetchWitnessListForClaim(state, identifier, timestampS);
  return witnessList.map((w) => w.id.toLowerCase());
}

/*
   Proof Utils
*/

/** recovers the addresses of those that signed the claim */
export function recoverSignersOfSignedClaim({
  claim,
  signatures,
}: SignedClaim) {
  const dataStr = createSignDataForClaim({ ...claim });
  return signatures.map((signature) =>
    ethers.verifyMessage(dataStr, ethers.hexlify(signature)).toLowerCase()
  );
}

/**
 * Asserts that the claim is signed by the expected witnesses
 * @param claim
 * @param expectedWitnessAddresses
 */
export function assertValidSignedClaim(
  claim: SignedClaim,
  expectedWitnessAddresses: string[]
) {
  const witnessAddresses = recoverSignersOfSignedClaim(claim);
  // set of witnesses whose signatures we've not seen
  const witnessesNotSeen = new Set(expectedWitnessAddresses);
  for (const witness of witnessAddresses) {
    if (witnessesNotSeen.has(witness)) {
      witnessesNotSeen.delete(witness);
    }
  }

  // check if all witnesses have signed
  if (witnessesNotSeen.size > 0) {
    throw new Error(
      `Missing signatures from ${expectedWitnessAddresses.join(', ')}`
    );
  }
}
