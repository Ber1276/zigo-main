/**
 * 工作流连接线绘制组件
 * 绘制节点之间的连接线
 */

import React, { useMemo } from 'react';
import { WorkflowNode, WorkflowConnections as WorkflowConnectionsType, WorkflowNode as N8nWorkflowNode } from '../types';

interface WorkflowConnectionsRendererProps {
  n8nNodes: N8nWorkflowNode[]; // 使用 n8n 格式的节点，包含 name 和 position
  connections: WorkflowConnectionsType;
  viewport: { x: number; y: number; zoom: number };
  onConnectionClick?: (sourceNodeName: string, targetNodeName: string) => void;
}

interface ConnectionPoint {
  x: number;
  y: number;
  nodeId: string;
  nodeName: string;
  type: 'input' | 'output';
  index?: number;
}

/**
 * 计算节点的连接点位置
 * 节点使用逻辑坐标，通过 CSS transform 应用 viewport 变换
 * 连接线 SVG 在 transform wrapper 内部，所以应该使用逻辑坐标
 * SVG 的坐标系统会随着 transform 自动变换
 */
function getNodeConnectionPoints(
  node: N8nWorkflowNode,
  viewport: { x: number; y: number; zoom: number }
): { input: ConnectionPoint; output: ConnectionPoint } {
  // n8n 节点的 position 是 [x, y] 数组
  const nodeX = Array.isArray(node.position) ? node.position[0] : (node.position as any)?.x || 0;
  const nodeY = Array.isArray(node.position) ? node.position[1] : (node.position as any)?.y || 0;
  
  // 节点尺寸（与 WorkflowEditor 中的节点尺寸一致）
  // 节点宽度：minWidth 160px, maxWidth 200px，实际使用约 180-200px
  // 节点高度：内容自适应，大约 60-70px（包括 padding py-3 = 12px * 2 + 图标 40px + 文字）
  const nodeWidth = 180; // 平均宽度
  const nodeHeight = 65; // 平均高度（包括 padding 和内容）
  
  // 连接点相对于节点的位置（逻辑坐标）
  // 连接点使用 absolute top-1/2，即节点垂直中心
  const inputOffsetX = -1.5; // 输入点在节点左侧外（-left-1.5，约 -6px）
  const inputOffsetY = nodeHeight / 2; // 输入点在节点垂直中心
  const outputOffsetX = nodeWidth + 1.5; // 输出点在节点右侧外（-right-1.5，约 +6px）
  const outputOffsetY = nodeHeight / 2; // 输出点在节点垂直中心
  
  // SVG 在 transform wrapper 内部，使用逻辑坐标即可
  // transform 会自动应用到 SVG 上
  const inputX = nodeX + inputOffsetX;
  const inputY = nodeY + inputOffsetY;
  const outputX = nodeX + outputOffsetX;
  const outputY = nodeY + outputOffsetY;
  
  return {
    input: {
      x: inputX,
      y: inputY,
      nodeId: node.id,
      nodeName: node.name,
      type: 'input',
    },
    output: {
      x: outputX,
      y: outputY,
      nodeId: node.id,
      nodeName: node.name,
      type: 'output',
    },
  };
}

/**
 * 计算贝塞尔曲线路径
 */
function getBezierPath(
  start: { x: number; y: number },
  end: { x: number; y: number }
): string {
  const dx = end.x - start.x;
  const controlPointOffset = Math.min(Math.abs(dx) / 2, 100);
  
  const cp1x = start.x + controlPointOffset;
  const cp1y = start.y;
  const cp2x = end.x - controlPointOffset;
  const cp2y = end.y;
  
  return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
}

