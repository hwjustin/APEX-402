import { z } from 'zod';

// src/types/network.ts
var SupportedNetworks = {
  BSC_MAINNET: "bsc-mainnet",
  BSC_TESTNET: "bsc-testnet"
};
var NetworkConfigs = {
  [SupportedNetworks.BSC_MAINNET]: {
    chainId: 56,
    name: "BNB Smart Chain Mainnet",
    rpcUrl: "https://bsc-dataseed1.binance.org",
    explorer: "https://bscscan.com"
  },
  [SupportedNetworks.BSC_TESTNET]: {
    chainId: 97,
    name: "BNB Smart Chain Testnet",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    explorer: "https://testnet.bscscan.com"
  }
};

// src/types/payment.ts
var PaymentScheme = {
  EIP7702_DELEGATED: "evm/eip7702-delegated-payment",
  EIP7702_DELEGATED_BATCH: "evm/eip7702-delegated-batch"
};
var AddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
var HexSchema = z.string().regex(/^0x[0-9a-fA-F]+$/);
var BigIntStringSchema = z.string().regex(/^\d+$/);
var NetworkSchema = z.enum([
  SupportedNetworks.BSC_MAINNET,
  SupportedNetworks.BSC_TESTNET
]);
var PaymentSchemeSchema = z.enum([
  PaymentScheme.EIP7702_DELEGATED,
  PaymentScheme.EIP7702_DELEGATED_BATCH
]);
var Eip712DomainSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  chainId: z.number(),
  verifyingContract: AddressSchema
});
var WitnessMessageSchema = z.object({
  owner: AddressSchema,
  token: AddressSchema,
  amount: BigIntStringSchema,
  to: AddressSchema,
  deadline: BigIntStringSchema,
  paymentId: HexSchema,
  nonce: BigIntStringSchema
});
var PaymentItemSchema = z.object({
  token: AddressSchema,
  amount: BigIntStringSchema,
  to: AddressSchema
});
var BatchWitnessMessageSchema = z.object({
  owner: AddressSchema,
  items: z.array(PaymentItemSchema),
  deadline: BigIntStringSchema,
  paymentId: HexSchema,
  nonce: BigIntStringSchema
});
var AuthorizationTupleSchema = z.object({
  chainId: z.number(),
  address: AddressSchema,
  nonce: z.number(),
  yParity: z.number().min(0).max(1),
  r: HexSchema,
  s: HexSchema
});
var PaymentDetailsSchema = z.object({
  scheme: PaymentSchemeSchema,
  networkId: NetworkSchema,
  token: AddressSchema,
  amount: BigIntStringSchema,
  to: AddressSchema,
  implementationContract: AddressSchema,
  witness: z.record(z.any()),
  // Flexible for typed data
  authorization: z.object({
    chainId: z.number(),
    address: AddressSchema,
    nonce: z.number()
  })
});
var PaymentRequiredResponseSchema = z.object({
  x402Version: z.number(),
  accepts: z.array(PaymentDetailsSchema),
  error: z.string().optional()
});
var SignedPaymentPayloadSchema = z.object({
  witnessSignature: HexSchema,
  authorization: AuthorizationTupleSchema,
  paymentDetails: PaymentDetailsSchema
});

// src/types/responses.ts
var ErrorReason = {
  INSUFFICIENT_FUNDS: "insufficient_funds",
  INVALID_SIGNATURE: "invalid_signature",
  INVALID_AUTHORIZATION: "invalid_authorization",
  INVALID_AMOUNT: "invalid_amount",
  INVALID_RECIPIENT: "invalid_recipient",
  PAYMENT_EXPIRED: "payment_expired",
  NONCE_REUSED: "nonce_reused",
  INVALID_IMPLEMENTATION: "invalid_implementation",
  INVALID_NETWORK: "invalid_network",
  INVALID_SCHEME: "invalid_scheme",
  UNEXPECTED_ERROR: "unexpected_error"
};

export { AddressSchema, AuthorizationTupleSchema, BatchWitnessMessageSchema, BigIntStringSchema, Eip712DomainSchema, ErrorReason, HexSchema, NetworkConfigs, NetworkSchema, PaymentDetailsSchema, PaymentItemSchema, PaymentRequiredResponseSchema, PaymentScheme, PaymentSchemeSchema, SignedPaymentPayloadSchema, SupportedNetworks, WitnessMessageSchema };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map