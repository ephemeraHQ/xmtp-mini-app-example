import "dotenv/config";
import { IdentifierKind, type Signer } from "@xmtp/node-sdk";
import { fromString, toString } from "uint8arrays";
import { createWalletClient, http, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";    
import { getRandomValues } from "node:crypto";
import path from "node:path";
import fs from "node:fs";




// XMTP Utilities
export interface User {
  key: `0x${string}`;
  account: ReturnType<typeof privateKeyToAccount>;
  wallet: ReturnType<typeof createWalletClient>;
}

export const createUser = (key: string): User => {
  const account = privateKeyToAccount(key as `0x${string}`);
  return {
    key: key as `0x${string}`,
    account,
    wallet: createWalletClient({
      account,
      chain: sepolia,
      transport: http(),
    }),
  };
};

export const createSigner = (key: string): Signer => {
  const sanitizedKey = key.startsWith("0x") ? key : `0x${key}`;
  const user = createUser(sanitizedKey);
  return {
    type: "EOA",
    getIdentifier: () => ({
      identifierKind: IdentifierKind.Ethereum,
      identifier: user.account.address.toLowerCase(),
    }),
    signMessage: async (message: string) => {
      const signature = await user.wallet.signMessage({
        message,
        account: user.account,
      });
      return toBytes(signature);
    },
  };
};

export const generateEncryptionKeyHex = () => {
  const uint8Array = getRandomValues(new Uint8Array(32));
  return toString(uint8Array, "hex");
};

export const getEncryptionKeyFromHex = (hex: string) => {
  return fromString(hex, "hex");
};

/**
 * Appends a variable to the .env file
 */

export function validateEnvironment(vars: string[]): Record<string, string> {
  const requiredVars = vars;
  const missing = requiredVars.filter((v) => !process.env[v]);

  // If there are missing vars, try to load them from the root .env file
  if (missing.length) {
    console.log(
      `Missing env vars: ${missing.join(", ")}. Trying root .env file...`,
    );

    // Find the root directory by going up from the current example directory
    const currentDir = process.cwd();
    const rootDir = path.resolve(currentDir, "../..");
    const rootEnvPath = path.join(rootDir, ".env");

    if (fs.existsSync(rootEnvPath)) {
      // Load the root .env file content
      const envContent = fs.readFileSync(rootEnvPath, "utf-8");

      // Parse the .env file content
      const envVars = envContent
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#"))
        .reduce<Record<string, string>>((acc, line) => {
          const [key, ...valueParts] = line.split("=");
          if (key && valueParts.length) {
            acc[key.trim()] = valueParts.join("=").trim();
          }
          return acc;
        }, {});

      // Set the missing environment variables
      for (const varName of missing) {
        if (envVars[varName]) {
          process.env[varName] = envVars[varName];
          console.log(`Loaded ${varName} from root .env file`);
        }
      }
    } else {
      console.log("Root .env file not found.");
    }
  }

  // Check again if there are still missing variables
  const stillMissing = requiredVars.filter((v) => !process.env[v]);
  if (stillMissing.length) {
    console.error(
      "Missing env vars after checking root .env:",
      stillMissing.join(", "),
    );
    process.exit(1);
  }

  return requiredVars.reduce<Record<string, string>>((acc, key) => {
    acc[key] = process.env[key] as string;
    return acc;
  }, {});
}

export const appendToEnv = (key: string, value: string): void => {
  try {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = fs.existsSync(envPath) 
      ? fs.readFileSync(envPath, "utf-8")   
      : "";

    // Update process.env
    if (key in process.env) {
      process.env[key] = value;
    }

    // Escape regex special chars
    const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

    // Update or add the key
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(
        new RegExp(`${escapedKey}=.*(\\r?\\n|$)`, "g"),
        `${key}="${value}"$1`,
      );
    } else {
      envContent += `\n${key}="${value}"\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`Updated .env with ${key}: ${value}`);
  } catch (error) {
    console.error(`Failed to update .env with ${key}:`, error);
  }
};
