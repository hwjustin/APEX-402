import { z } from 'zod';
import { randomBytes } from 'crypto';
import { bytesToBigInt, isAddress, isHex, toRlp, concat, keccak256 } from 'viem';
import { signTypedData } from 'viem/actions';
import { base64 } from '@scure/base';

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

// src/client/facilitator.ts
var FacilitatorClient = class {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    if (!baseUrl) {
      throw new Error("Facilitator base URL is required");
    }
  }
  /**
   * Verify a payment payload with the facilitator
   * POST /verify endpoint
   */
  async verify(payload) {
    try {
      const response = await fetch(`${this.baseUrl}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Facilitator verification failed: ${response.status} - ${errorData.message || response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error during verification: ${error}`);
    }
  }
  /**
   * Settle a payment through the facilitator
   * POST /settle endpoint
   */
  async settle(payload) {
    try {
      const response = await fetch(`${this.baseUrl}/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Facilitator settlement failed: ${response.status} - ${errorData.message || response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error during settlement: ${error}`);
    }
  }
  /**
   * Get supported payment schemes and networks
   * GET /supported endpoint
   */
  async getSupported() {
    try {
      const response = await fetch(`${this.baseUrl}/supported`, {
        method: "GET"
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to get supported schemes: ${response.status} - ${errorData.message || response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error getting supported schemes: ${error}`);
    }
  }
  /**
   * Health check endpoint
   */
  async health() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET"
      });
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Health check error: ${String(error)}`);
    }
  }
};
function createFacilitatorClient(baseUrl) {
  const url = baseUrl || process.env.FACILITATOR_URL || "http://localhost:8080";
  return new FacilitatorClient(url);
}
async function verifyPaymentWithFacilitator(payload, facilitatorUrl) {
  const client = createFacilitatorClient(facilitatorUrl);
  return await client.verify(payload);
}
async function settlePaymentWithFacilitator(payload, facilitatorUrl) {
  const client = createFacilitatorClient(facilitatorUrl);
  return await client.settle(payload);
}
function generateNonce() {
  const bytes = randomBytes(32);
  return bytesToBigInt(bytes);
}
function generatePaymentId() {
  const bytes = randomBytes(32);
  return `0x${bytes.toString("hex")}`;
}
function generateAuthNonce() {
  const bytes = randomBytes(8);
  return bytesToBigInt(bytes);
}
function validateAddress(address) {
  return typeof address === "string" && isAddress(address);
}
function validateHex(value) {
  return typeof value === "string" && isHex(value);
}
function validateBigInt(value) {
  if (typeof value === "bigint") {
    return value >= 0n;
  }
  if (typeof value === "string") {
    return /^\d+$/.test(value);
  }
  return false;
}
function validateDeadline(deadline) {
  const now = BigInt(Math.floor(Date.now() / 1e3));
  return deadline > now;
}
function validateAmount(amount) {
  return amount > 0n;
}
function parseBigInt(value) {
  return typeof value === "bigint" ? value : BigInt(value);
}

// src/utils/errors.ts
var X402BnbError = class extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "X402BnbError";
  }
};
var PaymentValidationError = class extends X402BnbError {
  constructor(message, details) {
    super(message, "PAYMENT_VALIDATION_ERROR", details);
    this.name = "PaymentValidationError";
  }
};
var SignatureError = class extends X402BnbError {
  constructor(message, details) {
    super(message, "SIGNATURE_ERROR", details);
    this.name = "SignatureError";
  }
};
var NetworkError = class extends X402BnbError {
  constructor(message, details) {
    super(message, "NETWORK_ERROR", details);
    this.name = "NetworkError";
  }
};
var TransactionError = class extends X402BnbError {
  constructor(message, details) {
    super(message, "TRANSACTION_ERROR", details);
    this.name = "TransactionError";
  }
};

