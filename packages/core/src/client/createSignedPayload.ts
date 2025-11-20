// packages/core/src/client/createSignedPayload.ts
import type { LocalAccount, PrivateKeyAccount } from "viem";
import type { PaymentDetails, SignedPaymentPayload } from "../types/payment";
import type { Eip712Domain } from "../types/eip712";
import { prepareWitness } from "./prepareWitness";
import { signWitness } from "./signWitness";
import { prepareAuthorization } from "./prepareAuthorization";
import { signAuthorization } from "./signAuthorization";

export async function createSignedPaymentPayload(
  account: LocalAccount | PrivateKeyAccount,
  paymentDetails: PaymentDetails,
): Promise<SignedPaymentPayload> {
  // 1. Prepare witness
  const witnessMessage = prepareWitness({
    owner: account.address,
    token: paymentDetails.token,
    amount: paymentDetails.amount,
    to: paymentDetails.to,
  });

  // 2. Build EIP-712 domain
  const domain: Eip712Domain = {
    name: "q402",
    version: "1",
    chainId: paymentDetails.authorization.chainId,
    verifyingContract: paymentDetails.authorization.address,
  };

  // 3. Sign witness
  const witnessSignature = await signWitness(account, domain, witnessMessage);

  // 4. Prepare & sign authorization tuple
  const unsignedAuth = prepareAuthorization({
    chainId: paymentDetails.authorization.chainId,
    implementationAddress: paymentDetails.implementationContract,
    nonce: paymentDetails.authorization.nonce,
  });

  const signedAuth = await signAuthorization(account, unsignedAuth);

  // 5. Return SignedPaymentPayload
  const payload: SignedPaymentPayload = {
    witnessSignature,
    authorization: signedAuth,
    paymentDetails: {
      ...paymentDetails,
      // include the witness object so it matches your /verify schema shape
      witness: {
        domain,
        types: {
          Witness: [
            { name: "owner", type: "address" },
            { name: "token", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "to", type: "address" },
            { name: "deadline", type: "uint256" },
            { name: "paymentId", type: "bytes32" },
            { name: "nonce", type: "uint256" },
          ],
        },
        primaryType: "Witness",
        message: {
          owner: witnessMessage.owner,
          token: witnessMessage.token,
          amount: witnessMessage.amount.toString(),
          to: witnessMessage.to,
          deadline: witnessMessage.deadline.toString(),
          paymentId: witnessMessage.paymentId,
          nonce: witnessMessage.nonce.toString(),
        },
      },
    } as any,
  };

  return payload;
}