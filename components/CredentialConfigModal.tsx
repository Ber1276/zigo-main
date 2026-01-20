/**
 * 凭证配置弹窗组件
 * 用于创建或编辑凭证
 */

import React, { useState, useEffect } from 'react';
import { X, Key, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { Credential, credentialsApi, credentialTypesApi, CredentialType } from '../services/n8nApi';

interface CredentialConfigModalProps {
  credentialType: string;
  nodeId: string;
  existingCredentialId?: string;
  onClose: () => void;
  onSave: (credentialId: string) => void;
}

export const CredentialConfigModal: React.FC<CredentialConfigModalProps> = ({
  credentialType,
  nodeId,
  existingCredentialId,
  onClose,
  onSave,
}) => {
  const [credentialName, setCredentialName] = useState('');
  const [credentialData, setCredentialData] = useState<Record<string, any>>({});
  const [credentialTypeInfo, setCredentialTypeInfo] = useState<CredentialType | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // 加载凭证类型信息
  useEffect(() => {
    const loadCredentialType = async () => {
      try {
        // 从后端获取凭证类型定义
        const credType = await credentialTypesApi.get(credentialType);
        if (credType) {
          setCredentialTypeInfo({
            name: credType.name,
            displayName: credType.displayName || credType.name,
            properties: credType.properties || [],
          });
        } else {
          // 如果找不到凭证类型，使用默认值
          console.warn(`未找到凭证类型: ${credentialType}`);
          setCredentialTypeInfo({
            name: credentialType,
            displayName: credentialType,
            properties: [],
          });
        }
      } catch (error) {
        console.error('加载凭证类型信息失败:', error);
        // 出错时使用默认值
        setCredentialTypeInfo({
          name: credentialType,
          displayName: credentialType,
          properties: [],
        });
      }
    };

    loadCredentialType();
  }, [credentialType]);

  // 如果已有凭证，加载其数据
  useEffect(() => {
    if (existingCredentialId) {
      const loadCredential = async () => {
        try {
          // 获取凭证数据（解密后的数据，用于编辑）
          const cred = await credentialsApi.getData(existingCredentialId);
          setCredentialName(cred.name || '');
          // 注意：n8n 可能不会返回完整的凭证数据（安全考虑）
          // 如果返回的数据为空，可能需要用户重新输入
          if (cred.data) {
            setCredentialData(cred.data);
          }
        } catch (error) {
          console.error('加载凭证失败:', error);
          // 如果获取失败，至少设置名称（如果可以从其他来源获取）
        }
      };

      loadCredential();
    } else {
      // 新建凭证时，清空数据
      setCredentialName('');
      setCredentialData({});
    }
  }, [existingCredentialId]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setCredentialData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    // 清除错误
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const handleSave = async () => {
    // 验证
    const newErrors: Record<string, string> = {};
    
    if (!credentialName.trim()) {
      newErrors.name = '凭证名称是必填项';
    }

    if (credentialTypeInfo?.properties) {
      credentialTypeInfo.properties.forEach((prop) => {
        if (prop.required) {
          const value = credentialData[prop.name];
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

    setLoading(true);

    try {
      const credential: Credential = {
        name: credentialName,
        type: credentialType,
        data: credentialData,
        nodesAccess: [{ nodeType: nodeId }], // 这里应该使用实际的节点类型
      };

      let savedCredential;
      if (existingCredentialId) {
        savedCredential = await credentialsApi.update(existingCredentialId, credential);
      } else {
        savedCredential = await credentialsApi.create(credential);
      }

      onSave(savedCredential.id || existingCredentialId || '');
    } catch (error: any) {
      console.error('保存凭证失败:', error);
      setErrors({
        _general: error.response?.data?.message || '保存凭证失败',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderFieldInput = (property: any) => {
    const value = credentialData[property.name] || '';
    const error = errors[property.name];
    const isPassword = property.type === 'password' || property.name.toLowerCase().includes('password') || property.name.toLowerCase().includes('secret');
    const showPassword = showPasswords[property.name] || false;

    if (isPassword) {
      return (
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={(e) => handleFieldChange(property.name, e.target.value)}
            placeholder={property.placeholder || property.displayName}
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
              error ? 'border-red-500' : 'border-slate-300'
            }`}
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility(property.name)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      );
    }

    switch (property.type) {
      case 'string':
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(property.name, e.target.value)}
            placeholder={property.placeholder || property.displayName}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
              error ? 'border-red-500' : 'border-slate-300'
            }`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(property.name, Number(e.target.value))}
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
              onChange={(e) => handleFieldChange(property.name, e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">{property.description}</span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(property.name, e.target.value)}
            placeholder={property.placeholder || property.displayName}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
              error ? 'border-red-500' : 'border-slate-300'
            }`}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="text-blue-600" size={20} />
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {existingCredentialId ? '编辑凭证' : '新建凭证'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {credentialTypeInfo?.displayName || credentialType}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errors._general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="text-sm">{errors._general}</span>
            </div>
          )}

          {/* 凭证名称 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              凭证名称
              <span className="text-red-500 text-xs">*</span>
            </label>
            <input
              type="text"
              value={credentialName}
              onChange={(e) => {
                setCredentialName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.name;
                    return newErrors;
                  });
                }
              }}
              placeholder="请输入凭证名称"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                errors.name ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.name}
              </p>
            )}
          </div>

          {/* 凭证字段 */}
          {credentialTypeInfo?.properties && credentialTypeInfo.properties.length > 0 ? (
            credentialTypeInfo.properties.map((property) => (
              <div key={property.name} className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  {property.displayName}
                  {property.required && (
                    <span className="text-red-500 text-xs">*</span>
                  )}
                </label>
                {renderFieldInput(property)}
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
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>该凭证类型暂无配置字段</p>
              <p className="text-xs mt-2">请参考 n8n 文档配置此凭证类型</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            <CheckCircle2 size={16} />
            {existingCredentialId ? '更新' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
};