// src/client/prepareWitness.ts
function prepareWitness(options) {
  const { owner, token, amount, to, deadline, paymentId, nonce } = options;
  if (!validateAddress(owner)) {
    throw new PaymentValidationError("Invalid owner address");
  }
  if (!validateAddress(token)) {
    throw new PaymentValidationError("Invalid token address");
  }
  if (!validateAddress(to)) {
    throw new PaymentValidationError("Invalid recipient address");
  }
  const amountBigInt = typeof amount === "string" ? BigInt(amount) : amount;
  if (!validateAmount(amountBigInt)) {
    throw new PaymentValidationError("Invalid amount");
  }
  const finalDeadline = deadline ?? BigInt(Math.floor(Date.now() / 1e3) + 900);
  const finalPaymentId = paymentId ?? generatePaymentId();
  const finalNonce = nonce ?? generateNonce();
  return {
    owner,
    token,
    amount: amountBigInt,
    to,
    deadline: finalDeadline,
    paymentId: finalPaymentId,
    nonce: finalNonce
  };
}
function prepareBatchWitness(options) {
  const { owner, items, deadline, paymentId, nonce } = options;
  if (!validateAddress(owner)) {
    throw new PaymentValidationError("Invalid owner address");
  }
  if (!items || items.length === 0) {
    throw new PaymentValidationError("Items array cannot be empty");
  }
  for (const item of items) {
    if (!validateAddress(item.token)) {
      throw new PaymentValidationError(`Invalid token address: ${item.token}`);
    }
    if (!validateAddress(item.to)) {
      throw new PaymentValidationError(`Invalid recipient address: ${item.to}`);
    }
    if (!validateAmount(item.amount)) {
      throw new PaymentValidationError(`Invalid amount: ${item.amount}`);
    }
  }
  const finalDeadline = deadline ?? BigInt(Math.floor(Date.now() / 1e3) + 900);
  const finalPaymentId = paymentId ?? generatePaymentId();
  const finalNonce = nonce ?? generateNonce();
  return {
    owner,
    items,
    deadline: finalDeadline,
    paymentId: finalPaymentId,
    nonce: finalNonce
  };
}
async function signWitness(account, domain, message) {
  try {
    const signature = await account.signTypedData({
      domain: {
        name: domain.name,
        version: domain.version,
        chainId: domain.chainId,
        verifyingContract: domain.verifyingContract
      },
      types: {
        Witness: [
          { name: "owner", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "to", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "paymentId", type: "bytes32" },
          { name: "nonce", type: "uint256" }
        ]
      },
      primaryType: "Witness",
      message: {
        owner: message.owner,
        token: message.token,
        amount: message.amount,
        to: message.to,
        deadline: message.deadline,
        paymentId: message.paymentId,
        nonce: message.nonce
      }
    });
    return signature;
  } catch (error) {
    throw new SignatureError("Failed to sign witness message", error);
  }
}
async function signWitnessWithWallet(walletClient, domain, message) {
  try {
    if (!walletClient.account) {
      throw new SignatureError("Wallet client has no account");
    }
    const signature = await signTypedData(walletClient, {
      account: walletClient.account,
      domain: {
        name: domain.name,
        version: domain.version,
        chainId: domain.chainId,
        verifyingContract: domain.verifyingContract
      },
      types: {
        Witness: [
          { name: "owner", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "to", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "paymentId", type: "bytes32" },
          { name: "nonce", type: "uint256" }
        ]
      },
      primaryType: "Witness",
      message: {
        owner: message.owner,
        token: message.token,
        amount: message.amount,
        to: message.to,
        deadline: message.deadline,
        paymentId: message.paymentId,
        nonce: message.nonce
      }
    });
    return signature;
  } catch (error) {
    throw new SignatureError("Failed to sign witness message with wallet", error);
  }
}
async function signBatchWitness(account, domain, message) {
  try {
    const signature = await account.signTypedData({
      domain: {
        name: domain.name,
        version: domain.version,
        chainId: domain.chainId,
        verifyingContract: domain.verifyingContract
      },
      types: {
        PaymentItem: [
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "to", type: "address" }
        ],
        BatchWitness: [
          { name: "owner", type: "address" },
          { name: "items", type: "PaymentItem[]" },
          { name: "deadline", type: "uint256" },
          { name: "paymentId", type: "bytes32" },
          { name: "nonce", type: "uint256" }
        ]
      },
      primaryType: "BatchWitness",
      message
    });
    return signature;
  } catch (error) {
    throw new SignatureError("Failed to sign batch witness message", error);
  }
}

