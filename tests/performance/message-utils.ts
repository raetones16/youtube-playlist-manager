// tests/performance/message-utils.ts

export const setupMessagePassing = () => {
    const listeners: Array<(message: any, sender: any, sendResponse: any) => void> = [];

    console.log('Setting up message passing utilities');

    const mockImplementation = (callback: any) => {
        console.log('addListener called with callback');
        listeners.push(callback);
        console.log(`Listeners array updated - count: ${listeners.length}`);
        return true;
    };

    // Set up the mock with our implementation
    (chrome.runtime.onMessage.addListener as jest.Mock).mockImplementation(mockImplementation);

    console.log('Mock implementations set up');

    return {
        clearListeners: () => {
            console.log('Clearing listeners - count before:', listeners.length);
            listeners.length = 0;
            console.log('Listeners cleared - count after:', listeners.length);
            // Re-implement the mock after clearing
            (chrome.runtime.onMessage.addListener as jest.Mock).mockImplementation(mockImplementation);
        },
        getListenerCount: () => {
            const count = listeners.length;
            console.log('Getting listener count:', count);
            return count;
        }
    };
};