export const WorkflowConnectionsRenderer: React.FC<WorkflowConnectionsRendererProps> = ({
  n8nNodes,
  connections,
  viewport,
  onConnectionClick,
}) => {
  // 构建连接线数据
  const connectionLines = useMemo(() => {
    const lines: Array<{
      id: string;
      source: ConnectionPoint;
      target: ConnectionPoint;
      sourceNodeName: string;
      targetNodeName: string;
      outputType: string;
      inputType: string;
    }> = [];
    
    // 创建节点名称到节点的映射
    const nodeMap = new Map<string, N8nWorkflowNode>();
    n8nNodes.forEach((node) => {
      if (node.name) {
        nodeMap.set(node.name, node);
      }
    });
    
    // 遍历所有连接
    // n8n 连接结构：connections[sourceNodeName][connectionType][sourceOutputIndex] = [{ node, type, index }]
    Object.keys(connections).forEach((sourceNodeName) => {
      const sourceNode = nodeMap.get(sourceNodeName);
      if (!sourceNode) return;
      
      const sourcePoints = getNodeConnectionPoints(sourceNode, viewport);
      
      const sourceConnections = connections[sourceNodeName];
      Object.keys(sourceConnections).forEach((connectionType) => {
        const outputArray = sourceConnections[connectionType];
        
        // outputArray 是一个数组，每个元素对应一个输出索引
        if (Array.isArray(outputArray)) {
          outputArray.forEach((targets, sourceOutputIndex) => {
            // targets 是一个数组，包含该输出索引的所有目标连接
            if (Array.isArray(targets)) {
              targets.forEach((target, targetIndex) => {
                if (!target || !target.node) return;
                
                const targetNode = nodeMap.get(target.node);
                if (!targetNode) return;
                
                const targetPoints = getNodeConnectionPoints(targetNode, viewport);
                
                lines.push({
                  id: `${sourceNodeName}-${target.node}-${connectionType}-${sourceOutputIndex}-${targetIndex}`,
                  source: sourcePoints.output,
                  target: targetPoints.input,
                  sourceNodeName,
                  targetNodeName: target.node,
                  outputType: connectionType,
                  inputType: target.type || connectionType,
                });
              });
            }
          });
        }
      });
    });
    
    console.log('连线渲染 - n8nNodes 数量:', n8nNodes.length);
    console.log('连线渲染 - 连接数量:', Object.keys(connections).length);
    console.log('连线渲染 - 生成的连线数量:', lines.length);
    console.log('连线渲染 - 节点映射:', Array.from(nodeMap.keys()));
    
    return lines;
  }, [n8nNodes, connections, viewport]);
  
  if (connectionLines.length === 0) {
    return null;
  }
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      style={{ 
        width: '100%',
        height: '100%',
        overflow: 'visible',
      }}
    >
      <defs>
        {/* 箭头标记 */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="#64748b"
            className="stroke-slate-400"
          />
        </marker>
        
        {/* 选中状态的箭头标记 */}
        <marker
          id="arrowhead-selected"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="#3b82f6"
            className="stroke-blue-500"
          />
        </marker>
      </defs>
      
      {connectionLines.map((line) => {
        const path = getBezierPath(line.source, line.target);
        
        return (
          <g key={line.id}>
            {/* 连接线 */}
            <path
              d={path}
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              className="pointer-events-stroke cursor-pointer hover:stroke-blue-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (onConnectionClick) {
                  onConnectionClick(line.sourceNodeName, line.targetNodeName);
                }
              }}
              style={{ pointerEvents: 'stroke' }}
            />
            
            {/* 连接点（用于交互） */}
            <circle
              cx={line.source.x}
              cy={line.source.y}
              r="4"
              fill="#64748b"
              className="pointer-events-auto cursor-pointer hover:fill-blue-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (onConnectionClick) {
                  onConnectionClick(line.sourceNodeName, line.targetNodeName);
                }
              }}
            />
            <circle
              cx={line.target.x}
              cy={line.target.y}
              r="4"
              fill="#64748b"
              className="pointer-events-auto cursor-pointer hover:fill-blue-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (onConnectionClick) {
                  onConnectionClick(line.sourceNodeName, line.targetNodeName);
                }
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};