// src/client/prepareAuthorization.ts
function prepareAuthorization(options) {
  const { chainId, implementationAddress, nonce } = options;
  if (!validateAddress(implementationAddress)) {
    throw new PaymentValidationError("Invalid implementation contract address");
  }
  const chainIdBigInt = typeof chainId === "number" ? BigInt(chainId) : chainId;
  const finalNonce = nonce !== void 0 ? typeof nonce === "number" ? BigInt(nonce) : nonce : generateAuthNonce();
  return {
    chainId: chainIdBigInt,
    address: implementationAddress,
    nonce: finalNonce
  };
}
async function signAuthorization(account, authorization) {
  try {
    const encoded = toRlp([
      authorization.chainId === 0n ? "0x" : `0x${authorization.chainId.toString(16)}`,
      authorization.address,
      authorization.nonce === 0n ? "0x" : `0x${authorization.nonce.toString(16)}`
    ]);
    const message = concat(["0x05", encoded]);
    const hash = keccak256(message);
    const signature = await account.signMessage({
      message: { raw: hash }
    });
    const r = signature.slice(0, 66);
    const s = `0x${signature.slice(66, 130)}`;
    const v = parseInt(signature.slice(130, 132), 16);
    const yParity = v >= 27 ? v - 27 : v;
    return {
      chainId: authorization.chainId,
      address: authorization.address,
      nonce: authorization.nonce,
      yParity,
      r,
      s
    };
  } catch (error) {
    throw new SignatureError("Failed to sign authorization tuple", error);
  }
}
async function verifyAuthorizationSignature(authorization, expectedSigner) {
  try {
    const { recoverMessageAddress } = await import('viem');
    const encoded = toRlp([
      authorization.chainId === 0n ? "0x" : `0x${authorization.chainId.toString(16)}`,
      authorization.address,
      authorization.nonce === 0n ? "0x" : `0x${authorization.nonce.toString(16)}`
    ]);
    const message = concat(["0x05", encoded]);
    const hash = keccak256(message);
    const v = authorization.yParity + 27;
    const signature = concat([
      authorization.r,
      authorization.s,
      `0x${v.toString(16).padStart(2, "0")}`
    ]);
    const recovered = await recoverMessageAddress({
      message: { raw: hash },
      signature
    });
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  } catch {
    return false;
  }
}
function encodeBase64(data) {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  const bytes = new TextEncoder().encode(str);
  return base64.encode(bytes);
}
function decodeBase64(encoded) {
  const bytes = base64.decode(encoded);
  const str = new TextDecoder().decode(bytes);
  return JSON.parse(str);
}
function rlpEncodeAuthorization(chainId, address, nonce) {
  const items = [
    encodeRlpItem(chainId),
    encodeRlpItem(address),
    encodeRlpItem(nonce)
  ];
  return encodeRlpList(items);
}
function encodeRlpItem(value) {
  if (typeof value === "bigint") {
    if (value === 0n) {
      return new Uint8Array([128]);
    }
    const hex = value.toString(16).padStart(value.toString(16).length % 2 === 0 ? 0 : 1, "0");
    const bytes = hexToBytes(hex);
    return encodeRlpString(bytes);
  } else {
    const bytes = hexToBytes(value.replace(/^0x/, ""));
    return encodeRlpString(bytes);
  }
}
function encodeRlpString(bytes) {
  if (bytes.length === 1 && bytes[0] < 128) {
    return bytes;
  }
  if (bytes.length <= 55) {
    return new Uint8Array([128 + bytes.length, ...bytes]);
  }
  const lengthBytes = numberToBytes(bytes.length);
  return new Uint8Array([183 + lengthBytes.length, ...lengthBytes, ...bytes]);
}
function encodeRlpList(items) {
  const concatenated = new Uint8Array(items.reduce((acc, item) => acc + item.length, 0));
  let offset = 0;
  for (const item of items) {
    concatenated.set(item, offset);
    offset += item.length;
  }
  if (concatenated.length <= 55) {
    return new Uint8Array([192 + concatenated.length, ...concatenated]);
  }
  const lengthBytes = numberToBytes(concatenated.length);
  return new Uint8Array([247 + lengthBytes.length, ...lengthBytes, ...concatenated]);
}
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
function numberToBytes(num) {
  const hex = num.toString(16).padStart(num.toString(16).length % 2 === 0 ? 0 : 1, "0");
  return hexToBytes(hex);
}

