/**
 * 节点配置面板组件
 * 用于配置节点的参数、凭证等
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, Key, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { WorkflowNode } from '../types';
import { NodeTypeInfo, NodeProperty, getCredentialsByType, CredentialType } from '../services/workflowEditorService';
import { credentialsApi } from '../services/n8nApi';

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  nodeTypeInfo: NodeTypeInfo | null;
  onClose: () => void;
  onSave: (node: WorkflowNode) => void;
  onOpenCredentialModal?: (credentialType: string, nodeId: string) => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  nodeTypeInfo,
  onClose,
  onSave,
  onOpenCredentialModal,
}) => {
  const [localNode, setLocalNode] = useState<WorkflowNode | null>(node);
  const [localNodeTypeInfo, setLocalNodeTypeInfo] = useState<NodeTypeInfo | null>(nodeTypeInfo);
  const [availableCredentials, setAvailableCredentials] = useState<Record<string, any[]>>({});
  const [loadingCredentials, setLoadingCredentials] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 加载节点类型详情
  useEffect(() => {
    if (node && !nodeTypeInfo) {
      getNodeTypeDetails(node.type).then((info) => {
        if (info) {
          setLocalNodeTypeInfo(info);
        }
      });
    } else if (nodeTypeInfo) {
      setLocalNodeTypeInfo(nodeTypeInfo);
    }
  }, [node, nodeTypeInfo]);

  // 加载凭证列表
  useEffect(() => {
    if (localNodeTypeInfo?.credentials && localNodeTypeInfo.credentials.length > 0) {
      const loadCredentials = async () => {
        const credsMap: Record<string, any[]> = {};
        const loadingMap: Record<string, boolean> = {};

        for (const credType of localNodeTypeInfo.credentials || []) {
          loadingMap[credType.name] = true;
          setLoadingCredentials({ ...loadingCredentials, ...loadingMap });

          try {
            const creds = await getCredentialsByType(credType.name);
            credsMap[credType.name] = creds;
          } catch (error) {
            console.error(`加载 ${credType.name} 凭证失败:`, error);
            credsMap[credType.name] = [];
          }

          loadingMap[credType.name] = false;
          setLoadingCredentials({ ...loadingCredentials, ...loadingMap });
        }

        setAvailableCredentials(credsMap);
      };

      loadCredentials();
    }
  }, [localNodeTypeInfo]);

  // 同步节点状态
  useEffect(() => {
    if (node) {
      setLocalNode({ ...node });
    }
  }, [node]);

  if (!localNode) {
    return null;
  }

  const handleParameterChange = (propertyName: string, value: any) => {
    if (!localNode) return;

    setLocalNode({
      ...localNode,
      parameters: {
        ...localNode.parameters,
        [propertyName]: value,
      },
    });

    // 清除该字段的错误
    if (errors[propertyName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[propertyName];
        return newErrors;
      });
    }
  };

  const handleCredentialChange = (credentialType: string, credentialId: string) => {
    if (!localNode) return;

    setLocalNode({
      ...localNode,
      credentials: {
        ...localNode.credentials,
        [credentialType]: {
          id: credentialId,
        },
      },
    });
  };

  const handleSave = () => {
    if (!localNode) return;

    // 验证必填字段
    const newErrors: Record<string, string> = {};
    if (localNodeTypeInfo) {
      localNodeTypeInfo.properties.forEach((prop) => {
        if (prop.required) {
          const value = localNode.parameters?.[prop.name];
          if (value === undefined || value === null || value === '') {
            newErrors[prop.name] = `${prop.displayName} 是必填项`;
          }
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(localNode);
  };

  const renderPropertyInput = (property: NodeProperty) => {
    const value = localNode?.parameters?.[property.name] ?? property.default;
    const error = errors[property.name];

    switch (property.type) {
      case 'string':
      case 'number':
        return (
          <input
            type={property.type === 'number' ? 'number' : 'text'}
            value={value || ''}
            onChange={(e) =>
              handleParameterChange(
                property.name,
                property.type === 'number' ? Number(e.target.value) : e.target.value
              )
            }
            placeholder={property.placeholder || property.displayName}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
              error ? 'border-red-500' : 'border-slate-300'
            }`}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleParameterChange(property.name, e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">{property.description}</span>
          </label>
        );

      case 'options':
        const options = property.options || property.typeOptions?.values || [];
        return (
          <select
            value={value || ''}
            onChange={(e) => handleParameterChange(property.name, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
              error ? 'border-red-500' : 'border-slate-300'
            }`}
          >
            <option value="">请选择...</option>
            {options.map((opt: any) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optName = typeof opt === 'string' ? opt : opt.name;
              return (
                <option key={optValue} value={optValue}>
                  {optName}
                </option>
              );
            })}
          </select>
        );

      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleParameterChange(property.name, parsed);
              } catch {
                handleParameterChange(property.name, e.target.value);
              }
            }}
            placeholder={property.placeholder || '请输入 JSON'}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm ${
              error ? 'border-red-500' : 'border-slate-300'
            }`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleParameterChange(property.name, e.target.value)}
            placeholder={property.placeholder || property.displayName}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
              error ? 'border-red-500' : 'border-slate-300'
            }`}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="text-blue-600" size={20} />
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {localNodeTypeInfo?.displayName || localNode.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {localNodeTypeInfo?.description || '配置节点参数'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 凭证配置 */}
          {localNodeTypeInfo?.credentials && localNodeTypeInfo.credentials.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Key size={16} className="text-slate-500" />
                凭证配置
              </h4>
              {localNodeTypeInfo.credentials.map((credType) => {
                const currentCredId = localNode.credentials?.[credType.name]?.id;
                const creds = availableCredentials[credType.name] || [];
                const isLoading = loadingCredentials[credType.name];

                return (
                  <div key={credType.name} className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      {credType.displayName || credType.name}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={currentCredId || ''}
                        onChange={(e) => handleCredentialChange(credType.name, e.target.value)}
                        disabled={isLoading}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                      >
                        <option value="">-- 选择凭证 --</option>
                        {creds.map((cred) => (
                          <option key={cred.id} value={cred.id}>
                            {cred.name}
                          </option>
                        ))}
                      </select>
                      {isLoading && (
                        <div className="flex items-center px-3">
                          <Loader2 size={16} className="animate-spin text-slate-400" />
                        </div>
                      )}
                      {onOpenCredentialModal && (
                        <button
                          onClick={() => onOpenCredentialModal(credType.name, localNode.id)}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          新建
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 参数配置 */}
          {localNodeTypeInfo?.properties && localNodeTypeInfo.properties.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700">参数配置</h4>
              {localNodeTypeInfo.properties.map((property) => (
                <div key={property.name} className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    {property.displayName}
                    {property.required && (
                      <span className="text-red-500 text-xs">*</span>
                    )}
                  </label>
                  {renderPropertyInput(property)}
                  {errors[property.name] && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errors[property.name]}
                    </p>
                  )}
                  {property.description && !errors[property.name] && (
                    <p className="text-xs text-slate-500">{property.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {(!localNodeTypeInfo?.properties || localNodeTypeInfo.properties.length === 0) &&
            (!localNodeTypeInfo?.credentials || localNodeTypeInfo.credentials.length === 0) && (
              <div className="text-center py-8 text-slate-500">
                <p>该节点无需配置</p>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
