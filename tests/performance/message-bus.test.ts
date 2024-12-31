// tests/performance/message-bus.test.ts

import { messageBus } from '../../src/background/message-bus';
import { chrome } from '../setup';
import { Message, MessageType } from '../../src/common/types/message-types';

type MessageListener = (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
) => void | boolean;

describe('Message Bus Performance', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup message handling mock
        (chrome.runtime.sendMessage as jest.Mock).mockImplementation((message) => {
            const listener = chrome.runtime.onMessage.addListener.mock.calls[0]?.[0] as MessageListener;
            if (typeof listener === 'function') {
                return new Promise(resolve => {
                    listener(message, { id: 'test-sender' }, resolve);
                });
            }
            return Promise.resolve({ success: false });
        });

        // Re-initialize messageBus listener
        // @ts-ignore - accessing private for testing
        messageBus['setupMessageListener']();
    });

    it('should handle high message throughput efficiently', async () => {
        const MESSAGE_COUNT = 1000;
        const receivedMessages: any[] = [];

        // Setup message handler
        messageBus.register(MessageType.VIDEO_STATUS_UPDATED, (payload) => {
            receivedMessages.push(payload);
            return Promise.resolve({ success: true });
        });

        // Create batch of test messages
        const messages: Message<MessageType.VIDEO_STATUS_UPDATED>[] = Array(MESSAGE_COUNT)
            .fill(null)
            .map((_, index) => ({
                type: MessageType.VIDEO_STATUS_UPDATED,
                payload: {
                    videoId: `video-${index}`,
                    status: 'UNAVAILABLE',
                    reason: 'REMOVED'
                }
            }));

        // Measure performance of batch processing
        const startTime = Date.now();
        await Promise.all(messages.map(msg => messageBus.send(msg)));
        const operationTime = Date.now() - startTime;

        console.log(`
Performance Results:
-----------------
Messages processed: ${MESSAGE_COUNT}
Total time: ${operationTime}ms
Average time per message: ${(operationTime / MESSAGE_COUNT).toFixed(2)}ms
Messages per second: ${Math.round(1000 / (operationTime / MESSAGE_COUNT))}
        `);

        // Verify all messages were processed
        expect(receivedMessages).toHaveLength(MESSAGE_COUNT);
        expect(operationTime).toBeLessThan(2000); // Should process 1000 messages in under 2 seconds
    });

    it('should maintain message ordering in sequential processing', async () => {
        const MESSAGE_COUNT = 100;
        const receivedOrder: string[] = [];
    
        // Setup message handler
        messageBus.register(MessageType.VIDEO_STATUS_UPDATED, (payload) => {
            receivedOrder.push(payload.videoId);
            return Promise.resolve({ success: true });
        });
    
        // Send messages in sequence
        const startTime = Date.now();
        for (let i = 0; i < MESSAGE_COUNT; i++) {
            await messageBus.send({
                type: MessageType.VIDEO_STATUS_UPDATED,
                payload: {
                    videoId: `video-${i}`, // Use videoId to track order
                    status: 'UNAVAILABLE',
                    reason: 'REMOVED'
                }
            });
        }
        const operationTime = Date.now() - startTime;
    
        console.log(`
    Sequential Processing Results:
    --------------------------
    Messages processed: ${MESSAGE_COUNT}
    Total time: ${operationTime}ms
    Average time per message: ${(operationTime / MESSAGE_COUNT).toFixed(2)}ms
    Messages per second: ${Math.round(1000 / (operationTime / MESSAGE_COUNT))}
        `);
    
        // Verify messages were processed in order
        expect(receivedOrder).toEqual(
            Array.from({ length: MESSAGE_COUNT }, (_, i) => `video-${i}`)
        );
        expect(operationTime).toBeLessThan(1000);
    });
});