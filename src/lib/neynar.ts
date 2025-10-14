import ky from "ky";
import { NeynarUser } from "@/lib/types";
import { env } from "./env";

/**
 * Fetches a user from Neynar
 */
export const fetchUserFromNeynar = async (fid: string): Promise<NeynarUser> => {
  const data = (await ky
    .get(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: {
        "x-api-key": env.NEYNAR_API_KEY,
      },
    })
    .json()) as { users: NeynarUser[] };

  return data.users[0];
};
