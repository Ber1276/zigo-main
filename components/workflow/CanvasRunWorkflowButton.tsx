/**
 * CanvasRunWorkflowButton 组件
 * 基于 n8n 的 CanvasRunWorkflowButton.vue 转换
 */

import React, { useMemo } from 'react';
import { FlaskConical, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { KeyboardShortcutTooltip } from '../ui/KeyboardShortcutTooltip';
import { ActionDropdown } from '../ui/ActionDropdown';
import { Text } from '../ui/Text';
import { NodeIcon } from './NodeIcon';
import type { WorkflowNode as N8nWorkflowNode } from '../../types';
import type { NodeTypeInfo } from '../../services/workflowEditorService';

export interface CanvasRunWorkflowButtonProps {
  selectedTriggerNodeName?: string;
  triggerNodes: N8nWorkflowNode[];
  waitingForWebhook?: boolean;
  executing?: boolean;
  disabled?: boolean;
  hideTooltip?: boolean;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  includeChatTrigger?: boolean;
  getNodeType: (type: string, typeVersion: number) => NodeTypeInfo | null;
  onExecute: () => void;
  onSelectTriggerNode: (name: string) => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
}

// 截断字符串，保留最后 N 个字符
const truncateBeforeLast = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return `...${str.slice(-maxLength)}`;
};

// 判断是否为 Chat 节点
const isChatNode = (node: N8nWorkflowNode): boolean => {
  return node.type?.toLowerCase().includes('chat') || false;
};

export const CanvasRunWorkflowButton: React.FC<CanvasRunWorkflowButtonProps> = ({
  selectedTriggerNodeName,
  triggerNodes,
  waitingForWebhook = false,
  executing = false,
  disabled = false,
  hideTooltip = false,
  label: customLabel,
  size = 'large',
  includeChatTrigger = false,
  getNodeType,
  onExecute,
  onSelectTriggerNode,
  onMouseEnter,
  onMouseLeave,
}) => {
  // 过滤可选择的触发节点
  const selectableTriggerNodes = useMemo(() => {
    return triggerNodes.filter(
      (node) => !node.disabled && (includeChatTrigger ? true : !isChatNode(node))
    );
  }, [triggerNodes, includeChatTrigger]);

  // 计算按钮标签
  const label = useMemo(() => {
    if (!executing) {
      return customLabel || 'Execute Workflow';
    }
    if (waitingForWebhook) {
      return 'Waiting for Trigger Event';
    }
    return 'Executing Workflow...';
  }, [executing, waitingForWebhook, customLabel]);

  // 计算下拉菜单项
  const actions = useMemo(() => {
    return triggerNodes
      .filter((node) => (includeChatTrigger ? true : !isChatNode(node)))
      .slice()
      .sort((a, b) => {
        const [aX, aY] = a.position || [0, 0];
        const [bX, bY] = b.position || [0, 0];
        return aY === bY ? aX - bX : aY - bY;
      })
      .map((node) => ({
        id: node.name,
        label: truncateBeforeLast(node.name, 50),
        disabled: !!node.disabled || executing,
        checked: selectedTriggerNodeName === node.name,
      }));
  }, [triggerNodes, includeChatTrigger, executing, selectedTriggerNodeName]);

  // 是否为分割按钮（有多个触发节点且已选择）
  const isSplitButton = useMemo(() => {
    return selectableTriggerNodes.length > 1 && selectedTriggerNodeName !== undefined;
  }, [selectableTriggerNodes.length, selectedTriggerNodeName]);

  // 根据节点名获取节点类型
  const getNodeTypeByName = (name: string): NodeTypeInfo | null => {
    const node = triggerNodes.find((trigger) => trigger.name === name);
    if (!node) {
      return null;
    }
    return getNodeType(node.type, node.typeVersion || 1);
  };

  return (
    <div className={`relative flex items-stretch ${isSplitButton ? '' : ''}`}>
      <KeyboardShortcutTooltip
        label={label}
        shortcut={{ metaKey: true, keys: ['↵'] }}
        disabled={executing || hideTooltip}
      >
        <Button
          type="primary"
          size={size}
          icon={FlaskConical}
          loading={executing}
          disabled={disabled}
          className={isSplitButton ? 'rounded-r-none border-r-0' : ''}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onClick={onExecute}
          data-test-id="execute-workflow-button"
        >
          <span className="flex flex-col items-start gap-1">
            <span>{label}</span>
            {isSplitButton && selectedTriggerNodeName && (
              <Text size="mini" bold={false}>
                from{' '}
                <Text size="mini" bold>
                  {truncateBeforeLast(selectedTriggerNodeName, 25)}
                </Text>
              </Text>
            )}
          </span>
        </Button>
      </KeyboardShortcutTooltip>
      
      {isSplitButton && (
        <>
          <div className="w-px bg-white" role="presentation" />
          <ActionDropdown
            items={actions}
            disabled={disabled}
            placement="top"
            onSelect={onSelectTriggerNode}
            className="relative"
            renderMenuItem={(item) => {
              const nodeType = getNodeTypeByName(item.id);
              return (
                <>
                  <NodeIcon size={16} nodeType={nodeType} />
                  <span>
                    from{' '}
                    <Text size="small" bold>
                      {item.label}
                    </Text>
                  </span>
                </>
              );
            }}
          >
            <Button
              type="primary"
              iconSize="large"
              icon={ChevronDown}
              disabled={disabled}
              square
              className="rounded-l-none w-10"
              aria-label="Select trigger node"
            />
          </ActionDropdown>
        </>
      )}
    </div>
  );
};

