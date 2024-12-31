// tests/unit/background/storage/storage-quota-manager.test.ts

import { StorageQuotaManager } from '../../../../src/background/storage/storage-quota-manager';
import { MessageType } from '../../../../src/common/types/message-types';
import { ErrorType } from '../../../../src/common/errors/types';
import { messageBus } from '../../../../src/background/message-bus';
import { cleanupManager } from '../../../../src/background/storage/cleanup-manager';
import { logger } from '../../../../src/common/utils/debug-logger';

jest.mock('../../../../src/common/utils/debug-logger');
jest.mock('../../../../src/background/message-bus');
jest.mock('../../../../src/background/storage/cleanup-manager');

jest.useFakeTimers();

describe('StorageQuotaManager', () => {
  let storageQuotaManager: StorageQuotaManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    (StorageQuotaManager as any).instance = null;
    (global.navigator as any).storage = { estimate: jest.fn() };

    // Provide a default mock so initialization doesn't throw
    (navigator.storage.estimate as jest.Mock).mockResolvedValue({
      usage: 10 * 1024 * 1024, // 10 MB
      quota: 100 * 1024 * 1024 // 100 MB
    });

    storageQuotaManager = StorageQuotaManager.getInstance();

    (logger.debug as jest.Mock).mockImplementation(() => {});
    (logger.info as jest.Mock).mockImplementation(() => {});
    (logger.warn as jest.Mock).mockImplementation(() => {});
    (logger.error as jest.Mock).mockImplementation(() => {});

    (messageBus.send as jest.Mock).mockResolvedValue({ success: true });
    (cleanupManager.cleanAuditLogs as jest.Mock).mockResolvedValue(10);
    (cleanupManager.cleanSyncMetadata as jest.Mock).mockResolvedValue(5);
    (cleanupManager.estimateStoreSize as jest.Mock).mockResolvedValue(1000);
  });

  afterEach(() => {
    storageQuotaManager.stopPeriodicChecks();
    (global.navigator as any).storage = undefined;
  });

  describe('initialization', () => {
    it('should start periodic checks on initialization', async () => {
      const checkSpy = jest.spyOn(storageQuotaManager as any, 'checkStorageUsage');
      await storageQuotaManager.initialize();
      jest.runOnlyPendingTimers();
      expect(checkSpy).toHaveBeenCalled();
    });
  });

  describe('storage estimation', () => {
    it('should use navigator.storage.estimate when available', async () => {
      await storageQuotaManager.checkStorageUsage();
      expect(navigator.storage.estimate).toHaveBeenCalled();
      expect(cleanupManager.estimateStoreSize).not.toHaveBeenCalled();
    });

    it('should use manual estimation when storage API is not available', async () => {
      (global.navigator as any).storage = undefined;
      await storageQuotaManager.checkStorageUsage();
      expect(cleanupManager.estimateStoreSize).toHaveBeenCalledWith('auditLog');
      expect(cleanupManager.estimateStoreSize).toHaveBeenCalledWith('syncMetadata');
      expect(cleanupManager.estimateStoreSize).toHaveBeenCalledWith('videos');
      expect(cleanupManager.estimateStoreSize).toHaveBeenCalledWith('playlists');
    });
  });

  describe('cleanup operations', () => {
    it('should trigger cleanup when storage is critical', async () => {
      (navigator.storage.estimate as jest.Mock)
        .mockResolvedValueOnce({ usage: 95 * 1024 * 1024, quota: 100 * 1024 * 1024 })
        .mockResolvedValueOnce({ usage: 75 * 1024 * 1024, quota: 100 * 1024 * 1024 });

      await storageQuotaManager.checkStorageUsage();
      expect(messageBus.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.ERROR_STATUS,
          payload: expect.objectContaining({
            errorType: ErrorType.STORAGE_QUOTA,
            component: 'storage',
            details: expect.objectContaining({ level: 'critical' })
          })
        })
      );
      expect(cleanupManager.cleanAuditLogs).toHaveBeenCalled();
      expect(cleanupManager.cleanSyncMetadata).toHaveBeenCalled();
    });

    it('should send warning when storage is approaching limit', async () => {
      (navigator.storage.estimate as jest.Mock).mockResolvedValue({
        usage: 85 * 1024 * 1024,
        quota: 100 * 1024 * 1024
      });

      await storageQuotaManager.checkStorageUsage();
      expect(messageBus.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.ERROR_STATUS,
          payload: expect.objectContaining({
            errorType: ErrorType.STORAGE_QUOTA,
            component: 'storage',
            details: expect.objectContaining({ level: 'warning' })
          })
        })
      );
      expect(cleanupManager.cleanAuditLogs).not.toHaveBeenCalled();
      expect(cleanupManager.cleanSyncMetadata).not.toHaveBeenCalled();
    });
  });
});