// src/client/createPaymentHeader.ts
async function createPaymentHeader(account, paymentDetails) {
  const witnessMessage = prepareWitness({
    owner: account.address,
    token: paymentDetails.token,
    amount: paymentDetails.amount,
    to: paymentDetails.to
  });
  const domain = {
    name: "x402 BNB",
    version: "1",
    chainId: paymentDetails.authorization.chainId,
    verifyingContract: paymentDetails.authorization.address
  };
  const witnessSignature = await signWitness(account, domain, witnessMessage);
  const unsignedAuth = prepareAuthorization({
    chainId: paymentDetails.authorization.chainId,
    implementationAddress: paymentDetails.implementationContract,
    nonce: paymentDetails.authorization.nonce
  });
  const signedAuth = await signAuthorization(account, unsignedAuth);
  const payload = {
    witnessSignature,
    authorization: signedAuth,
    paymentDetails
  };
  return encodeBase64(payload);
}
async function createPaymentHeaderWithWallet(walletClient, paymentDetails) {
  if (!walletClient.account) {
    throw new Error("Wallet client has no account");
  }
  const witnessMessage = prepareWitness({
    owner: walletClient.account.address,
    token: paymentDetails.token,
    amount: paymentDetails.amount,
    to: paymentDetails.to
  });
  const domain = {
    name: "x402 BNB",
    version: "1",
    chainId: paymentDetails.authorization.chainId,
    verifyingContract: paymentDetails.authorization.address
  };
  const witnessSignature = await signWitnessWithWallet(walletClient, domain, witnessMessage);
  const unsignedAuth = prepareAuthorization({
    chainId: paymentDetails.authorization.chainId,
    implementationAddress: paymentDetails.implementationContract,
    nonce: paymentDetails.authorization.nonce
  });
  const signedAuth = await signAuthorization(
    walletClient.account,
    unsignedAuth
  );
  const payload = {
    witnessSignature,
    authorization: signedAuth,
    paymentDetails
  };
  return encodeBase64(payload);
}

// src/client/selectPaymentDetails.ts
function selectPaymentDetails(response, options) {
  if (!response.accepts || response.accepts.length === 0) {
    return null;
  }
  const { network, scheme, maxAmount } = options ?? {};
  let candidates = response.accepts;
  if (network) {
    const filtered = candidates.filter((details) => details.networkId === network);
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }
  if (scheme) {
    const filtered = candidates.filter((details) => details.scheme === scheme);
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }
  if (maxAmount !== void 0) {
    const filtered = candidates.filter((details) => BigInt(details.amount) <= maxAmount);
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }
  return candidates[0] ?? null;
}
function isPaymentDetailsSupported(details) {
  const supportedSchemes = [PaymentScheme.EIP7702_DELEGATED, PaymentScheme.EIP7702_DELEGATED_BATCH];
  if (!supportedSchemes.includes(details.scheme)) {
    return false;
  }
  const supportedNetworks = ["bsc-mainnet", "bsc-testnet"];
  if (!supportedNetworks.includes(details.networkId)) {
    return false;
  }
  return true;
}

