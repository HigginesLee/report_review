/**
 * @module UI
 * @description Handles all UI rendering and view management.
 */
import { state } from './state.js';
import { courseData, difyTemplates } from './config.js';
import {
    isSingleType,
    getExpReportType,
    getExpCount,
    formatDate
} from './utils.js';
import {
    loadPromptFromStorage,
    savePromptToStorage
} from './task.js';
import { showView } from './view.js';
// ===== UI 视图与渲染逻辑 =====


/**
 * 选择课程并跳转到报告列表
 */
export function selectCourse(courseId, courseName) {
    state.currentCourse = { id: courseId, name: courseName };
    const course = courseData[courseId];
    if (!course) return;

    document.getElementById('listCourseName').textContent = courseName;
    generateReportGroups(course.experiments);
    updateSelectionSummary();
    showView('reportListView');
}

/**
 * 为实验列表生成报告分组 HTML (双栏 Master-Detail 布局)
 */
export function generateReportGroups(experiments) {
    const container = document.getElementById('reportGroups');
    if (!container) return;
    container.innerHTML = '';

    const splitView = document.createElement('div');
    splitView.className = 'report-split-view';

    // 左侧导航栏
    const sidebar = document.createElement('div');
    sidebar.className = 'exp-sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-header">实验列表</div>
        <div class="exp-nav-list" id="expNavList"></div>
    `;

    // 右侧内容区
    const contentArea = document.createElement('div');
    contentArea.className = 'exp-content';
    contentArea.innerHTML = `
        <div class="exp-content-header">
            <h4 id="activeExpName">请选择实验</h4>
            <div id="activeExpToolbar"></div>
        </div>
        <div class="exp-table-scroll" id="expTableScroll"></div>
    `;

    splitView.appendChild(sidebar);
    splitView.appendChild(contentArea);
    container.appendChild(splitView);

    const navList = sidebar.querySelector('#expNavList');
    const tableScroll = contentArea.querySelector('#expTableScroll');
    const expNameHeader = contentArea.querySelector('#activeExpName');
    const expToolbar = contentArea.querySelector('#activeExpToolbar');

    experiments.forEach((exp, index) => {
        // 创建导航项
        const navItem = document.createElement('div');
        navItem.className = `exp-nav-item ${index === 0 ? 'active' : ''}`;
        navItem.dataset.expId = exp.id;
        navItem.innerHTML = `
            <span>${exp.name}</span>
            <span class="exp-nav-badge" id="nav_badge_${exp.id}">0</span>
        `;
        navItem.onclick = () => switchExperimentTab(exp.id);
        navList.appendChild(navItem);

        // 创建内容节
        const section = document.createElement('div');
        section.className = `exp-content-section ${index === 0 ? 'active' : ''}`;
        section.id = `section_${exp.id}`;
        section.innerHTML = `
            <div class="table-container" style="border:none; border-radius:0;">
                <table>
                    <thead>
                        <tr>
                            <th width="50"><input type="checkbox" class="checkbox-all" data-exp-all="${exp.id}"></th>
                            <th>学号</th>
                            <th>姓名</th>
                            <th>报告类型</th>
                            <th>提交时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody id="tbody_${exp.id}">
                        ${generateReportRows(exp)}
                    </tbody>
                </table>
            </div>
        `;
        tableScroll.appendChild(section);

        if (index === 0) {
            expNameHeader.textContent = exp.name;
            expToolbar.innerHTML = `<input type="checkbox" class="checkbox-all" data-exp-all="${exp.id}" id="main_cb_all_${exp.id}"> <label for="main_cb_all_${exp.id}" style="font-size:13px; color:#64748b; cursor:pointer;">全选当前实验</label>`;
        }
    });

    // 绑定全选事件 (需要处理动态切换后的绑定或是统一委托)
    container.querySelectorAll('.checkbox-all').forEach(cb => {
        cb.addEventListener('change', (e) => toggleAll(e.target, e.target.dataset.expAll));
    });

    if (!container.dataset.listener) {
        container.addEventListener('change', (e) => {
            if (e.target && e.target.matches('input.checkbox')) {
                updateSelectionSummary();
            }
        });
        container.dataset.listener = 'true';
    }
    updateSelectionSummary();
}

/**
 * 切换显示的实验
 */
export function switchExperimentTab(expId) {
    // 更新导航项状态
    document.querySelectorAll('.exp-nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.expId === expId);
    });

    // 更新内容区状态
    document.querySelectorAll('.exp-content-section').forEach(el => {
        el.classList.toggle('active', el.id === `section_${expId}`);
    });

    // 更新标题
    const exp = Object.values(courseData).flatMap(c => c.experiments).find(e => e.id === expId);
    if (exp) {
        document.getElementById('activeExpName').textContent = exp.name;
        const toolbar = document.getElementById('activeExpToolbar');
        const isAllSelected = document.querySelectorAll(`input.checkbox[data-exp="${expId}"]`).length ===
            document.querySelectorAll(`input.checkbox[data-exp="${expId}"]:checked`).length;

        toolbar.innerHTML = `<input type="checkbox" class="checkbox-all" data-exp-all="${expId}" id="main_cb_all_${expId}" ${isAllSelected ? 'checked' : ''}> <label for="main_cb_all_${expId}" style="font-size:13px; color:#64748b; cursor:pointer;">全选当前实验</label>`;

        toolbar.querySelector('.checkbox-all').addEventListener('change', (e) => toggleAll(e.target, expId));
    }
}

function generateReportRows(exp) {
    let rows = '';
    const hasSingleType = isSingleType(exp);
    const totalCount = getExpCount(exp);

    for (let i = 0; i < totalCount; i++) {
        const isWord = hasSingleType ? (getExpReportType(exp) === 'word') : (i < (exp.wordCount || 0));
        const studentId = 2021001 + i;
        const studentName = `学生${i + 1}`;
        const type = isWord ? 'Word' : 'Dify YAML';
        const badgeClass = isWord ? 'badge-word' : 'badge-dify';
        const idx = i;

        rows += `
            <tr id="row_${exp.id}_${idx}">
                <td><input type="checkbox" class="checkbox" data-exp="${exp.id}" data-type="${isWord ? 'word' : 'dify'}" data-idx="${idx}"></td>
                <td>${studentId}</td>
                <td>${studentName}</td>
                <td><span class="badge ${badgeClass}">${type}</span></td>
                <td>${formatDate()}</td>
                <td><button class="btn btn-primary btn-view-report" data-action="viewReport" data-exp="${exp.id}" data-idx="${idx}" style="padding: 6px 12px; font-size: 12px;">查看</button></td>
            </tr>
        `;
    }
    return rows;
}

/**
 * 切换全选状态
 * @param {HTMLInputElement} checkbox - 全选复选框
 * @param {string} expId - 实验ID
 */
function toggleAll(checkbox, expId) {
    const checkboxes = document.querySelectorAll(`input.checkbox[data-exp="${expId}"]`);
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
    updateSelectionSummary();
}

export function updateSelectionSummary() {
    const count = document.querySelectorAll('input.checkbox:checked').length;
    const bar = document.getElementById('selectionSummary');
    const numEl = document.getElementById('selectedCount');
    if (!bar || !numEl) return;

    if (count > 0) {
        bar.style.display = 'flex';
        numEl.textContent = String(count);
    } else {
        bar.style.display = 'none';
    }

    // 更新侧边栏每个实验的计数
    const expIds = new Set();
    document.querySelectorAll('input.checkbox').forEach(cb => expIds.add(cb.dataset.exp));

    expIds.forEach(id => {
        const expSelectedCount = document.querySelectorAll(`input.checkbox[data-exp="${id}"]:checked`).length;
        const badge = document.getElementById(`nav_badge_${id}`);
        if (badge) {
            badge.textContent = expSelectedCount;
            badge.style.display = expSelectedCount > 0 ? 'inline-block' : 'none';
        }
    });

    // 更新当前主全选框状态
    const activeSection = document.querySelector('.exp-content-section.active');
    if (activeSection) {
        const expId = activeSection.id.replace('section_', '');
        const allCbs = document.querySelectorAll(`input.checkbox[data-exp="${expId}"]`);
        const checkedCbs = document.querySelectorAll(`input.checkbox[data-exp="${expId}"]:checked`);
        const mainCb = document.getElementById(`main_cb_all_${expId}`);
        if (mainCb) {
            mainCb.checked = allCbs.length > 0 && allCbs.length === checkedCbs.length;
        }
    }
}

export function selectAllVisible() {
    const activeSection = document.querySelector('.exp-content-section.active');
    if (!activeSection) {
        // 如果没有激活的，则全选所有（兜底）
        document.querySelectorAll('#reportGroups input.checkbox').forEach(cb => cb.checked = true);
    } else {
        activeSection.querySelectorAll('input.checkbox').forEach(cb => cb.checked = true);
        const expId = activeSection.id.replace('section_', '');
        document.querySelectorAll(`.checkbox-all[data-exp-all="${expId}"]`).forEach(cb => cb.checked = true);
    }
    updateSelectionSummary();
}

export function clearAllSelection() {
    document.querySelectorAll('#reportGroups input.checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('#reportGroups .checkbox-all').forEach(cb => cb.checked = false);
    updateSelectionSummary();
}

export function onTypeChange(expId) {
    const selectEl = document.getElementById(`type_${expId}`);
    if (!selectEl) return;
    const val = selectEl.value;
    const wordEl = document.getElementById(`word_section_${expId}`);
    const difyEl = document.getElementById(`dify_section_${expId}`);
    if (wordEl && difyEl) {
        if (val === 'word') {
            wordEl.style.display = 'block';
            difyEl.style.display = 'none';
        } else {
            wordEl.style.display = 'none';
            difyEl.style.display = 'block';
        }
    }
    const { updateConfigProgress } = document.appActions || {};
    if (updateConfigProgress) updateConfigProgress();
}

export function onSimSpeedChange(val) {
    state.simulationSpeedMs = parseInt(val, 10) || 500;
    const lab = document.getElementById('simSpeedLabel');
    if (lab) lab.textContent = `${state.simulationSpeedMs} ms/步`;
}

export function applyTemplate(expId, type, template, quiet = false) {
    const templates = {
        word: {
            comprehensive: '请从以下维度对实验报告进行全面评阅：\n1. 实验目的和原理理解（20分）\n2. 实验步骤完整性和准确性（30分）\n3. 数据记录和分析质量（30分）\n4. 结论合理性和思考深度（20分）\n请给出每个维度的具体评分和改进建议。',
            format: '请重点检查实验报告的格式规范性：\n1. 标题、章节结构是否规范\n2. 图表编号 and 标注是否完整\n3. 参考文献格式是否正确\n4. 页面排版是否美观\n请指出格式问题并给出修改建议。',
            content: '请深入评估实验报告的内容质量：\n1. 对实验原理的理解深度\n2. 实验设计的合理性\n3. 数据分析的科学性\n4. 问题思考的创新性\n请给出详细的内容评价和提升建议。'
        },
        dify: difyTemplates
    };

    const val = templates[type][template];

    try {
        const data = loadPromptFromStorage(state.currentCourse.id, expId) || {};
        data.type = type;
        data.prompt = val;
        savePromptToStorage(state.currentCourse.id, expId, data);
        state.experimentPrompts[expId] = { type: type, prompt: val };

        if (!quiet) {
            const { updateConfigProgress } = document.appActions || {};
            if (updateConfigProgress) updateConfigProgress();
        }
    } catch (e) {
        console.error('Failed to apply template:', e);
    }
}

export function applyTemplateToAll(type, template) {
    const configRows = document.querySelectorAll('.experiment-row');
    let count = 0;
    configRows.forEach(row => {
        const expId = row.id.replace('config_row_', '');
        const cached = loadPromptFromStorage(state.currentCourse.id, expId);
        const currentType = cached?.type || type;

        if (currentType === type) {
            applyTemplate(expId, type, template, true);
            count++;
        }
    });

    if (count > 0) {
        const { updateConfigProgress } = document.appActions || {};
        if (updateConfigProgress) updateConfigProgress();
        alert(`已成功为 ${count} 个 ${type === 'word' ? 'Word' : 'Dify'} 实验应用模板。`);
    } else {
        alert(`未找到需要配置的 ${type === 'word' ? 'Word' : 'Dify'} 实验。`);
    }
}

/**
 * 关闭配置弹窗
 */
export function closeConfigModal() {
    const modal = document.getElementById('configModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    state.editingExpId = null;
}

/**
 * 弹窗内应用模板
 */
export function modalApplyTemplate(type, template) {
    const expId = state.editingExpId;
    if (!expId) return;

    // Use existing applyTemplate to save and update progress
    applyTemplate(expId, type, template, true);

    // Update local textarea
    const ta = type === 'word' ? document.getElementById('modalWordPrompt') : document.getElementById('modalDifyPrompt');
    const templates = {
        word: {
            comprehensive: '请从以下维度对实验报告进行全面评阅：\n1. 实验目的和原理理解（20分）\n2. 实验步骤完整性和准确性（30分）\n3. 数据记录和分析质量（30分）\n4. 结论合理性和思考深度（20分）\n请给出每个维度的具体评分和改进建议。',
            format: '请重点检查实验报告的格式规范性：\n1. 标题、章节结构是否规范\n2. 图表编号和标注是否完整\n3. 参考文献格式是否正确\n4. 页面排版是否美观\n请指出格式问题并给出修改建议。',
            content: '请深入评估实验报告的内容质量：\n1. 对实验原理的理解深度\n2. 实验设计的合理性\n3. 数据分析的科学性\n4. 问题思考的创新性\n请给出详细的内容评价和提升建议。'
        },
        dify: difyTemplates
    };
    if (ta) ta.value = templates[type][template];

    const { updateConfigProgress } = document.appActions || {};
    if (updateConfigProgress) updateConfigProgress();

    // Update list status
    import('./task.js').then(m => m.updateConfigRowStatus(expId));
}

/**
 * 关闭查看弹窗
 */
export function closeViewModal() {
    const modal = document.getElementById('viewPromptModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

export function showHome() {
    showView('courseSelectView');
    renderHomeTaskRecords();
}

/**
 * 渲染首页任务记录表格
 */
export function renderHomeTaskRecords() {
    const container = document.getElementById('homeTaskRecords');
    if (!container) return;
    const { loadTaskRecords } = document.appActions || { loadTaskRecords: () => [] };
    const list = loadTaskRecords();
    if (!list || list.length === 0) {
        container.innerHTML = '<div class="muted">暂无记录，完成一次评阅后将在此展示。</div>';
        return;
    }
    const top = list.slice(0, 5);
    container.innerHTML = `
        <table class="simple-table">
            <thead><tr><th>时间</th><th>课程</th><th>处理数</th><th>平均分</th></tr></thead>
            <tbody>
                ${top.map(r => `<tr><td>${formatDate(new Date(r.finishedAt))}</td><td>${r.courseName}</td><td>${r.total}</td><td>${r.total ? r.avgScore.toFixed(1) : '-'}</td></tr>`).join('')}
            </tbody>
        </table>
    `;
}
