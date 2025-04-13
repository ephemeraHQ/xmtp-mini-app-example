import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("3000"),

  // API Security
  API_SECRET_KEY: z.string().min(1),

  // XMTP
  XMTP_PRIVATE_KEY: z.string().min(1),
  XMTP_ENCRYPTION_KEY: z.string().optional(),
  XMTP_ENV: z.enum(["dev", "local", "production"]).default("dev"),
  XMTP_DEFAULT_CONVERSATION_ID: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
