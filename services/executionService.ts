/**
 * 工作流执行服务
 * 处理工作流的执行、状态轮询和日志获取
 * 直接使用 n8n 的数据结构
 */

import { executionApi, Execution, workflowApi } from './n8nApi';

export interface ExecutionStatus {
  id: string;
  status: 'success' | 'error' | 'waiting' | 'running' | 'canceled';
  finished: boolean;
  startedAt: string;
  stoppedAt?: string;
  duration?: number;
  data?: any;
  error?: any;
}

/**
 * 执行服务类
 */
export class ExecutionService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private pollingCallbacks: Map<string, (status: ExecutionStatus) => void> = new Map();

  /**
   * 执行工作流
   * @param workflowId 工作流 ID
   * @param inputData 输入数据（可选）
   * @returns 执行 ID
   */
  async executeWorkflow(workflowId: string, inputData?: any): Promise<string> {
    try {
      const response = await workflowApi.execute(workflowId, inputData);
      return response.data?.executionId || response.data?.id || response.executionId || response.id;
    } catch (error: any) {
      console.error('执行工作流失败:', error);
      throw new Error(error.response?.data?.message || '执行工作流失败');
    }
  }

  /**
   * 开始轮询执行状态
   * @param executionId 执行 ID
   * @param onUpdate 状态更新回调
   * @param interval 轮询间隔（毫秒），默认 1000ms
   */
  startPolling(
    executionId: string,
    onUpdate: (status: ExecutionStatus) => void,
    interval: number = 1000
  ): void {
    // 如果已经在轮询，先停止
    if (this.pollingIntervals.has(executionId)) {
      this.stopPolling(executionId);
    }

    // 保存回调
    this.pollingCallbacks.set(executionId, onUpdate);

    // 立即执行一次
    this.pollExecution(executionId);

    // 设置轮询
    const intervalId = setInterval(() => {
      this.pollExecution(executionId);
    }, interval);

    this.pollingIntervals.set(executionId, intervalId);
  }

  /**
   * 停止轮询
   * @param executionId 执行 ID
   */
  stopPolling(executionId: string): void {
    const intervalId = this.pollingIntervals.get(executionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(executionId);
    }
    this.pollingCallbacks.delete(executionId);
  }

  /**
   * 停止所有轮询
   */
  stopAllPolling(): void {
    this.pollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();
    this.pollingCallbacks.clear();
  }

  /**
   * 轮询执行状态
   * @param executionId 执行 ID
   */
  private async pollExecution(executionId: string): Promise<void> {
    try {
      const execution = await executionApi.get(executionId);

      const status: ExecutionStatus = {
        id: execution.id,
        status: execution.status as any,
        finished: execution.finished,
        startedAt: execution.startedAt,
        stoppedAt: execution.stoppedAt,
        duration: execution.stoppedAt
          ? new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime()
          : undefined,
        data: execution.data,
        error: execution.status === 'error' ? execution.data : undefined,
      };

      // 调用回调
      const callback = this.pollingCallbacks.get(executionId);
      if (callback) {
        callback(status);
      }

      // 如果执行完成，停止轮询
      if (execution.finished) {
        this.stopPolling(executionId);
      }
    } catch (error: any) {
      console.error('轮询执行状态失败:', error);
      // 如果是 404，说明执行不存在，停止轮询
      if (error.response?.status === 404) {
        this.stopPolling(executionId);
      }
    }
  }

  /**
   * 获取执行详情
   * @param executionId 执行 ID
   * @returns 执行状态
   */
  async getExecution(executionId: string): Promise<ExecutionStatus> {
    try {
      const execution = await executionApi.get(executionId);

      return {
        id: execution.id,
        status: execution.status as any,
        finished: execution.finished,
        startedAt: execution.startedAt,
        stoppedAt: execution.stoppedAt,
        duration: execution.stoppedAt
          ? new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime()
          : undefined,
        data: execution.data,
        error: execution.status === 'error' ? execution.data : undefined,
      };
    } catch (error: any) {
      console.error('获取执行详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取执行历史列表
   * @param filters 过滤条件
   * @returns 执行列表
   */
  async getExecutionHistory(filters?: {
    workflowId?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<Execution[]> {
    try {
      const response = await executionApi.list(filters);
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error('获取执行历史失败:', error);
      throw error;
    }
  }

  /**
   * 删除执行记录
   * @param executionId 执行 ID
   */
  async deleteExecution(executionId: string): Promise<void> {
    try {
      await executionApi.delete(executionId);
    } catch (error: any) {
      console.error('删除执行记录失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const executionService = new ExecutionService();
