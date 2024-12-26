// src/background/message-bus.ts

import { Message, MessageType, MessageHandler, MessageResponse } from '../common/types/message-types';

export class MessageBus {
    private static instance: MessageBus;
    private handlers: Map<MessageType, MessageHandler<any>[]> = new Map();

    private constructor() {
        this.setupMessageListener();
    }

    static getInstance(): MessageBus {
        if (!MessageBus.instance) {
            MessageBus.instance = new MessageBus();
        }
        return MessageBus.instance;
    }

    private setupMessageListener(): void {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender)
                .then(sendResponse)
                .catch(error => {
                    console.error('Message handling error:', error);
                    sendResponse({
                        success: false,
                        error: error.message
                    });
                });
            return true; // Indicates async response
        });
    }

    private async handleMessage(
        message: Message<any>,
        sender: chrome.runtime.MessageSender
    ): Promise<MessageResponse<any>> {
        const handlers = this.handlers.get(message.type) || [];
        
        if (handlers.length === 0) {
            console.warn(`No handlers registered for message type: ${message.type}`);
            return { success: false, error: 'No handler registered' };
        }

        try {
            const results = await Promise.all(
                handlers.map(handler => handler(message.payload, sender))
            );

            // If any handler was successful, consider the message handled
            const success = results.some(result => result?.success);
            
            return {
                success,
                data: results,
                error: success ? undefined : 'All handlers failed'
            };
        } catch (error) {
            console.error(`Error handling message type ${message.type}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    register<T extends MessageType>(
        type: T,
        handler: MessageHandler<T>
    ): void {
        const handlers = this.handlers.get(type) || [];
        handlers.push(handler);
        this.handlers.set(type, handlers);
    }

    unregister<T extends MessageType>(
        type: T,
        handler: MessageHandler<T>
    ): void {
        const handlers = this.handlers.get(type) || [];
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
            if (handlers.length === 0) {
                this.handlers.delete(type);
            } else {
                this.handlers.set(type, handlers);
            }
        }
    }

    async send<T extends MessageType>(
        message: Message<T>
    ): Promise<MessageResponse<T>> {
        try {
            const response = await chrome.runtime.sendMessage(message);
            return response as MessageResponse<T>;
        } catch (error) {
            console.error('Error sending message:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send message'
            };
        }
    }

    async sendToTab<T extends MessageType>(
        tabId: number,
        message: Message<T>
    ): Promise<MessageResponse<T>> {
        try {
            const response = await chrome.tabs.sendMessage(tabId, message);
            return response as MessageResponse<T>;
        } catch (error) {
            console.error('Error sending message to tab:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send message to tab'
            };
        }
    }
}

export const messageBus = MessageBus.getInstance();