// src/client/resourceServer.ts
function createPaymentRequired(accepts, error) {
  return {
    x402Version: 1,
    accepts,
    error
  };
}
function parsePaymentHeader(header) {
  try {
    const decoded = Buffer.from(header, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error(`Invalid X-PAYMENT header: ${error}`);
  }
}
function createPaymentResponse(success, options) {
  const response = {
    success,
    ...options
  };
  return Buffer.from(JSON.stringify(response)).toString("base64");
}
function validatePaymentHeader(header, requirement) {
  if (header.scheme !== requirement.scheme) {
    return { isValid: false, reason: `Scheme mismatch: expected ${requirement.scheme}, got ${header.scheme}` };
  }
  if (header.network !== requirement.network) {
    return { isValid: false, reason: `Network mismatch: expected ${requirement.network}, got ${header.network}` };
  }
  if (header.x402Version !== 1) {
    return { isValid: false, reason: `Unsupported x402 version: ${header.x402Version}` };
  }
  return { isValid: true };
}
function createEip7702PaymentRequirement(amount, tokenAddress, recipientAddress, resource, description, network = "bsc-mainnet", mimeType = "application/json") {
  return {
    scheme: "evm/eip7702-signature-based",
    network,
    maxAmountRequired: amount,
    resource,
    description,
    mimeType,
    payTo: recipientAddress,
    maxTimeoutSeconds: 60,
    asset: tokenAddress,
    extra: {
      name: "x402 BNB",
      version: "1"
    }
  };
}

// src/contracts/abi.ts
var PaymentImplementationAbi = [
  {
    type: "function",
    name: "pay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "paymentId", type: "bytes32" },
      { name: "witnessSig", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "payBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      {
        name: "items",
        type: "tuple[]",
        components: [
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "to", type: "address" }
        ]
      },
      { name: "deadline", type: "uint256" },
      { name: "paymentId", type: "bytes32" },
      { name: "witnessSig", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "event",
    name: "Payment",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "paymentId", type: "bytes32", indexed: false }
    ]
  },
  {
    type: "event",
    name: "BatchPayment",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "paymentId", type: "bytes32", indexed: false },
      { name: "itemCount", type: "uint256", indexed: false }
    ]
  }
];
var Erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false }
    ]
  }
];

// src/contracts/addresses.ts
var ImplementationAddresses = {
  [SupportedNetworks.BSC_MAINNET]: "0x0000000000000000000000000000000000000000",
  // TODO: Deploy and update
  [SupportedNetworks.BSC_TESTNET]: "0x0000000000000000000000000000000000000000"
  // TODO: Deploy and update
};
function getImplementationAddress(network) {
  const address = ImplementationAddresses[network];
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Implementation contract not deployed on network: ${network}`);
  }
  return address;
}
var CommonTokens = {
  BSC_MAINNET: {
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    DAI: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3"
  },
  BSC_TESTNET: {
    USDT: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
    USDC: "0x64544969ed7EBf5f083679233325356EbE738930"
  }
};

// src/index.ts
var X402_BNB_VERSION = 1;

export { AddressSchema, AuthorizationTupleSchema, BatchWitnessMessageSchema, BigIntStringSchema, CommonTokens, Eip712DomainSchema, Erc20Abi, ErrorReason, FacilitatorClient, HexSchema, ImplementationAddresses, NetworkConfigs, NetworkError, NetworkSchema, PaymentDetailsSchema, PaymentImplementationAbi, PaymentItemSchema, PaymentRequiredResponseSchema, PaymentScheme, PaymentSchemeSchema, PaymentValidationError, SignatureError, SignedPaymentPayloadSchema, SupportedNetworks, TransactionError, WitnessMessageSchema, X402BnbError, X402_BNB_VERSION, createEip7702PaymentRequirement, createFacilitatorClient, createPaymentHeader, createPaymentHeaderWithWallet, createPaymentRequired, createPaymentResponse, decodeBase64, encodeBase64, generateAuthNonce, generateNonce, generatePaymentId, getImplementationAddress, isPaymentDetailsSupported, parseBigInt, parsePaymentHeader, prepareAuthorization, prepareBatchWitness, prepareWitness, rlpEncodeAuthorization, selectPaymentDetails, settlePaymentWithFacilitator, signAuthorization, signBatchWitness, signWitness, signWitnessWithWallet, validateAddress, validateAmount, validateBigInt, validateDeadline, validateHex, validatePaymentHeader, verifyAuthorizationSignature, verifyPaymentWithFacilitator };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map