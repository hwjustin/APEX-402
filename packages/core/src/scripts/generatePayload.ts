// scripts/generatePayload.ts
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import type { PaymentDetails } from "../types/payment";
import { PaymentScheme } from "../types/payment";
import { createSignedPaymentPayload } from "../client/createSignedPayload";

async function main() {
  const PRIVATE_KEY = process.env.PAYER_PRIVATE_KEY as `0x${string}`;
  if (!PRIVATE_KEY) {
    throw new Error("Set PAYER_PRIVATE_KEY in env");
  }

  const account = privateKeyToAccount(PRIVATE_KEY);

  const implementation = "0x8aB283419554Fa7f7B332118F1815829B5C353DE";

  const paymentDetails: PaymentDetails = {
    scheme: PaymentScheme.EIP7702_DELEGATED,      // will serialize as "evm/eip7702-delegated-payment"
    networkId: "bsc-testnet",
    token: "0x337610d27c682e347c9cd60bd4b3b107c9d34ddd",                               // real token address
    amount: "1000000000000000000",               // 1 token in wei as string
    to: "0x073C02ff48F6E81E6eFeE81B2a826B811bEaC855",                                 // real recipient
    implementationContract: implementation,             // must be whitelisted in facilitator
    witness: {} as any,                          // will be filled in helper
    authorization: {
      chainId: 97,                               // BSC testnet chainId
      address: implementation,                          // same as implementationContract or contract used in domain
      nonce: 0,
    },
  };

  const payload = await createSignedPaymentPayload(account, paymentDetails);

  console.log(
    JSON.stringify(
      payload,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});