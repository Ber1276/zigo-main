/**
 * 认证守卫组件
 * 检查用户是否已登录
 * 如果 URL 包含 userId 和 userName 参数，自动执行登录
 * 如果未登录且没有参数，显示提示信息
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { authApi } from '../services/n8nApi';
import { UserRole } from '../types';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  onRoleUpdate?: (role: UserRole) => void;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, onRoleUpdate }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isAutoLogging, setIsAutoLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  // 根据用户信息自动设置角色
  const updateUserRole = (user: any) => {
    if (user) {
      // n8n 用户角色映射（根据 n8n API 文档）：
      // - 'global:owner' -> ADMIN（全局所有者）
      // - 'global:admin' -> ADMIN（全局管理员）
      // - 'global:member' 或其他 -> USER（普通用户）
      const userRole = (user.globalRole || user.role || '').toLowerCase();
      // 检查是否为管理员角色（global:owner 或 global:admin）
      const isAdmin = userRole === 'global:owner' || userRole === 'global:admin';
      const role = isAdmin ? UserRole.ADMIN : UserRole.USER;
      
      // 调试日志
      console.log('用户角色判断:', {
        userRole,
        isAdmin,
        role,
        userRoleRaw: user.globalRole || user.role,
      });
      
      if (onRoleUpdate) {
        onRoleUpdate(role);
      }
    } else {
      if (onRoleUpdate) {
        onRoleUpdate(UserRole.USER);
      }
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 检查 URL 参数中是否有 userId 和 userName
        const { userId, userName } = authApi.getRedirectParams();
        
        if (userId && typeof userId === 'string' && userId.trim()) {
          // 有登录参数，执行自动登录
          setIsAutoLogging(true);
          setError(null);
          
          try {
            // 执行自动登录，返回用户信息
            const user = await authApi.performAutoLogin(userId.trim(), userName || '');
            
            if (user) {
              // 登录成功，根据用户角色自动设置
              updateUserRole(user);
              // 允许访问
              setIsAuthenticated(true);
              setIsChecking(false);
              setIsAutoLogging(false);
              return;
            } else {
              throw new Error('登录成功但无法获取用户信息');
            }
          } catch (loginError: any) {
            console.error('自动登录失败:', loginError);
            setError(loginError.message || '自动登录失败，请检查参数是否正确');
            setIsAutoLogging(false);
            setIsChecking(false);
            return;
          }
        }

        // 没有登录参数，检查是否已登录
        // 从后端 API 获取完整用户信息（包括 globalRole）
        const user = await authApi.getCurrentUser();
        
        if (user) {
          // 已登录，根据用户角色自动设置
          updateUserRole(user);
          // 允许访问
          setIsAuthenticated(true);
        } else {
          // 未登录，显示提示
          if (onRoleUpdate) {
            onRoleUpdate(UserRole.USER);
          }
          setIsAuthenticated(false);
        }
      } catch (error) {
        // 认证检查失败（非 401 错误），记录错误但继续显示提示
        console.error('认证检查失败:', error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [location]);

  // 检查中或自动登录中显示加载状态
  if (isChecking || isAutoLogging) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">
            {isAutoLogging ? '正在自动登录...' : '正在验证登录状态...'}
          </p>
        </div>
      </div>
    );
  }

  // 自动登录错误
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-slate-900">登录失败</h2>
          </div>
          <p className="text-slate-600 mb-4">{error}</p>
          <p className="text-sm text-slate-500">
            请确保使用正确的登录链接，格式为：
            <code className="block mt-2 p-2 bg-slate-100 rounded text-xs">
              {window.location.origin}/#/signin?userId=your-email@example.com&userName=YourName
            </code>
          </p>
        </div>
      </div>
    );
  }

  // 已认证，渲染子组件
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // 未认证且没有登录参数，显示提示
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-amber-600" />
          <h2 className="text-xl font-bold text-slate-900">需要登录</h2>
        </div>
        <p className="text-slate-600 mb-4">
          您需要通过正确的登录链接访问此页面。
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">登录链接格式：</p>
          <code className="block text-xs text-slate-600 break-all">
            {window.location.origin}/#/signin?userId=your-email@example.com&userName=YourName
          </code>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ExternalLink className="w-4 h-4" />
          <span>请从系统提供的登录链接访问</span>
        </div>
      </div>
    </div>
  );
};
