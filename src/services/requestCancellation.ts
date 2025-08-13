/**
 * Request Cancellation Manager
 * Handles AbortController for request cancellation and cleanup
 */

export interface CancellableRequest {
  id: string;
  controller: AbortController;
  url: string;
  method: string;
  timestamp: number;
}

export class RequestCancellationManager {
  private static instance: RequestCancellationManager;
  private activeRequests = new Map<string, CancellableRequest>();
  private requestGroups = new Map<string, Set<string>>();

  private constructor() {
    // Cleanup old requests periodically
    setInterval(() => {
      this.cleanupExpiredRequests();
    }, 30000); // Clean every 30 seconds
  }

  static getInstance(): RequestCancellationManager {
    if (!RequestCancellationManager.instance) {
      RequestCancellationManager.instance = new RequestCancellationManager();
    }
    return RequestCancellationManager.instance;
  }

  /**
   * Create a new cancellable request
   */
  createRequest(url: string, method: string, groupId?: string): CancellableRequest {
    const controller = new AbortController();
    const requestId = this.generateRequestId();
    
    const request: CancellableRequest = {
      id: requestId,
      controller,
      url,
      method: method.toUpperCase(),
      timestamp: Date.now(),
    };

    this.activeRequests.set(requestId, request);

    // Add to group if specified
    if (groupId) {
      if (!this.requestGroups.has(groupId)) {
        this.requestGroups.set(groupId, new Set());
      }
      this.requestGroups.get(groupId)!.add(requestId);
    }

    if (__DEV__) {
      console.log(`📝 Created request: ${requestId} (${method} ${url})`);
    }

    return request;
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(requestId: string, reason = 'Request cancelled'): boolean {
    const request = this.activeRequests.get(requestId);
    
    if (!request) {
      return false;
    }

    request.controller.abort();
    this.activeRequests.delete(requestId);

    // Remove from groups
    this.removeFromGroups(requestId);

    if (__DEV__) {
      console.log(`❌ Cancelled request: ${requestId} - ${reason}`);
    }

    return true;
  }

  /**
   * Cancel all requests in a group (e.g., screen-specific requests)
   */
  cancelRequestGroup(groupId: string, reason = 'Group cancelled'): number {
    const requestIds = this.requestGroups.get(groupId);
    
    if (!requestIds || requestIds.size === 0) {
      return 0;
    }

    let cancelledCount = 0;
    
    requestIds.forEach(requestId => {
      if (this.cancelRequest(requestId, reason)) {
        cancelledCount++;
      }
    });

    this.requestGroups.delete(groupId);

    if (__DEV__) {
      console.log(`❌ Cancelled ${cancelledCount} requests in group: ${groupId}`);
    }

    return cancelledCount;
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(reason = 'All requests cancelled'): number {
    const totalRequests = this.activeRequests.size;
    
    this.activeRequests.forEach(request => {
      request.controller.abort();
    });

    this.activeRequests.clear();
    this.requestGroups.clear();

    if (__DEV__) {
      console.log(`❌ Cancelled all ${totalRequests} requests - ${reason}`);
    }

    return totalRequests;
  }

  /**
   * Complete a request (remove from tracking)
   */
  completeRequest(requestId: string): void {
    const request = this.activeRequests.get(requestId);
    
    if (request) {
      this.activeRequests.delete(requestId);
      this.removeFromGroups(requestId);

      if (__DEV__) {
        const duration = Date.now() - request.timestamp;
        console.log(`✅ Completed request: ${requestId} (${duration}ms)`);
      }
    }
  }

  /**
   * Get active request count
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Get active requests for a specific group
   */
  getGroupRequestCount(groupId: string): number {
    const requestIds = this.requestGroups.get(groupId);
    return requestIds ? requestIds.size : 0;
  }

  /**
   * Check if a request is still active
   */
  isRequestActive(requestId: string): boolean {
    return this.activeRequests.has(requestId);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Remove request from all groups
   */
  private removeFromGroups(requestId: string): void {
    this.requestGroups.forEach((requestIds, groupId) => {
      if (requestIds.has(requestId)) {
        requestIds.delete(requestId);
        if (requestIds.size === 0) {
          this.requestGroups.delete(groupId);
        }
      }
    });
  }

  /**
   * Clean up expired requests (older than 5 minutes)
   */
  private cleanupExpiredRequests(): void {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const expiredRequestIds: string[] = [];

    this.activeRequests.forEach((request, requestId) => {
      if (request.timestamp < fiveMinutesAgo) {
        expiredRequestIds.push(requestId);
      }
    });

    expiredRequestIds.forEach(requestId => {
      this.cancelRequest(requestId, 'Request expired');
    });

    if (__DEV__ && expiredRequestIds.length > 0) {
      console.log(`🧹 Cleaned up ${expiredRequestIds.length} expired requests`);
    }
  }
}

export const requestCancellationManager = RequestCancellationManager.getInstance();

/**
 * React hook for automatic request cleanup on component unmount
 */
export const useRequestCancellation = (groupId: string) => {
  const { useEffect } = require('react');
  
  useEffect(() => {
    return () => {
      // Cancel all requests for this component/screen when unmounting
      requestCancellationManager.cancelRequestGroup(groupId, 'Component unmounted');
    };
  }, [groupId]);

  return {
    cancelGroup: (reason?: string) => 
      requestCancellationManager.cancelRequestGroup(groupId, reason),
    getActiveCount: () => 
      requestCancellationManager.getGroupRequestCount(groupId),
  };
};
