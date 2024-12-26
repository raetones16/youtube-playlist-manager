// tests/unit/background/message-bus.test.ts

import { MessageBus } from '../../../src/background/message-bus';
import { MessageType } from '../../../src/common/types/message-types';
import { chrome } from '../../setup';

type MessageListener = (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
) => void;

describe('MessageBus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // @ts-ignore - accessing private static for testing
        MessageBus.instance = null;
    });

    it('successfully registers and handles messages', async () => {
        const mockHandler = jest.fn().mockResolvedValue({ success: true });
        const bus = MessageBus.getInstance();
        bus.register(MessageType.SYNC_REQUEST, mockHandler);

        const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0] as MessageListener;
        const sendResponse = jest.fn();

        const message = {
            type: MessageType.SYNC_REQUEST,
            payload: {
                playlistId: 'test-playlist',
                force: true
            }
        };

        listener(message, {}, sendResponse);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockHandler).toHaveBeenCalledWith(message.payload, {});
        expect(sendResponse).toHaveBeenCalledWith({
            success: true,
            data: [{ success: true }],
            error: undefined
        });
    });

    it('handles failed message handlers', async () => {
        const bus = MessageBus.getInstance();
        const failingHandler = jest.fn().mockRejectedValue(new Error('Handler failed'));
        bus.register(MessageType.SYNC_REQUEST, failingHandler);

        const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0] as MessageListener;
        const sendResponse = jest.fn();

        const message = {
            type: MessageType.SYNC_REQUEST,
            payload: {
                playlistId: 'test-playlist',
                force: true
            }
        };

        listener(message, {}, sendResponse);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(sendResponse).toHaveBeenCalledWith({
            success: false,
            error: 'Handler failed'
        });
    });
});