'use strict';

var crypto = require('crypto');
var viem = require('viem');
var actions = require('viem/actions');
var base = require('@scure/base');

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
  const bytes = crypto.randomBytes(32);
  return viem.bytesToBigInt(bytes);
}
function generatePaymentId() {
  const bytes = crypto.randomBytes(32);
  return `0x${bytes.toString("hex")}`;
}
function generateAuthNonce() {
  const bytes = crypto.randomBytes(8);
  return viem.bytesToBigInt(bytes);
}
function validateAddress(address) {
  return typeof address === "string" && viem.isAddress(address);
}
function validateAmount(amount) {
  return amount > 0n;
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
    const signature = await actions.signTypedData(walletClient, {
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
    const encoded = viem.toRlp([
      authorization.chainId === 0n ? "0x" : `0x${authorization.chainId.toString(16)}`,
      authorization.address,
      authorization.nonce === 0n ? "0x" : `0x${authorization.nonce.toString(16)}`
    ]);
    const message = viem.concat(["0x05", encoded]);
    const hash = viem.keccak256(message);
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
    const encoded = viem.toRlp([
      authorization.chainId === 0n ? "0x" : `0x${authorization.chainId.toString(16)}`,
      authorization.address,
      authorization.nonce === 0n ? "0x" : `0x${authorization.nonce.toString(16)}`
    ]);
    const message = viem.concat(["0x05", encoded]);
    const hash = viem.keccak256(message);
    const v = authorization.yParity + 27;
    const signature = viem.concat([
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
  return base.base64.encode(bytes);
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

// src/types/payment.ts
var PaymentScheme = {
  EIP7702_DELEGATED: "evm/eip7702-delegated-payment",
  EIP7702_DELEGATED_BATCH: "evm/eip7702-delegated-batch"
};

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

exports.FacilitatorClient = FacilitatorClient;
exports.createEip7702PaymentRequirement = createEip7702PaymentRequirement;
exports.createFacilitatorClient = createFacilitatorClient;
exports.createPaymentHeader = createPaymentHeader;
exports.createPaymentHeaderWithWallet = createPaymentHeaderWithWallet;
exports.createPaymentRequired = createPaymentRequired;
exports.createPaymentResponse = createPaymentResponse;
exports.isPaymentDetailsSupported = isPaymentDetailsSupported;
exports.parsePaymentHeader = parsePaymentHeader;
exports.prepareAuthorization = prepareAuthorization;
exports.prepareBatchWitness = prepareBatchWitness;
exports.prepareWitness = prepareWitness;
exports.selectPaymentDetails = selectPaymentDetails;
exports.settlePaymentWithFacilitator = settlePaymentWithFacilitator;
exports.signAuthorization = signAuthorization;
exports.signBatchWitness = signBatchWitness;
exports.signWitness = signWitness;
exports.signWitnessWithWallet = signWitnessWithWallet;
exports.validatePaymentHeader = validatePaymentHeader;
exports.verifyAuthorizationSignature = verifyAuthorizationSignature;
exports.verifyPaymentWithFacilitator = verifyPaymentWithFacilitator;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map