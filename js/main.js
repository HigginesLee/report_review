/**
 * @module Main
 * @description Application entry point, handles global initialization and event delegation.
 */
import { state } from './state.js';
import {
    selectCourse,
    showHome,
    selectAllVisible,
    clearAllSelection,
    onSimSpeedChange,
    applyTemplate,
    onTypeChange,
    updateSelectionSummary,
    renderHomeTaskRecords,
    closeConfigModal,
    modalApplyTemplate,
    closeViewModal
} from './ui.js';
import { showView } from './view.js';
import {
    goToPromptConfig,
    startReviewWithPrompts,
    startReview,
    pauseTask,
    loadTaskRecords,
    clearAllTaskRecords,
    deleteTaskRecord,
    openConfigModal,
    updateModalSections,
    openViewPromptModal
} from './task.js';
import {
    showTeachingStats,
    viewSummary,
    exportReport,
    renderTaskRecordsTable,
    viewTaskRecord,
    viewStudentDetails
} from './stats.js';
import { formatDate } from './utils.js';

// ===== 初始化与事件委托 =====

/**
 * 页面加载初始化
 */
window.onload = function () {
    // 基础初始化
    initializeAppActions();
    renderHomeTaskRecords();

    // 全局事件委托 (Click)
    document.addEventListener('click', handleGlobalClick);

    // 全局事件委托 (Change)
    document.addEventListener('change', handleGlobalChange);

    // 特殊监听器 (input) - 模拟速度拖动
    const simSpeedRange = document.getElementById('simSpeed');
    if (simSpeedRange) {
        simSpeedRange.addEventListener('input', (e) => onSimSpeedChange(e.target.value));
    }
};

/**
 * 暴露全局动作以便跨模块访问
 */
function initializeAppActions() {
    document.appActions = {
        loadTaskRecords,
        showView,
        renderTaskRecordsTable,
        renderHomeTaskRecords,
        updateConfigProgress: (params) => {
            import('./task.js').then(m => m.updateConfigProgress(params));
        }
    };
}

/**
 * 处理全局点击事件（委托）
 */
function handleGlobalClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    const name = target.dataset.name;
    const view = target.dataset.view;

    switch (action) {
        case 'showHome':
            showHome();
            break;
        case 'showTeachingStats':
            showTeachingStats();
            break;
        case 'showTaskRecords':
            renderTaskRecordsTable(loadTaskRecords());
            showView('taskRecordsView');
            break;
        case 'selectCourse':
            selectCourse(id, name);
            break;
        case 'showView':
            showView(view);
            break;
        case 'goToPromptConfig':
            goToPromptConfig();
            break;
        case 'startReviewWithPrompts':
            startReviewWithPrompts();
            break;
        case 'startBatchReview':
            startBatchReview();
            break;
        case 'selectAllVisible':
            selectAllVisible();
            break;
        case 'clearAllSelection':
            clearAllSelection();
            break;
        case 'pauseTask':
            pauseTask();
            break;
        case 'viewSummary':
            viewSummary();
            break;
        case 'exportReport':
            exportReport();
            break;
        case 'clearAllTaskRecords':
            clearAllTaskRecords();
            break;
        case 'viewTaskRecord':
            viewTaskRecord(id);
            break;
        case 'viewStudentDetails':
            // student id passed in dataset as student-id (可能是姓名或学号)
            import('./stats.js').then(m => m.viewStudentDetails(target.dataset.studentId || target.dataset.student));
            break;
        case 'deleteTaskRecord':
            deleteTaskRecord(id);
            break;
        case 'viewReport':
            alert(`正在查看报告：实验ID=${target.dataset.exp}, 索引=${target.dataset.idx}`);
            break;
        case 'applyTemplate':
            applyTemplate(target.dataset.exp, target.dataset.type, target.dataset.template);
            break;
        case 'applyTemplateToAll':
            import('./ui.js').then(m => m.applyTemplateToAll(target.dataset.type, target.dataset.template));
            break;
        case 'toggleConfigCollapse':
            import('./ui.js').then(m => m.toggleConfigCollapse(target.dataset.exp));
            break;
        case 'expandAllConfigs':
            import('./ui.js').then(m => m.expandAllConfigs());
            break;
        case 'collapseAllConfigs':
            import('./ui.js').then(m => m.collapseAllConfigs());
            break;
        case 'openConfigModal':
            openConfigModal(target.dataset.exp);
            break;
        case 'closeConfigModal':
            closeConfigModal();
            break;
        case 'modalApplyTemplate':
            modalApplyTemplate(target.dataset.type, target.dataset.template);
            break;
        case 'openViewPromptModal':
            openViewPromptModal(target.dataset.exp);
            break;
        case 'closeViewModal':
            closeViewModal();
            break;
    }
}

/**
 * 处理全局改变事件（委托）
 * @param {Event} e 
 */
function handleGlobalChange(e) {
    const target = e.target;
    if (!target) return;

    const action = target.dataset.action;
    const expId = target.dataset.exp;

    if (action === 'changeExpType') {
        onTypeChange(expId);
    } else if (action === 'modalChangeType') {
        updateModalSections(target.value);
    }
}

/**
 * 批量评阅逻辑
 */
export function startBatchReview() {
    const promptedExpIds = Object.keys(state.experimentPrompts).filter(id => {
        const p = state.experimentPrompts[id];
        return p && typeof p.prompt === 'string' && p.prompt.trim().length > 0;
    });

    const notSelected = promptedExpIds.filter(expId => {
        return document.querySelectorAll(`input.checkbox[data-exp="${expId}"]:checked`).length === 0;
    });

    if (notSelected.length > 0) {
        const confirmAuto = confirm(`检测到 ${notSelected.length} 个已填写提示词的实验未选择任何报告。是否为这些实验自动选择全部报告？`);
        if (confirmAuto) {
            notSelected.forEach(expId => {
                const boxes = document.querySelectorAll(`input.checkbox[data-exp="${expId}"]`);
                boxes.forEach(cb => cb.checked = true);
            });
            updateSelectionSummary();
        }
    }

    const finalChecked = Array.from(document.querySelectorAll('input.checkbox:checked'));
    if (finalChecked.length === 0) {
        alert('请至少选择一份报告进行批量评阅！');
        return;
    }

    const reports = finalChecked.map(cb => ({
        expId: cb.getAttribute('data-exp'),
        type: cb.getAttribute('data-type'),
        idx: parseInt(cb.getAttribute('data-idx'))
    }));

    startReview(reports);
}
