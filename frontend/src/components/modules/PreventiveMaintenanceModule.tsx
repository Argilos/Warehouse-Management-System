import React, { useState, useMemo } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import {
  Wrench, CalendarClock, Plus, Search, Filter, AlertTriangle, Clock,
  CheckCircle2, Pause, Play, Trash2, Edit3, ShieldAlert, CheckSquare,
  Square, Calendar as CalendarIcon, UserCheck, Tag, DollarSign, ListChecks,
  ChevronLeft, ChevronRight, Info, FileText
} from 'lucide-react';
import {
  MaintenancePlan, MaintenanceTask, MaintenanceType, PlanPriority,
  FrequencyUnit, TaskResult, ChecklistItem, PlanStatus
} from '../../types';

interface PreventiveMaintenanceModuleProps {
  initialFilterStatus?: string;
}

export const PreventiveMaintenanceModule: React.FC<PreventiveMaintenanceModuleProps> = ({
  initialFilterStatus = 'ALL',
}) => {
  const {
    assets,
    employees,
    maintenancePlans,
    maintenanceTasks,
    activeRole,
    addMaintenancePlan,
    updateMaintenancePlan,
    setPlanStatus,
    deleteMaintenancePlan,
    startMaintenanceTask,
    completeMaintenanceTask,
    setSelectedAssetFor360,
  } = useWarehouseStore();

  const { t } = useLanguageStore();

  // Navigation & Sub-views
  const [activeTab, setActiveTab] = useState<'schedule' | 'calendar' | 'plans'>('schedule');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilterStatus);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modals state
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
  const [completingTask, setCompletingTask] = useState<MaintenanceTask | null>(null);

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // Form State for Create/Edit Plan
  const [planForm, setPlanForm] = useState({
    assetId: '',
    name: '',
    description: '',
    type: 'PREVENTIVE' as MaintenanceType,
    priority: 'MEDIUM' as PlanPriority,
    frequency: 6,
    frequencyUnit: 'MONTHS' as FrequencyUnit,
    firstDueDate: new Date().toISOString().slice(0, 10),
    responsibleId: '',
    estimatedDurationMinutes: 60,
    estimatedCost: 0,
    status: 'ACTIVE' as PlanStatus,
    instructions: '',
    requiredParts: '',
    checklist: [
      { id: '1', title: 'Inspect general equipment condition', required: true },
      { id: '2', title: 'Check fluid levels & seals', required: true },
      { id: '3', title: 'Perform operational safety test', required: true },
    ] as ChecklistItem[],
  });

  // Form State for Completing Task
  const [taskCompletionForm, setTaskCompletionForm] = useState({
    actualDurationMinutes: 60,
    laborCost: 50,
    partsCost: 0,
    result: 'PASS' as TaskResult,
    notes: '',
    checklistProgress: [] as ChecklistItem[],
    overrideReason: '',
  });

  const now = new Date();

  // Helper to calculate days remaining & operational status
  const getTaskDueInfo = (dueDateStr: string, taskStatus: string) => {
    const due = new Date(dueDateStr);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (taskStatus === 'COMPLETED') {
      return { label: t('Completed'), badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', diffDays, statusKey: 'COMPLETED' };
    }
    if (taskStatus === 'IN_PROGRESS') {
      return { label: t('In Progress'), badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse', diffDays, statusKey: 'IN_PROGRESS' };
    }
    if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)} ${t('Days Overdue')}`, badgeClass: 'bg-red-50 text-red-700 border-red-200 font-bold', diffDays, statusKey: 'OVERDUE' };
    }
    if (diffDays === 0) {
      return { label: t('Due Today'), badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-bold', diffDays, statusKey: 'DUE_TODAY' };
    }
    if (diffDays <= 7) {
      return { label: `${diffDays} ${t('Days Remaining')}`, badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold', diffDays, statusKey: 'DUE_SOON' };
    }
    if (diffDays <= 30) {
      return { label: `${diffDays} ${t('Days Remaining')}`, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', diffDays, statusKey: 'DUE_SOON' };
    }
    return { label: `${diffDays} ${t('Days Remaining')}`, badgeClass: 'bg-slate-50 text-slate-600 border-slate-200', diffDays, statusKey: 'UPCOMING' };
  };

  // Unique Categories from Assets
  const categoriesList = useMemo(() => {
    const cats = new Set(assets.map(a => a.category));
    return Array.from(cats);
  }, [assets]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return maintenanceTasks.filter((task) => {
      const matchesSearch =
        searchQuery === '' ||
        task.taskNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.assetName && task.assetName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.assetNumber && task.assetNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.assetSerialNumber && task.assetSerialNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const dueInfo = getTaskDueInfo(task.dueDate, task.status);

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'OVERDUE') matchesStatus = dueInfo.statusKey === 'OVERDUE';
        else if (statusFilter === 'DUE_TODAY') matchesStatus = dueInfo.statusKey === 'DUE_TODAY';
        else if (statusFilter === 'DUE_SOON') matchesStatus = dueInfo.statusKey === 'DUE_SOON';
        else if (statusFilter === 'UPCOMING') matchesStatus = dueInfo.statusKey === 'UPCOMING';
        else matchesStatus = task.status === statusFilter;
      }

      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
      const matchesType = typeFilter === 'ALL' || task.type === typeFilter;
      const matchesCategory = categoryFilter === 'ALL' || task.assetCategory === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesCategory;
    });
  }, [maintenanceTasks, searchQuery, statusFilter, priorityFilter, typeFilter, categoryFilter]);

  // KPI Metrics Summary
  const kpiStats = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let due7Days = 0;
    let due30Days = 0;
    let inProgress = 0;

    maintenanceTasks.forEach((task) => {
      if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return;
      const dueInfo = getTaskDueInfo(task.dueDate, task.status);
      if (task.status === 'IN_PROGRESS') inProgress++;
      if (dueInfo.statusKey === 'OVERDUE') overdue++;
      else if (dueInfo.statusKey === 'DUE_TODAY') dueToday++;
      if (dueInfo.diffDays >= 0 && dueInfo.diffDays <= 7) due7Days++;
      if (dueInfo.diffDays >= 0 && dueInfo.diffDays <= 30) due30Days++;
    });

    return { overdue, dueToday, due7Days, due30Days, inProgress, totalActivePlans: maintenancePlans.filter(p => p.status === 'ACTIVE').length };
  }, [maintenanceTasks, maintenancePlans]);

  // Open Create Plan Modal
  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      assetId: assets.length > 0 ? assets[0].id : '',
      name: '',
      description: '',
      type: 'PREVENTIVE',
      priority: 'MEDIUM',
      frequency: 6,
      frequencyUnit: 'MONTHS',
      firstDueDate: new Date().toISOString().slice(0, 10),
      responsibleId: employees.length > 0 ? employees[0].id : '',
      estimatedDurationMinutes: 60,
      estimatedCost: 100,
      status: 'ACTIVE',
      instructions: '',
      requiredParts: '',
      checklist: [
        { id: '1', title: 'Inspect general equipment condition', required: true },
        { id: '2', title: 'Check fluid levels & seals', required: true },
        { id: '3', title: 'Perform operational safety test', required: true },
      ],
    });
    setShowCreatePlanModal(true);
  };

  // Open Edit Plan Modal
  const handleOpenEditPlan = (plan: MaintenancePlan) => {
    setEditingPlan(plan);
    setPlanForm({
      assetId: plan.assetId,
      name: plan.name,
      description: plan.description || '',
      type: plan.type,
      priority: plan.priority,
      frequency: plan.frequency,
      frequencyUnit: plan.frequencyUnit,
      firstDueDate: plan.firstDueDate,
      responsibleId: plan.responsibleId || '',
      estimatedDurationMinutes: plan.estimatedDurationMinutes || 60,
      estimatedCost: plan.estimatedCost || 0,
      status: plan.status,
      instructions: plan.instructions || '',
      requiredParts: plan.requiredParts || '',
      checklist: plan.checklist && plan.checklist.length > 0 ? plan.checklist : [
        { id: '1', title: 'Inspect general equipment condition', required: true },
      ],
    });
    setShowCreatePlanModal(true);
  };

  // Save Plan Submission
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.assetId || !planForm.name) {
      alert(t('Please fill in required plan fields.'));
      return;
    }

    try {
      if (editingPlan) {
        await updateMaintenancePlan(editingPlan.id, planForm);
      } else {
        await addMaintenancePlan(planForm);
      }
      setShowCreatePlanModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Open Complete Task Modal
  const handleOpenCompleteTask = (task: MaintenanceTask) => {
    setCompletingTask(task);
    const initialChecklist = (task.checklistProgress && task.checklistProgress.length > 0)
      ? task.checklistProgress.map(item => ({ ...item, completed: false }))
      : [
        { id: '1', title: 'Inspect general equipment condition', required: true, completed: false },
        { id: '2', title: 'Check fluid levels & seals', required: true, completed: false },
        { id: '3', title: 'Perform operational safety test', required: true, completed: false },
      ];

    setTaskCompletionForm({
      actualDurationMinutes: 60,
      laborCost: 50,
      partsCost: 20,
      result: 'PASS',
      notes: '',
      checklistProgress: initialChecklist,
      overrideReason: '',
    });
  };

  // Handle Checklist Toggle in Completion Modal
  const handleToggleChecklistItem = (index: number) => {
    const updated = [...taskCompletionForm.checklistProgress];
    updated[index].completed = !updated[index].completed;
    if (updated[index].completed) {
      updated[index].completedAt = new Date().toISOString();
    }
    setTaskCompletionForm({ ...taskCompletionForm, checklistProgress: updated });
  };

  // Submit Task Completion
  const handleSubmitTaskCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;

    // Check mandatory checklist items
    const missingRequired = taskCompletionForm.checklistProgress.some(item => item.required && !item.completed);
    if (missingRequired && !taskCompletionForm.overrideReason) {
      alert(t('Please complete all required checklist items or provide a Manager Override Reason.'));
      return;
    }

    try {
      await completeMaintenanceTask(completingTask.id, {
        actualDurationMinutes: taskCompletionForm.actualDurationMinutes,
        laborCost: taskCompletionForm.laborCost,
        partsCost: taskCompletionForm.partsCost,
        result: taskCompletionForm.result,
        notes: taskCompletionForm.notes,
        checklistProgress: taskCompletionForm.checklistProgress,
        overrideReason: missingRequired ? taskCompletionForm.overrideReason : undefined,
      });
      setCompletingTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Calendar Days Calculation
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];
    // Previous month padding
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, dateStr: null, isCurrentMonth: false });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({ day: i, dateStr, isCurrentMonth: true });
    }
    return days;
  }, [currentCalendarDate]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-xl shadow-lg border border-purple-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <CalendarClock className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">{t('Preventive Maintenance & Scheduling')}</h2>
          </div>
          <p className="text-xs text-purple-200/80 max-w-2xl">
            {t('Automated date-based recurrence engine, inspection checklists, status transitions, and compliance history.')}
          </p>
        </div>

        {(activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER') && (
          <button
            onClick={handleOpenCreatePlan}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('+ Create Maintenance Plan')}</span>
          </button>
        )}
      </div>

      {/* KPI Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => { setStatusFilter('OVERDUE'); setActiveTab('schedule'); }}
          className={`glass-panel p-3.5 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${statusFilter === 'OVERDUE' ? 'border-red-500 ring-2 ring-red-200 bg-red-50/30' : 'border-surface-200'}`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>{t('Overdue')}</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          </div>
          <p className="text-2xl font-black text-red-600">{kpiStats.overdue}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">{t('Requires Immediate Action')}</span>
        </button>

        <button
          onClick={() => { setStatusFilter('DUE_TODAY'); setActiveTab('schedule'); }}
          className={`glass-panel p-3.5 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${statusFilter === 'DUE_TODAY' ? 'border-amber-500 ring-2 ring-amber-200 bg-amber-50/30' : 'border-surface-200'}`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>{t('Due Today')}</span>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <p className="text-2xl font-black text-amber-600">{kpiStats.dueToday}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">{t('Scheduled For Today')}</span>
        </button>

        <button
          onClick={() => { setStatusFilter('DUE_SOON'); setActiveTab('schedule'); }}
          className={`glass-panel p-3.5 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${statusFilter === 'DUE_SOON' ? 'border-yellow-500 ring-2 ring-yellow-200 bg-yellow-50/30' : 'border-surface-200'}`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>{t('Due in 7 Days')}</span>
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          </div>
          <p className="text-2xl font-black text-yellow-600">{kpiStats.due7Days}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">{t('Upcoming Week')}</span>
        </button>

        <button
          onClick={() => { setStatusFilter('ALL'); setActiveTab('schedule'); }}
          className="glass-panel p-3.5 rounded-xl border border-surface-200 text-left transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>{t('Due in 30 Days')}</span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <p className="text-2xl font-black text-blue-600">{kpiStats.due30Days}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">{t('Upcoming Month')}</span>
        </button>

        <button
          onClick={() => { setStatusFilter('IN_PROGRESS'); setActiveTab('schedule'); }}
          className={`glass-panel p-3.5 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${statusFilter === 'IN_PROGRESS' ? 'border-purple-500 ring-2 ring-purple-200 bg-purple-50/30' : 'border-surface-200'}`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>{t('In Progress')}</span>
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          </div>
          <p className="text-2xl font-black text-purple-600">{kpiStats.inProgress}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">{t('Under Maintenance')}</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`glass-panel p-3.5 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${activeTab === 'plans' ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/30' : 'border-surface-200'}`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>{t('Active Plans')}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-2xl font-black text-emerald-600">{kpiStats.totalActivePlans}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">{t('Recurring Schedules')}</span>
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-surface-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'schedule' ? 'bg-purple-600 text-white shadow-sm' : 'bg-surface-100 text-slate-600 hover:bg-surface-200'}`}
          >
            <ListChecks className="w-4 h-4" />
            <span>{t('Schedule Table View')}</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'calendar' ? 'bg-purple-600 text-white shadow-sm' : 'bg-surface-100 text-slate-600 hover:bg-surface-200'}`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>{t('Calendar View')}</span>
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'plans' ? 'bg-purple-600 text-white shadow-sm' : 'bg-surface-100 text-slate-600 hover:bg-surface-200'}`}
          >
            <Wrench className="w-4 h-4" />
            <span>{t('Maintenance Plans Manager')} ({maintenancePlans.length})</span>
          </button>
        </div>

        {activeTab === 'schedule' && (
          <span className="text-xs text-slate-500 font-semibold">
            {t('Showing')} {filteredTasks.length} {t('Tasks')}
          </span>
        )}
      </div>

      {/* ─── TAB 1: SCHEDULE TABLE VIEW ────────────────────────────────────────── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('Search by asset, serial #, task title...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">{t('Status: All')}</option>
                <option value="OVERDUE">🔴 {t('Overdue')}</option>
                <option value="DUE_TODAY">🟠 {t('Due Today')}</option>
                <option value="DUE_SOON">🟡 {t('Due Soon (<=30 Days)')}</option>
                <option value="UPCOMING">🔵 {t('Upcoming (>30 Days)')}</option>
                <option value="IN_PROGRESS">🟣 {t('In Progress')}</option>
                <option value="COMPLETED">🟢 {t('Completed')}</option>
                <option value="PENDING">{t('Pending')}</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">{t('Priority: All')}</option>
                <option value="CRITICAL">🔥 {t('CRITICAL')}</option>
                <option value="HIGH">⚡ {t('HIGH')}</option>
                <option value="MEDIUM">⚡ {t('MEDIUM')}</option>
                <option value="LOW">🔹 {t('LOW')}</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">{t('Type: All')}</option>
                <option value="PREVENTIVE">{t('PREVENTIVE')}</option>
                <option value="INSPECTION">{t('INSPECTION')}</option>
                <option value="SERVICE">{t('SERVICE')}</option>
                <option value="SAFETY_CHECK">{t('SAFETY_CHECK')}</option>
                <option value="CLEANING">{t('CLEANING')}</option>
                <option value="LUBRICATION">{t('LUBRICATION')}</option>
              </select>

              {categoriesList.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">{t('Category: All')}</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Schedule Table */}
          <div className="glass-panel p-5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="px-4 py-3 font-semibold">{t('Task #')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Asset Details')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Maintenance Title & Type')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Priority')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Due Date')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Responsible')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Status')}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-slate-700">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="font-semibold text-slate-700 text-sm">{t('No maintenance tasks matching filters')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t('All equipment maintenance is up to date.')}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const dueInfo = getTaskDueInfo(task.dueDate, task.status);
                      const targetAsset = assets.find(a => a.id === task.assetId);

                      return (
                        <tr key={task.id} className="hover:bg-surface-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-purple-700">{task.taskNumber}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => targetAsset && setSelectedAssetFor360(targetAsset)}
                              className="font-semibold text-slate-800 hover:text-purple-600 text-left transition-colors cursor-pointer"
                            >
                              {task.assetName}
                            </button>
                            <span className="font-mono text-[10px] text-slate-400 block">{task.assetNumber} {task.assetSerialNumber ? `• SN: ${task.assetSerialNumber}` : ''}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 block">{task.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-slate-500 font-bold uppercase inline-block mt-0.5">
                              {task.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${task.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                              task.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                task.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-slate-50 text-slate-600 border-slate-200'
                              }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{task.dueDate}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-block mt-0.5 w-fit ${dueInfo.badgeClass}`}>
                                {dueInfo.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {task.assignedToName || t('Unassigned')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${task.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              task.status === 'IN_PROGRESS' ? 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse' :
                                task.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                              {t(task.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {task.status === 'PENDING' && (
                                <button
                                  onClick={async () => await startMaintenanceTask(task.id)}
                                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                                  title={t('Start Maintenance (Set Asset to IN_SERVICE)')}
                                >
                                  <Play className="w-3 h-3 fill-white" />
                                  <span>{t('Start')}</span>
                                </button>
                              )}

                              {task.status === 'IN_PROGRESS' && (
                                <button
                                  onClick={() => handleOpenCompleteTask(task)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                                  title={t('Complete Task & Re-activate Asset')}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{t('Complete')}</span>
                                </button>
                              )}

                              {task.status === 'COMPLETED' && (
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{task.result || 'PASS'}</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CALENDAR VIEW ────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="glass-panel p-5 space-y-4">
          {/* Calendar Header Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-surface-200">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-800">
                {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setCurrentCalendarDate(new Date())}
                className="px-2.5 py-1 bg-surface-100 hover:bg-surface-200 rounded text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
              >
                {t('Today')}
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1))}
                className="p-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-xs font-bold text-slate-400 uppercase bg-surface-50 rounded-t">
                {day}
              </div>
            ))}

            {calendarDays.map((item, idx) => {
              if (!item.isCurrentMonth || !item.dateStr) {
                return <div key={idx} className="min-h-[100px] bg-surface-50/40 rounded border border-surface-100/50 p-1" />;
              }

              const isTodayStr = item.dateStr === new Date().toISOString().slice(0, 10);
              const dayTasks = maintenanceTasks.filter(t => t.dueDate === item.dateStr);

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-1.5 rounded border transition-colors ${isTodayStr ? 'bg-purple-50/40 border-purple-300 ring-1 ring-purple-200' : 'bg-white border-surface-200'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isTodayStr ? 'w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center' : 'text-slate-600'}`}>
                      {item.day}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[9px] font-bold px-1 rounded bg-purple-100 text-purple-700">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-20">
                    {dayTasks.map((t) => {
                      const dueInfo = getTaskDueInfo(t.dueDate, t.status);
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            if (t.status === 'IN_PROGRESS') handleOpenCompleteTask(t);
                            else if (t.status === 'PENDING') startMaintenanceTask(t.id);
                          }}
                          className={`p-1 rounded text-[10px] font-medium leading-tight truncate cursor-pointer shadow-xs border ${dueInfo.badgeClass}`}
                          title={`${t.taskNumber}: ${t.title} (${t.assetName})`}
                        >
                          <span className="font-bold block truncate">{t.assetName}</span>
                          <span className="text-[9px] opacity-80 truncate block">{t.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: MAINTENANCE PLANS MANAGER ───────────────────────────────── */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">{t('Recurring Maintenance Plans')}</h3>
              {(activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER') && (
                <button
                  onClick={handleOpenCreatePlan}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('Create Plan')}</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="px-4 py-3 font-semibold">{t('Plan Name & Type')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Target Equipment')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Recurrence Schedule')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Last Completed')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Next Due Date')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Responsible')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Status')}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-slate-700">
                  {maintenancePlans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">{t('No maintenance plans defined yet.')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t('Click "+ Create Maintenance Plan" above to schedule recurring preventive service.')}</p>
                      </td>
                    </tr>
                  ) : (
                    maintenancePlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-surface-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 block">{plan.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold uppercase inline-block mt-0.5">
                            {plan.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {plan.assetName}
                          <span className="font-mono text-[10px] text-slate-400 block">{plan.assetNumber}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {t('Every')} {plan.frequency} {t(plan.frequencyUnit)}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {plan.lastCompletedDate || t('Never')}
                        </td>
                        <td className="px-4 py-3 font-bold text-purple-700">
                          {plan.nextDueDate}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {plan.responsibleName || t('Unassigned')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${plan.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            plan.status === 'PAUSED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                            {t(plan.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {plan.status === 'ACTIVE' ? (
                              <button
                                onClick={() => setPlanStatus(plan.id, 'PAUSED')}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded transition-colors"
                                title={t('Pause Plan')}
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setPlanStatus(plan.id, 'ACTIVE')}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded transition-colors"
                                title={t('Resume Plan')}
                              >
                                <Play className="w-3.5 h-3.5 fill-emerald-700" />
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEditPlan(plan)}
                              className="p-1.5 bg-surface-100 hover:bg-surface-200 text-slate-600 rounded transition-colors"
                              title={t('Edit Plan')}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm(t('Are you sure you want to delete this maintenance plan?'))) {
                                  await deleteMaintenancePlan(plan.id);
                                }
                              }}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
                              title={t('Delete Plan')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: CREATE / EDIT MAINTENANCE PLAN ──────────────────────────── */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-surface-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-surface-200">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-slate-800">
                  {editingPlan ? t('Edit Maintenance Plan') : t('Create Preventive Maintenance Plan')}
                </h3>
              </div>
              <button onClick={() => setShowCreatePlanModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Select Target Equipment')} *</label>
                  <select
                    value={planForm.assetId}
                    onChange={(e) => setPlanForm({ ...planForm, assetId: e.target.value })}
                    required
                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.assetNumber}) - {a.category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Maintenance Plan Name')} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engine Oil & Filter Service"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Maintenance Type')}</label>
                  <select
                    value={planForm.type}
                    onChange={(e) => setPlanForm({ ...planForm, type: e.target.value as MaintenanceType })}
                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="PREVENTIVE">{t('PREVENTIVE')}</option>
                    <option value="INSPECTION">{t('INSPECTION')}</option>
                    <option value="SERVICE">{t('SERVICE')}</option>
                    <option value="SAFETY_CHECK">{t('SAFETY_CHECK')}</option>
                    <option value="CLEANING">{t('CLEANING')}</option>
                    <option value="LUBRICATION">{t('LUBRICATION')}</option>
                    <option value="OTHER">{t('OTHER')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Priority')}</label>
                  <select
                    value={planForm.priority}
                    onChange={(e) => setPlanForm({ ...planForm, priority: e.target.value as PlanPriority })}
                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="LOW">{t('LOW')}</option>
                    <option value="MEDIUM">{t('MEDIUM')}</option>
                    <option value="HIGH">{t('HIGH')}</option>
                    <option value="CRITICAL">{t('CRITICAL')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Responsible Person')}</label>
                  <select
                    value={planForm.responsibleId}
                    onChange={(e) => setPlanForm({ ...planForm, responsibleId: e.target.value })}
                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">{t('Unassigned')}</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.position})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Schedule Section */}
              <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-3">
                <span className="font-bold text-purple-900 block text-xs flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-purple-600" />
                  {t('Recurring Interval & Schedule')}
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">{t('Repeat Every (Frequency)')}</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.frequency}
                      onChange={(e) => setPlanForm({ ...planForm, frequency: Number(e.target.value) || 1 })}
                      className="w-full p-2 bg-white border border-surface-200 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">{t('Frequency Unit')}</label>
                    <select
                      value={planForm.frequencyUnit}
                      onChange={(e) => setPlanForm({ ...planForm, frequencyUnit: e.target.value as FrequencyUnit })}
                      className="w-full p-2 bg-white border border-surface-200 rounded-lg outline-none"
                    >
                      <option value="DAYS">{t('Days')}</option>
                      <option value="WEEKS">{t('Weeks')}</option>
                      <option value="MONTHS">{t('Months')}</option>
                      <option value="YEARS">{t('Years')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">{t('First Due Date')}</label>
                    <input
                      type="date"
                      value={planForm.firstDueDate}
                      onChange={(e) => setPlanForm({ ...planForm, firstDueDate: e.target.value })}
                      className="w-full p-2 bg-white border border-surface-200 rounded-lg outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Instructions & Required Parts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Maintenance Instructions')}</label>
                  <textarea
                    rows={2}
                    placeholder="Step by step maintenance guidelines..."
                    value={planForm.instructions}
                    onChange={(e) => setPlanForm({ ...planForm, instructions: e.target.value })}
                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Required Parts & Materials')}</label>
                  <textarea
                    rows={2}
                    placeholder="Oil filter #124, Synthetic 5W-30 Oil 5L..."
                    value={planForm.requiredParts}
                    onChange={(e) => setPlanForm({ ...planForm, requiredParts: e.target.value })}
                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Checklist Builder */}
              <div className="p-3 bg-surface-50 border border-surface-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 block text-xs flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-purple-600" />
                    {t('Inspection Checklist Template')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = (planForm.checklist.length + 1).toString();
                      setPlanForm({
                        ...planForm,
                        checklist: [...planForm.checklist, { id: newId, title: '', required: true }],
                      });
                    }}
                    className="text-purple-600 hover:text-purple-700 font-bold text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('Add Checklist Item')}</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {planForm.checklist.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Inspect hydraulic lines for leaks"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...planForm.checklist];
                          updated[index].title = e.target.value;
                          setPlanForm({ ...planForm, checklist: updated });
                        }}
                        className="flex-1 p-1.5 bg-white border border-surface-200 rounded outline-none text-xs"
                      />
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={item.required}
                          onChange={(e) => {
                            const updated = [...planForm.checklist];
                            updated[index].required = e.target.checked;
                            setPlanForm({ ...planForm, checklist: updated });
                          }}
                        />
                        <span>{t('Required')}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = planForm.checklist.filter((_, i) => i !== index);
                          setPlanForm({ ...planForm, checklist: updated });
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-slate-700 rounded-lg font-semibold"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-md"
                >
                  {editingPlan ? t('Update Plan') : t('Save Maintenance Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: COMPLETE MAINTENANCE TASK ─────────────────────────────── */}
      {completingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-surface-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-surface-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-800">{t('Complete Maintenance Task')}</h3>
                  <span className="text-xs text-purple-700 font-mono font-bold">{completingTask.taskNumber} • {completingTask.assetName}</span>
                </div>
              </div>
              <button onClick={() => setCompletingTask(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTaskCompletion} className="space-y-4 text-xs">
              {/* Mandatory Checklist Items */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-purple-600" />
                  {t('Perform Required Inspection Checklist')}
                </span>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {taskCompletionForm.checklistProgress.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleToggleChecklistItem(idx)}
                      className={`p-2 rounded border flex items-center justify-between cursor-pointer transition-colors ${item.completed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-surface-200 text-slate-700'}`}
                    >
                      <div className="flex items-center gap-2">
                        {item.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span className={`font-semibold ${item.completed ? 'line-through opacity-80' : ''}`}>
                          {item.title}
                        </span>
                      </div>
                      {item.required && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 uppercase">
                          {t('Required')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Manager Checklist Override Check */}
              {taskCompletionForm.checklistProgress.some(i => i.required && !i.completed) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>{t('Manager Checklist Override Required')}</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    {t('One or more required checklist items are unchecked. Please state reason for manager override.')}
                  </p>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spare part on backorder, approved by Lead Engineer..."
                    value={taskCompletionForm.overrideReason}
                    onChange={(e) => setTaskCompletionForm({ ...taskCompletionForm, overrideReason: e.target.value })}
                    className="w-full p-2 bg-white border border-amber-300 rounded outline-none text-xs"
                  />
                </div>
              )}

              {/* Costs & Outcome Result */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Actual Duration (Minutes)')}</label>
                  <input
                    type="number"
                    min="1"
                    value={taskCompletionForm.actualDurationMinutes}
                    onChange={(e) => setTaskCompletionForm({ ...taskCompletionForm, actualDurationMinutes: Number(e.target.value) })}
                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Labor Cost (€)')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taskCompletionForm.laborCost}
                    onChange={(e) => setTaskCompletionForm({ ...taskCompletionForm, laborCost: Number(e.target.value) })}
                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Parts Cost (€)')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taskCompletionForm.partsCost}
                    onChange={(e) => setTaskCompletionForm({ ...taskCompletionForm, partsCost: Number(e.target.value) })}
                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Maintenance Result Outcome')}</label>
                  <select
                    value={taskCompletionForm.result}
                    onChange={(e) => setTaskCompletionForm({ ...taskCompletionForm, result: e.target.value as TaskResult })}
                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none font-bold"
                  >
                    <option value="PASS">🟢 PASS ({t('Return to Available')})</option>
                    <option value="PASS_WITH_NOTES">🟡 PASS WITH NOTES ({t('Return to Available')})</option>
                    <option value="FAILED">🔴 FAILED ({t('Set Asset to DAMAGED')})</option>
                    <option value="NOT_COMPLETED">⚪ NOT COMPLETED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">{t('Total Calculated Cost')}</label>
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg font-black text-purple-800 text-sm">
                    €{((taskCompletionForm.laborCost || 0) + (taskCompletionForm.partsCost || 0)).toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">{t('Technician Remarks & Notes')}</label>
                <textarea
                  rows={2}
                  placeholder="Replaced air filter, checked fluid pressure..."
                  value={taskCompletionForm.notes}
                  onChange={(e) => setTaskCompletionForm({ ...taskCompletionForm, notes: e.target.value })}
                  className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-slate-700 rounded-lg font-semibold"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md"
                >
                  {t('Submit & Complete Maintenance')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
