/**
 * CanvasNode 组件
 * 参照 n8n 的 CanvasNode.vue 实现
 * 这是画布节点的主容器组件，包含工具栏、连接点和节点渲染器
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { CanvasNodeRenderer } from '../CanvasNodeRenderer';
import { CanvasNodeToolbar } from './CanvasNodeToolbar';
import { CanvasHandleRenderer } from './CanvasHandleRenderer';
import type { CanvasNodeData, CanvasNodeRenderType } from './canvas.types';

export interface CanvasNodeProps {
  id: string;
  data: CanvasNodeData;
  selected?: boolean;
  readOnly?: boolean;
  hovered?: boolean;
  nearbyHovered?: boolean;
  nodeTypeInfo?: any;
  subtitle?: string;
  hasError?: boolean;
  hasPinnedData?: boolean;
  executionStatus?: 'success' | 'error' | 'running' | 'waiting' | 'unknown' | null;
  executionWaiting?: string | null;
  executionRunning?: boolean;
  hasRunData?: boolean;
  hasExecutionErrors?: boolean;
  hasValidationErrors?: boolean;
  executionErrors?: string[];
  validationErrors?: string[];
  runDataIterations?: number;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  retryOnFail?: boolean;
  onError?: 'continueRegularOutput' | 'continueErrorOutput';
  mainInputsCount?: number;
  mainOutputsCount?: number;
  isExperimentalNdvActive?: boolean;
  onAdd?: (id: string, handle: string) => void;
  onDelete?: (id: string) => void;
  onRun?: (id: string) => void;
  onSelect?: (id: string, selected: boolean) => void;
  onToggle?: (id: string) => void;
  onActivate?: (id: string, event: React.MouseEvent) => void;
  onDeactivate?: (id: string) => void;
  onOpenContextMenu?: (id: string, event: React.MouseEvent, source: 'node-button' | 'node-right-click') => void;
  onUpdate?: (id: string, parameters: Record<string, unknown>) => void;
  onUpdateInputs?: (id: string) => void;
  onUpdateOutputs?: (id: string) => void;
  onMove?: (id: string, position: { x: number; y: number }) => void;
  onFocus?: (id: string) => void;
  connectingHandle?: {
    nodeId: string;
    handleType: 'source' | 'target';
    handleId: string;
  } | null;
  isValidConnection?: (connection: any) => boolean;
}

export const CanvasNode: React.FC<CanvasNodeProps> = ({
  id,
  data,
  selected = false,
  readOnly = false,
  hovered = false,
  nearbyHovered = false,
  nodeTypeInfo,
  subtitle,
  hasError = false,
  hasPinnedData = false,
  executionStatus = null,
  executionWaiting = null,
  executionRunning = false,
  hasRunData = false,
  hasExecutionErrors = false,
  hasValidationErrors = false,
  executionErrors = [],
  validationErrors = [],
  runDataIterations = 1,
  alwaysOutputData = false,
  executeOnce = false,
  retryOnFail = false,
  onError,
  mainInputsCount = 0,
  mainOutputsCount = 0,
  isExperimentalNdvActive = false,
  onAdd,
  onDelete,
  onRun,
  onSelect,
  onToggle,
  onActivate,
  onDeactivate,
  onOpenContextMenu,
  onUpdate,
  onUpdateInputs,
  onUpdateOutputs,
  onMove,
  onFocus,
  connectingHandle,
  isValidConnection,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  // 计算节点类名
  const nodeClasses = useMemo(() => {
    const classes = ['canvas-node'];
    if (selected) classes.push('selected');
    if (hovered) classes.push('hovered');
    return classes.join(' ');
  }, [selected, hovered]);

  // 计算 data-test-id
  const dataTestId = useMemo(() => {
    const renderType = data.render?.type;
    if (['stickyNote', 'addNodes', 'choicePrompt'].includes(renderType || '')) {
      return undefined;
    }
    return 'canvas-node';
  }, [data.render?.type]);

  // 处理添加连接
  const handleAdd = useCallback((handle: string) => {
    onAdd?.(id, handle);
  }, [id, onAdd]);

  // 处理删除
  const handleDelete = useCallback(() => {
    onDelete?.(id);
  }, [id, onDelete]);

  // 处理运行
  const handleRun = useCallback(() => {
    onRun?.(id);
  }, [id, onRun]);

  // 处理切换禁用
  const handleToggle = useCallback(() => {
    onToggle?.(id);
  }, [id, onToggle]);

  // 处理激活
  const handleActivate = useCallback((event: React.MouseEvent) => {
    onActivate?.(id, event);
  }, [id, onActivate]);

  // 处理停用
  const handleDeactivate = useCallback(() => {
    onDeactivate?.(id);
  }, [id, onDeactivate]);

  // 处理工具栏上下文菜单
  const handleOpenContextMenuFromToolbar = useCallback((event: React.MouseEvent) => {
    onOpenContextMenu?.(id, event, 'node-button');
  }, [id, onOpenContextMenu]);

  // 处理节点上下文菜单
  const handleOpenContextMenuFromNode = useCallback((event: React.MouseEvent) => {
    onOpenContextMenu?.(id, event, 'node-right-click');
  }, [id, onOpenContextMenu]);

  // 处理更新
  const handleUpdate = useCallback((parameters: Record<string, unknown>) => {
    onUpdate?.(id, parameters);
  }, [id, onUpdate]);

  // 处理移动
  const handleMove = useCallback((position: { x: number; y: number }) => {
    onMove?.(id, position);
  }, [id, onMove]);

  // 处理聚焦
  const handleFocus = useCallback(() => {
    onFocus?.(id);
  }, [id, onFocus]);

  // 计算输入连接点
  const inputs = data.inputs || [];
  const outputs = data.outputs || [];
  const connections = data.connections || {};

  // 映射输入连接点
  // 连接结构：connections.input[connectionType][inputIndex] = [{ node, type, index }]
  const mappedInputs = useMemo(() => {
    return inputs.map((input, index) => {
      const handleId = `input-${input.type}-${input.index}`;
      const handleType = 'target';
      
      // 计算连接数量：从 connections.input[type][index] 获取数组长度
      let connectionsCount = 0;
      if (connections.input && connections.input[input.type] && connections.input[input.type][input.index]) {
        const connArray = connections.input[input.type][input.index];
        connectionsCount = Array.isArray(connArray) ? connArray.length : 0;
      }
      
      const isConnecting = connectingHandle?.nodeId === id && 
                         connectingHandle?.handleType === handleType && 
                         connectingHandle?.handleId === handleId;

      return {
        ...input,
        handleId,
        connectionsCount,
        isConnecting,
        position: input.position || 'left',
        offset: input.offset || {},
      };
    });
  }, [inputs, connections, connectingHandle, id]);

  // 映射输出连接点
  // 连接结构：connections.output[connectionType][outputIndex] = [{ node, type, index }]
  const mappedOutputs = useMemo(() => {
    return outputs.map((output, index) => {
      const handleId = `output-${output.type}-${output.index}`;
      const handleType = 'source';
      
      // 计算连接数量：从 connections.output[type][index] 获取数组长度
      let connectionsCount = 0;
      if (connections.output && connections.output[output.type] && connections.output[output.type][output.index]) {
        const connArray = connections.output[output.type][output.index];
        connectionsCount = Array.isArray(connArray) ? connArray.length : 0;
      }
      
      const isConnecting = connectingHandle?.nodeId === id && 
                         connectingHandle?.handleType === handleType && 
                         connectingHandle?.handleId === handleId;

      return {
        ...output,
        handleId,
        connectionsCount,
        isConnecting,
        position: output.position || 'right',
        offset: output.offset || {},
      };
    });
  }, [outputs, connections, connectingHandle, id]);

  // 判断是否有工具栏
  const hasToolbar = useMemo(() => {
    const renderType = data.render?.type;
    return !['addNodes', 'choicePrompt'].includes(renderType || '');
  }, [data.render?.type]);

  return (
    <div
      ref={nodeRef}
      className={nodeClasses}
      data-test-id={dataTestId}
      data-node-name={data.name}
      data-node-type={data.type}
    >
      {/* 输出连接点 */}
      {mappedOutputs.map((output, index) => (
        <CanvasHandleRenderer
          key={`${output.handleId}(${index + 1}/${mappedOutputs.length})`}
          {...output}
          mode="output"
          isReadOnly={readOnly}
          isValidConnection={isValidConnection || (() => true)}
          dataNodeName={data.name}
          dataTestId="canvas-node-output-handle"
          dataIndex={output.index}
          dataConnectionType={output.type}
          onAdd={handleAdd}
        />
      ))}

      {/* 输入连接点 */}
      {mappedInputs.map((input, index) => (
        <CanvasHandleRenderer
          key={`${input.handleId}(${index + 1}/${mappedInputs.length})`}
          {...input}
          mode="input"
          isReadOnly={readOnly}
          isValidConnection={isValidConnection || (() => true)}
          dataTestId="canvas-node-input-handle"
          dataIndex={input.index}
          dataConnectionType={input.type}
          dataNodeName={data.name}
          onAdd={handleAdd}
        />
      ))}

      {/* 工具栏 */}
      {hasToolbar && (
        <CanvasNodeToolbar
          dataTestId="canvas-node-toolbar"
          readOnly={readOnly}
          className="canvas-node-toolbar"
          showStatusIcons={false}
          itemsClass="canvas-node-toolbar-items"
          onDelete={handleDelete}
          onToggle={handleToggle}
          onRun={handleRun}
          onUpdate={handleUpdate}
          onOpenContextMenu={handleOpenContextMenuFromToolbar}
          onFocus={handleFocus}
        />
      )}

      {/* 节点渲染器 */}
      <CanvasNodeRenderer
        node={data}
        nodeTypeInfo={nodeTypeInfo}
        subtitle={subtitle}
        isSelected={selected}
        isDisabled={data.disabled}
        hasError={hasError}
        hasPinnedData={hasPinnedData}
        executionStatus={executionStatus}
        executionWaiting={executionWaiting}
        executionRunning={executionRunning}
        hasRunData={hasRunData}
        hasExecutionErrors={hasExecutionErrors}
        hasValidationErrors={hasValidationErrors}
        executionErrors={executionErrors}
        validationErrors={validationErrors}
        runDataIterations={runDataIterations}
        onActivate={handleActivate}
        onDeactivate={handleDeactivate}
        onMove={handleMove}
        onUpdate={handleUpdate}
        onOpenContextMenu={handleOpenContextMenuFromNode}
        onDelete={handleDelete}
        alwaysOutputData={alwaysOutputData}
        executeOnce={executeOnce}
        retryOnFail={retryOnFail}
        onError={onError}
        mainInputsCount={mainInputsCount}
        mainOutputsCount={mainOutputsCount}
        isExperimentalNdvActive={isExperimentalNdvActive}
      />
    </div>
  );
};

