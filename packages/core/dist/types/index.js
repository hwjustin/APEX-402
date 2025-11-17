'use strict';

var zod = require('zod');

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
var AddressSchema = zod.z.string().regex(/^0x[0-9a-fA-F]{40}$/);
var HexSchema = zod.z.string().regex(/^0x[0-9a-fA-F]+$/);
var BigIntStringSchema = zod.z.string().regex(/^\d+$/);
var NetworkSchema = zod.z.enum([
  SupportedNetworks.BSC_MAINNET,
  SupportedNetworks.BSC_TESTNET
]);
var PaymentSchemeSchema = zod.z.enum([
  PaymentScheme.EIP7702_DELEGATED,
  PaymentScheme.EIP7702_DELEGATED_BATCH
]);
var Eip712DomainSchema = zod.z.object({
  name: zod.z.string(),
  version: zod.z.string().optional(),
  chainId: zod.z.number(),
  verifyingContract: AddressSchema
});
var WitnessMessageSchema = zod.z.object({
  owner: AddressSchema,
  token: AddressSchema,
  amount: BigIntStringSchema,
  to: AddressSchema,
  deadline: BigIntStringSchema,
  paymentId: HexSchema,
  nonce: BigIntStringSchema
});
var PaymentItemSchema = zod.z.object({
  token: AddressSchema,
  amount: BigIntStringSchema,
  to: AddressSchema
});
var BatchWitnessMessageSchema = zod.z.object({
  owner: AddressSchema,
  items: zod.z.array(PaymentItemSchema),
  deadline: BigIntStringSchema,
  paymentId: HexSchema,
  nonce: BigIntStringSchema
});
var AuthorizationTupleSchema = zod.z.object({
  chainId: zod.z.number(),
  address: AddressSchema,
  nonce: zod.z.number(),
  yParity: zod.z.number().min(0).max(1),
  r: HexSchema,
  s: HexSchema
});
var PaymentDetailsSchema = zod.z.object({
  scheme: PaymentSchemeSchema,
  networkId: NetworkSchema,
  token: AddressSchema,
  amount: BigIntStringSchema,
  to: AddressSchema,
  implementationContract: AddressSchema,
  witness: zod.z.record(zod.z.any()),
  // Flexible for typed data
  authorization: zod.z.object({
    chainId: zod.z.number(),
    address: AddressSchema,
    nonce: zod.z.number()
  })
});
var PaymentRequiredResponseSchema = zod.z.object({
  x402Version: zod.z.number(),
  accepts: zod.z.array(PaymentDetailsSchema),
  error: zod.z.string().optional()
});
var SignedPaymentPayloadSchema = zod.z.object({
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

exports.AddressSchema = AddressSchema;
exports.AuthorizationTupleSchema = AuthorizationTupleSchema;
exports.BatchWitnessMessageSchema = BatchWitnessMessageSchema;
exports.BigIntStringSchema = BigIntStringSchema;
exports.Eip712DomainSchema = Eip712DomainSchema;
exports.ErrorReason = ErrorReason;
exports.HexSchema = HexSchema;
exports.NetworkConfigs = NetworkConfigs;
exports.NetworkSchema = NetworkSchema;
exports.PaymentDetailsSchema = PaymentDetailsSchema;
exports.PaymentItemSchema = PaymentItemSchema;
exports.PaymentRequiredResponseSchema = PaymentRequiredResponseSchema;
exports.PaymentScheme = PaymentScheme;
exports.PaymentSchemeSchema = PaymentSchemeSchema;
exports.SignedPaymentPayloadSchema = SignedPaymentPayloadSchema;
exports.SupportedNetworks = SupportedNetworks;
exports.WitnessMessageSchema = WitnessMessageSchema;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map