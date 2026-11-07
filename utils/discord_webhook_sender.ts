import env from "#start/env";

export interface DiscordWebhookRequestInit {
  embeds: DiscordWebhookPayload[];
}
// Can be extended by fields supported by Discord Api.
interface DiscordWebhookPayload {
  title: string;
  description?: string;
  /** Event time as an ISO 8601 string, e.g. "2026-11-06T12:00:00Z". */
  timestamp?: string;
}

/**
 * Sends Discord notifications with one embed per message.
 *
 * Requires the `DISORD_WEBHOOK_URL` environment variable with the webhook URL.
 * The URL is read on the first send and reused for subsequent calls.
 * Methods return the HTTP response; callers should check `response.ok`.
 *
 * @example
 * ```ts
 * import DiscordWebhookSender, { MessageType } from "./discord_webhook_sender.js";
 * import { DateTime } from "luxon";
 *
 * const response = await DiscordWebhookSender.sendMessage(
 *   MessageType.INFO,
 *   "Parking synchronization",
 *   "Parking data has been updated.",
 *   DateTime.now(),
 * );
 *
 * if (!response.ok) {
 *   throw new Error(`Failed to send notification: ${response.status}`);
 * }
 * ```
 */
export default class DiscordWebhookSender {
  private static instance: DiscordWebhookSender | undefined;

  private static url: string;

  private constructor() {
    DiscordWebhookSender.url = env.get(
      "DISORD_WEBHOOK_URL",
    ) as unknown as string;
  }
  public static getInstance(): DiscordWebhookSender {
    DiscordWebhookSender.instance ??= new DiscordWebhookSender();
    return DiscordWebhookSender.instance;
  }

  /**
   * Sends a POST request with an embed containing the title, body, and event time.
   * Adds an emoji and an INFO, WARNING, or ERROR label to the title.
   * Accepts the event time as an ISO 8601 string.
   *
   * @param messageType - Notification type determining the title prefix.
   * @param title - Notification title without the type prefix.
   * @param description - Notification body.
   * @param timestamp - Event time as an ISO 8601 string, e.g. "2026-11-06T12:00:00Z".
   * @returns The webhook's HTTP response. Status codes 4xx and 5xx do not throw;
   * callers should check `response.ok` or `response.status`.
   * @throws If the fetch request fails, for example due to a network error
   * or an invalid webhook URL.
   */

  public async sendWebhook(
    requestInit: DiscordWebhookRequestInit,
  ): Promise<Response> {
    DiscordWebhookSender.getInstance();

    const res = await fetch(DiscordWebhookSender.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestInit),
    });
    return res;
  }
}
