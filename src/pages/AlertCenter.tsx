import React, { useState, useEffect } from 'react';
import { BellRing, AlertTriangle, AlertCircle, CheckCircle, Clock, User, ChevronRight, XCircle, ArrowUp, Eye, MessageSquare } from 'lucide-react';
import { alertApi, approvalApi, plantApi } from '../api';
import { useAuthStore } from '../store/authStore';
import type { Alert, Approval, Plant } from '../../shared/types';

const AlertCenter: React.FC = () => {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [activeTab, setActiveTab] = useState<'alerts' | 'approvals'>('alerts');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [alertData, approvalData, plantData] = await Promise.all([
        alertApi.getAlerts({ limit: 50 }),
        approvalApi.getApprovals({ limit: 20 }),
        plantApi.getAllPlants()
      ]);
      setAlerts(Array.isArray(alertData) ? alertData : []);
      setApprovals(Array.isArray(approvalData) ? approvalData : []);
      setPlants(Array.isArray(plantData) ? plantData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlantName = (plantId: string) => {
    return plants.find(p => p.id === plantId)?.name || '未知工厂';
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'emission': return '排放超标';
      case 'availability': return '设备可用率';
      case 'temperature': return '炉温异常';
      case 'pressure': return '蒸汽压力';
      default: return type;
    }
  };

  const getAlertLevelColor = (level: string) => {
    return level === 'level1' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-red-100 text-red-700 border-red-200';
  };

  const getAlertLevelBg = (level: string) => {
    return level === 'level1' ? 'from-orange-50 to-amber-50' : 'from-red-50 to-rose-50';
  };

  const getAlertLevelText = (level: string) => {
    return level === 'level1' ? '一级预警' : '二级预警';
  };

  const getAlertStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-700';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-700';
      case 'escalated': return 'bg-orange-100 text-orange-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getAlertStatusText = (status: string) => {
    switch (status) {
      case 'active': return '待处理';
      case 'acknowledged': return '已确认';
      case 'escalated': return '已升级';
      case 'resolved': return '已解决';
      default: return status;
    }
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'pending_shift': return 'bg-yellow-100 text-yellow-700';
      case 'pending_manager': return 'bg-blue-100 text-blue-700';
      case 'pending_epb': return 'bg-purple-100 text-purple-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getApprovalStatusText = (status: string) => {
    switch (status) {
      case 'pending_shift': return '待值长确认';
      case 'pending_manager': return '待厂长复核';
      case 'pending_epb': return '待环保局批准';
      case 'approved': return '已批准';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const getApprovalRoleText = (role: string) => {
    switch (role) {
      case 'shift_supervisor': return '值长';
      case 'plant_manager': return '厂长';
      case 'epb': return '环保局';
      default: return role;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterLevel !== 'all' && alert.level !== filterLevel) return false;
    if (filterStatus !== 'all' && alert.status !== filterStatus) return false;
    return true;
  });

  const handleAcknowledge = async (alertId: string) => {
    try {
      setActionLoading(true);
      await alertApi.acknowledgeAlert(alertId);
      await loadData();
      setSelectedAlert(null);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalate = async (alertId: string) => {
    try {
      setActionLoading(true);
      await alertApi.escalateAlert(alertId);
      await loadData();
      setSelectedAlert(null);
    } catch (error) {
      console.error('Failed to escalate alert:', error);
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      setActionLoading(true);
      await alertApi.resolveAlert(alertId, comment || '已处理');
      await loadData();
      setSelectedAlert(null);
      setComment('');
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      setActionLoading(true);
      const role = user?.role === 'shift_supervisor' ? 'shift_supervisor' 
                  : user?.role === 'plant_manager' ? 'plant_manager' 
                  : user?.role === 'epb' ? 'epb' : 'shift_supervisor';
      await approvalApi.approveStep(approvalId, role, comment || '同意');
      await loadData();
      setSelectedApproval(null);
      setComment('');
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      setActionLoading(true);
      const role = user?.role === 'shift_supervisor' ? 'shift_supervisor' 
                  : user?.role === 'plant_manager' ? 'plant_manager' 
                  : user?.role === 'epb' ? 'epb' : 'shift_supervisor';
      await approvalApi.rejectApproval(approvalId, role, comment || '拒绝');
      await loadData();
      setSelectedApproval(null);
      setComment('');
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const canApproveCurrentStep = (approval: Approval) => {
    if (!user) return false;
    if (approval.status === 'pending_shift' && user.role === 'shift_supervisor') return true;
    if (approval.status === 'pending_manager' && user.role === 'plant_manager') return true;
    if (approval.status === 'pending_epb' && user.role === 'epb') return true;
    if (user.role === 'group_admin') return true;
    return false;
  };

  const stats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'active').length,
    level1: alerts.filter(a => a.level === 'level1').length,
    level2: alerts.filter(a => a.level === 'level2').length
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">预警中心与审批流程</h1>
          <p className="text-gray-500 mt-1">实时监控预警信息，执行三级审批流程</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <BellRing className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-xs text-gray-500">预警总数</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.active}</div>
                <div className="text-xs text-gray-500">待处理</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.level1}</div>
                <div className="text-xs text-gray-500">一级预警</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.level2}</div>
                <div className="text-xs text-gray-500">二级预警</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">预警升级规则说明</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>设备可用率连续2小时低于85% → 触发<strong>一级预警</strong>，推送至值长</li>
                <li>一级预警后1小时内未改善 → 自动升级为<strong>二级预警</strong></li>
                <li>二级预警自动启动<strong>三级审批流程</strong>：值长确认 → 厂长复核 → 环保局批准</li>
                <li>审批通过后方可调整燃烧参数或启动停炉检修</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-2 px-4 py-2 -mb-px text-sm font-medium transition-colors ${
                activeTab === 'alerts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BellRing className="w-4 h-4" />
              预警列表
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                {alerts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`flex items-center gap-2 px-4 py-2 -mb-px text-sm font-medium transition-colors ${
                activeTab === 'approvals'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              审批流程
              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                {approvals.filter(a => !['approved', 'rejected'].includes(a.status)).length}
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'alerts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">级别：</span>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部</option>
                    <option value="level1">一级预警</option>
                    <option value="level2">二级预警</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">状态：</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部</option>
                    <option value="active">待处理</option>
                    <option value="acknowledged">已确认</option>
                    <option value="escalated">已升级</option>
                    <option value="resolved">已解决</option>
                  </select>
                </div>
              </div>

              {filteredAlerts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无符合条件的预警</p>
                </div>
              ) : (
                filteredAlerts.map(alert => (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedAlert?.id === alert.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAlertLevelColor(alert.level)}`}>
                            {getAlertLevelText(alert.level)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertStatusColor(alert.status)}`}>
                            {getAlertStatusText(alert.status)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(alert.timestamp || '').toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-800 mb-1">
                          {getAlertTypeText(alert.type)} - {getPlantName(alert.plantId)}
                        </h4>
                        <p className="text-sm text-gray-600">{alert.description || '预警详情'}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="lg:col-span-1">
              {selectedAlert ? (
                <div className={`bg-gradient-to-br ${getAlertLevelBg(selectedAlert.level)} rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">预警详情</h3>
                    <button
                      onClick={() => setSelectedAlert(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAlertLevelColor(selectedAlert.level)}`}>
                          {getAlertLevelText(selectedAlert.level)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertStatusColor(selectedAlert.status)}`}>
                          {getAlertStatusText(selectedAlert.status)}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-800 mb-1">{getAlertTypeText(selectedAlert.type)}</h4>
                      <p className="text-sm text-gray-500">{getPlantName(selectedAlert.plantId)}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        触发时间：{new Date(selectedAlert.timestamp || '').toLocaleString('zh-CN')}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">预警详情</h5>
                      <p className="text-sm text-gray-600">{selectedAlert.description || '暂无详细描述'}</p>
                      {selectedAlert.details && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          {JSON.stringify(selectedAlert.details, null, 2)}
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">处理备注</h5>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="请输入处理备注..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      {selectedAlert.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(selectedAlert.id)}
                            disabled={actionLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            确认预警
                          </button>
                          <button
                            onClick={() => handleEscalate(selectedAlert.id)}
                            disabled={actionLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                          >
                            <ArrowUp className="w-4 h-4" />
                            升级预警
                          </button>
                        </>
                      )}
                      {(selectedAlert.status === 'active' || selectedAlert.status === 'acknowledged' || selectedAlert.status === 'escalated') && (
                        <button
                          onClick={() => handleResolve(selectedAlert.id)}
                          disabled={actionLoading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          标记解决
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center sticky top-24">
                  <BellRing className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">点击左侧预警查看详情</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {approvals.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无待审批事项</p>
                </div>
              ) : (
                approvals.map(approval => (
                  <div
                    key={approval.id}
                    onClick={() => setSelectedApproval(approval)}
                    className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedApproval?.id === approval.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getApprovalStatusColor(approval.status)}`}>
                            {getApprovalStatusText(approval.status)}
                          </span>
                          <span className="text-xs text-gray-400">
                            创建时间：{new Date(approval.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-800 mb-1">
                          {approval.type === 'parameter_adjust' ? '燃烧参数调整' : '停炉检修'} - {getPlantName(approval.plantId)}
                        </h4>
                        <div className="flex items-center gap-4 mt-3">
                          {approval.steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                step.status === 'approved' ? 'bg-green-500 text-white' :
                                step.status === 'rejected' ? 'bg-red-500 text-white' :
                                approval.currentStep === step.step ? 'bg-blue-500 text-white animate-pulse' :
                                'bg-gray-200 text-gray-500'
                              }`}>
                                {step.status === 'approved' ? '✓' : step.status === 'rejected' ? '✗' : index + 1}
                              </div>
                              <span className="ml-2 text-xs text-gray-600">{getApprovalRoleText(step.role)}</span>
                              {index < approval.steps.length - 1 && (
                                <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="lg:col-span-1">
              {selectedApproval ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">审批详情</h3>
                    <button
                      onClick={() => setSelectedApproval(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getApprovalStatusColor(selectedApproval.status)}`}>
                          {getApprovalStatusText(selectedApproval.status)}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-800 mb-1">
                        {selectedApproval.type === 'parameter_adjust' ? '燃烧参数调整申请' : '停炉检修申请'}
                      </h4>
                      <p className="text-sm text-gray-500">{getPlantName(selectedApproval.plantId)}</p>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">审批流程</h5>
                      <div className="space-y-3">
                        {selectedApproval.steps.map((step, index) => (
                          <div key={step.id} className="relative pl-8 pb-4 border-l-2 border-gray-200 last:pb-0 last:border-l-0">
                            <div className={`absolute -left-[9px] top-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                              step.status === 'approved' ? 'bg-green-500 text-white' :
                              step.status === 'rejected' ? 'bg-red-500 text-white' :
                              selectedApproval.currentStep === step.step ? 'bg-blue-500 text-white' :
                              'bg-gray-200 text-gray-500'
                            }`}>
                              {step.status === 'approved' ? '✓' : step.status === 'rejected' ? '✗' : index + 1}
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-800">
                                  {getApprovalRoleText(step.role)}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  step.status === 'approved' ? 'bg-green-100 text-green-700' :
                                  step.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {step.status === 'approved' ? '已批准' : step.status === 'rejected' ? '已拒绝' : '待处理'}
                                </span>
                              </div>
                              {step.approverName && (
                                <p className="text-xs text-gray-600 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {step.approverName}
                                </p>
                              )}
                              {step.comment && (
                                <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                                  <MessageSquare className="w-3 h-3 mt-0.5" />
                                  {step.comment}
                                </p>
                              )}
                              {step.approvedAt && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(step.approvedAt).toLocaleString('zh-CN')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {canApproveCurrentStep(selectedApproval) && !['approved', 'rejected'].includes(selectedApproval.status) && (
                      <>
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">审批意见</h5>
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="请输入审批意见..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(selectedApproval.id)}
                            disabled={actionLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            拒绝
                          </button>
                          <button
                            onClick={() => handleApprove(selectedApproval.id)}
                            disabled={actionLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            批准
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center sticky top-24">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">点击左侧审批查看详情</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertCenter;
