// src/common/utils/message-utils.ts

import { Message, MessageType, MessagePayload } from '../types/message-types';

export function createMessage<T extends MessageType>(
    type: T,
    payload: MessagePayload[T]
): Message<T> {
    return { type, payload };
}

// Helper to ensure type safety when registering handlers
export function createHandler<T extends MessageType>(
    type: T,
    handler: (payload: MessagePayload[T], sender: chrome.runtime.MessageSender) => Promise<any>
) {
    return { type, handler };
}

// Example usage:
// const message = createMessage(MessageType.VIDEO_ADDED, {
//     videoId: 'abc123',
//     playlistId: 'xyz789',
//     timestamp: Date.now()
// });
//
// const handler = createHandler(MessageType.VIDEO_ADDED, async (payload, sender) => {
//     // TypeScript knows payload has videoId, playlistId, and timestamp
//     return { success: true };
// });