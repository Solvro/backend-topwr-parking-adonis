import type { DateTime } from "luxon";

import DiscordWebhookSender from "./discord_webhook_sender.js";
import type { DiscordWebhookRequestInit } from "./discord_webhook_sender.js";

/** Notification type determining the emoji and label in the message title. */
export enum MessageType {
  INFO,
  WARNING,
  ERROR,
}
export interface MessagePayload {
  messageType: MessageType;
  title: string;
  description: string;
  timestamp: DateTime;
}
const MILISECONDS_IN_MINUTE = 60000;

/** Returns the title prefix, such as "❌ [ERROR]", for the notification type. */
function messageTypeToString(messageType: MessageType): string {
  switch (messageType) {
    case MessageType.INFO:
      return "ℹ️ [INFO]";
    case MessageType.WARNING:
      return "⚠️ [WARNING]";
    case MessageType.ERROR:
      return "❌ [ERROR]";
  }
}

export default class DiscordWebhookManager {
  private sender = DiscordWebhookSender.getInstance();

  private discordWebhookMessageBuffor: MessagePayload[];
  private repetitionTimeLimit: DateTime;

  public constructor(repetitionLimit: DateTime) {
    this.discordWebhookMessageBuffor = [];
    this.repetitionTimeLimit = repetitionLimit;
  }

  private hasBeenSend(payload: MessagePayload, timesSpan: DateTime): boolean {
    const { timestamp: payloadTimestamp, ...payloadContent } = payload;

    const hasFlag = this.discordWebhookMessageBuffor.some((value) => {
      const { timestamp: valueTimestamp, ...valueContent } = value;
      const minutesTimeSpan = Math.floor(
        timesSpan.toMillis() / MILISECONDS_IN_MINUTE,
      );
      const minutesdTimeDiff = Math.floor(
        payloadTimestamp.diff(valueTimestamp).toMillis() /
          MILISECONDS_IN_MINUTE,
      );

      return (
        JSON.stringify(payloadContent) === JSON.stringify(valueContent) &&
        minutesdTimeDiff < minutesTimeSpan
      );
    });
    return hasFlag;
  }

  public sendMessage(payload: MessagePayload) {
    const requestInit: DiscordWebhookRequestInit = {
      embeds: [
        {
          title: `${messageTypeToString(payload.messageType)}: ${payload.title}`,
          description: payload.description,
          timestamp: payload.timestamp.toISO() as unknown as string,
        },
      ],
    };
    if (!this.hasBeenSend(payload, this.repetitionTimeLimit)) {
      const res = this.sender.sendWebhook(requestInit);
      this.discordWebhookMessageBuffor.push(payload);

      return res;
    } else {
      throw new Error(
        "Message to Discord was not send due to repetitionTimeLimit. Look for repetitionTimeLimit to change antyspam blocker",
      );
    }
  }
}
