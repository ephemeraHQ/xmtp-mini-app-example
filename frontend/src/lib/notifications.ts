import { sendNotificationResponseSchema } from "@farcaster/frame-sdk";
import ky from "ky";
import { env } from "@/lib/env";

const appUrl = env.NEXT_PUBLIC_URL;

type SendFrameNotificationResult =
  | { state: "error"; error: unknown }
  | { state: "no_token" }
  | { state: "success" };

/**
 * Send a frame notification
 */
export async function sendFrameNotification({
  notificationDetails,
  title,
  body,
}: {
  notificationDetails: {
    token: string;
    url: string;
  };
  title: string;
  body: string;
}): Promise<SendFrameNotificationResult> {
  if (!notificationDetails?.token || !notificationDetails?.url) {
    return { state: "no_token" };
  }

  try {
    const response = await ky.post(notificationDetails.url, {
      json: {
        notificationId: crypto.randomUUID(),
        title,
        body,
        targetUrl: appUrl,
        tokens: [notificationDetails.token],
      },
    });

    const responseJson = await response.json();
    return { state: "success" };
  } catch (error) {
    return { state: "error", error };
  }
}
