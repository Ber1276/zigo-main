/**
 * 画布节点类型定义
 * 参照 n8n 的 canvas.types.ts
 */

export type CanvasNodeRenderType = 'default' | 'stickyNote' | 'addNodes' | 'choicePrompt';

export type CanvasConnectionMode = 'input' | 'output';

export type CanvasConnectionPortType = 'main' | string;

export interface CanvasConnectionPort {
  type: CanvasConnectionPortType;
  index: number;
  required?: boolean;
  maxConnections?: number;
  label?: string;
  position?: 'left' | 'right' | 'top' | 'bottom';
  offset?: Record<string, string>;
}

export interface CanvasElementPortWithRenderData extends CanvasConnectionPort {
  handleId: string;
  connectionsCount: number;
  isConnecting: boolean;
}

export interface CanvasNodeDefaultRender {
  type: 'default';
  options: {
    trigger?: boolean;
    configuration?: boolean;
    configurable?: boolean;
    icon?: any;
    tooltip?: string;
    dirtiness?: string;
    inputs?: {
      labelSize?: number;
    };
    outputs?: {
      labelSize?: number;
    };
  };
}

export interface CanvasNodeData {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  disabled?: boolean;
  inputs?: CanvasConnectionPort[];
  outputs?: CanvasConnectionPort[];
  connections?: {
    input?: Record<string, Record<number, any[]>>;
    output?: Record<string, Record<number, any[]>>;
  };
  render: {
    type: CanvasNodeRenderType;
    options?: CanvasNodeDefaultRender['options'] | any;
  };
}

