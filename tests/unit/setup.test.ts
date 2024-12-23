import { chrome } from '../../tests/setup';

describe('Test Setup', () => {
  it('should have Chrome APIs mocked', () => {
    expect(chrome.runtime.sendMessage).toBeDefined();
    expect(chrome.storage.local.get).toBeDefined();
    expect(chrome.identity.getAuthToken).toBeDefined();
  });

  it('should be able to track mock calls', () => {
    chrome.runtime.sendMessage({type: 'TEST'});
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({type: 'TEST'});
  });
});