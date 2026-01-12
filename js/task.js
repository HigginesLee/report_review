/**
 * @module Task
 * @description Manages task execution, prompt configuration, and persistence.
 */
import { state } from './state.js';
import { courseData } from './config.js';
import {
    getExpCount,
    getExpReportType,
    strHash,
    formatDate
} from './utils.js';
import { showView } from './view.js';
import { generateDetailedReportHtml } from './stats.js';

/**
 * 从本地存储读取提示词配置
 * @param {string} courseId 
 * @param {string} expId 
 * @returns {Object|null}
 */
export function loadPromptFromStorage(courseId, expId) {
    try {
        const raw = localStorage.getItem(`promptConfig:${courseId}:${expId}`);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.error('Error loading prompt from storage:', e);
        return null;
    }
}

/**
 * 将提示词配置保存到本地存储
 */
export function savePromptToStorage(courseId, expId, data) {
    try {
        localStorage.setItem(`promptConfig:${courseId}:${expId}`, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving prompt to storage:', e);
    }
}

/**
 * 进入提示词配置界面 (已弃用，功能已合并至选择报告页面)
 */
export function goToPromptConfig() {
    showView('reportListView');
}

/**
 * 关于实验报告配置界面的动态生成
 * @param {Array} experiments - 实验列表
 */
export function generateExperimentConfigs(experiments) {
    const container = document.getElementById('experimentConfigs');
    container.innerHTML = '';
    container.classList.add('experiment-list-compact');

    experiments.forEach((exp) => {
        const cached = loadPromptFromStorage(state.currentCourse.id, exp.id);
        const isConfigured = cached && cached.prompt && cached.prompt.trim().length > 0;

        const row = document.createElement('div');
        row.className = 'experiment-row';
        row.id = `config_row_${exp.id}`;

        const headerBadges = exp.reportType ?
            (exp.reportType === 'word' ? `<span class="badge badge-word">Word: ${exp.count}份</span>` : `<span class="badge badge-dify">Dify: ${exp.count}份</span>`) :
            `<span class="badge badge-word">${exp.wordCount || 0} Word</span><span style="margin-left:8px;" class="badge badge-dify">${exp.difyCount || 0} Dify</span>`;

        row.innerHTML = `
            <div class="exp-row-left">
                <div class="status-check ${isConfigured ? 'completed' : 'pending'}" id="status_icon_${exp.id}">
                    ${isConfigured ? '✅' : '⏳'}
                </div>
                <div>
                    <div class="exp-row-name">${exp.name}</div>
                </div>
                <div class="exp-badges">${headerBadges}</div>
            </div>
            <div class="exp-row-right">
                <div class="exp-row-actions">
                    <button class="btn btn-secondary" style="padding: 6px 14px; font-size: 13px;" data-action="openConfigModal" data-exp="${exp.id}">配置提示词</button>
                    <button class="btn btn-secondary" style="padding: 6px 14px; font-size: 13px;" data-action="openViewPromptModal" data-exp="${exp.id}">查看提示词</button>
                </div>
            </div>
        `;
        container.appendChild(row);
    });
}

/**
 * 打开配置弹窗并填充数据
 */
export function openConfigModal(expId) {
    state.editingExpId = expId;
    const course = courseData[state.currentCourse.id];
    const exp = course.experiments.find(e => e.id === expId);
    if (!exp) return;

    document.getElementById('modalExpName').textContent = `配置：${exp.name}`;

    const typeSelect = document.getElementById('modalExpType');
    typeSelect.innerHTML = '';
    if (exp.reportType) {
        const opt = document.createElement('option');
        opt.value = exp.reportType;
        opt.textContent = exp.reportType === 'word' ? 'Word 文档' : 'Dify YAML';
        typeSelect.appendChild(opt);
        typeSelect.disabled = true;
    } else {
        typeSelect.disabled = false;
        const optW = document.createElement('option');
        optW.value = 'word';
        optW.textContent = 'Word 文档';
        const optD = document.createElement('option');
        optD.value = 'dify';
        optD.textContent = 'Dify YAML';
        typeSelect.appendChild(optW);
        typeSelect.appendChild(optD);
    }

    const cached = loadPromptFromStorage(state.currentCourse.id, expId);
    const currentType = cached?.type || (exp.reportType || 'word');
    typeSelect.value = currentType;

    // 填充内容
    const wordTa = document.getElementById('modalWordPrompt');
    const difyTa = document.getElementById('modalDifyPrompt');
    wordTa.value = (cached?.type === 'word') ? (cached.prompt || '') : '';
    difyTa.value = (cached?.type === 'dify') ? (cached.prompt || '') : '';

    updateModalSections(currentType);

    const modal = document.getElementById('configModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);

    // 监听输入以实时保存
    [wordTa, difyTa].forEach(ta => {
        if (ta.listener) ta.removeEventListener('input', ta.listener);
        ta.listener = () => {
            const type = document.getElementById('modalExpType').value;
            savePromptToStorage(state.currentCourse.id, expId, { type, prompt: ta.value });
            showModalSavedFeedback();
            updateConfigRowStatus(expId);
            updateConfigProgress();
        };
        ta.addEventListener('input', ta.listener);
    });
}

export function updateConfigRowStatus(expId) {
    const cached = loadPromptFromStorage(state.currentCourse.id, expId);
    const isConfigured = cached && cached.prompt && cached.prompt.trim().length > 0;

    // 更新侧边栏圆点
    const dot = document.getElementById(`nav_dot_${expId}`);
    if (dot) {
        dot.className = `prompt-dot ${isConfigured ? 'configured' : ''}`;
    }

    // 如果是当前激活的实验，更新内容区按钮
    const activeSection = document.querySelector('.exp-content-section.active');
    if (activeSection && activeSection.id === `section_${expId}`) {
        import('./ui.js').then(m => m.updateContentToolbar(expId, isConfigured));
    }
}

/**
 * 打开查看提示词弹窗
 */
export function openViewPromptModal(expId) {
    const cached = loadPromptFromStorage(state.currentCourse.id, expId);
    const course = courseData[state.currentCourse.id];
    const exp = course.experiments.find(e => e.id === expId);

    const title = document.getElementById('viewModalTitle');
    const content = document.getElementById('viewPromptContent');

    if (title) title.textContent = exp ? `查看：${exp.name}` : '查看提示词';
    if (content) {
        content.textContent = (cached && cached.prompt) ? cached.prompt : '（尚未配置提示词）';
    }

    const modal = document.getElementById('viewPromptModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }
}

export function updateModalSections(type) {
    document.getElementById('modalWordSection').style.display = type === 'word' ? 'block' : 'none';
    document.getElementById('modalDifySection').style.display = type === 'dify' ? 'block' : 'none';
}

function showModalSavedIndicator() {
    const indicator = document.getElementById('modalSavedIndicator');
    if (indicator) {
        indicator.classList.add('active');
        if (indicator.timeout) clearTimeout(indicator.timeout);
        indicator.timeout = setTimeout(() => indicator.classList.remove('active'), 1500);
    }
}

function showModalSavedFeedback() {
    showModalSavedIndicator();
}

/**
 * 更新配置进度条 (已合并场景下按所有实验计算)
 */
export function updateConfigProgress() {
    const course = courseData[state.currentCourse.id];
    if (!course || !course.experiments) return;

    let completed = 0;
    const experiments = course.experiments;

    experiments.forEach(exp => {
        const cached = loadPromptFromStorage(state.currentCourse.id, exp.id);
        if (cached && cached.prompt && cached.prompt.trim().length > 0) {
            completed++;
        }
    });

    const progress = Math.round((completed / experiments.length) * 100);
    // 注意：原本的进度条在已删除的 promptConfigView 中，暂时不更新 UI 除非新页面也有进度条
    const fill = document.getElementById('configProgressFill');
    const text = document.getElementById('configProgressText');
    if (fill) fill.style.width = `${progress}%`;
    if (text) text.textContent = `${progress}%`;
}

function showSavedFeedback(expId) {
    const indicator = document.getElementById(`saved_indicator_${expId}`);
    if (indicator) {
        indicator.classList.add('active');
        if (indicator.timeout) clearTimeout(indicator.timeout);
        indicator.timeout = setTimeout(() => {
            indicator.classList.remove('active');
        }, 1500);
    }
}

/**
 * 校验提示词并启动评阅任务
 */
export function startReviewWithPrompts() {
    const course = courseData[state.currentCourse.id];
    if (!course) {
        alert('无法找到课程数据，请返回首页重试');
        return;
    }
    let hasEmptyPrompt = false;
    let emptyExpName = '';

    course.experiments.forEach(exp => {
        const cached = loadPromptFromStorage(state.currentCourse.id, exp.id);
        if (!cached || !cached.prompt || cached.prompt.trim().length === 0) {
            // 检查是否有选中的报告
            const selectedCheckboxes = document.querySelectorAll(`input[data-exp="${exp.id}"]:checked`);
            if (selectedCheckboxes.length > 0) {
                hasEmptyPrompt = true;
                emptyExpName = exp.name;
                return;
            }
        } else {
            state.experimentPrompts[exp.id] = { type: cached.type, prompt: cached.prompt };
        }
    });

    if (hasEmptyPrompt) {
        alert(`实验“${emptyExpName}”有选中的报告，但未配置提示词，请点击“配置提示词”后再继续！`);
        return;
    }

    const finalChecked = Array.from(document.querySelectorAll('#reportGroups input.checkbox:checked'));
    if (finalChecked.length === 0) {
        alert('请至少选择一份报告进行评阅！');
        return;
    }
    const reports = finalChecked.map(cb => ({
        expId: cb.getAttribute('data-exp'),
        type: cb.getAttribute('data-type'),
        idx: parseInt(cb.getAttribute('data-idx'))
    }));

    startReview(reports);
}

/**
 * 初始化评阅流程
 * @param {Array} reports - 选中的报告列表
 */
export function startReview(reports) {
    if (!state.currentCourse || !state.currentCourse.id) {
        alert('评阅任务启动失败：课程状态丢失，请返回首页重试');
        return;
    }
    document.getElementById('taskCourseName').textContent = state.currentCourse.name || '未知课程';
    const totalReports = Array.isArray(reports) ? reports.length : 0;

    const expIds = Array.from(new Set(reports.map(r => r.expId)));
    const noPrompt = expIds.filter(id => {
        const p = state.experimentPrompts[id];
        return !(p && typeof p.prompt === 'string' && p.prompt.trim().length > 0);
    });
    if (noPrompt.length > 0) {
        const go = confirm(`有 ${noPrompt.length} 个实验未填写提示词，是否继续评阅？`);
        if (!go) return;
    }

    document.getElementById('totalCount').textContent = totalReports;
    document.getElementById('completedCount').textContent = 0;

    showView('taskExecutionView');
    state.currentRunId = `${state.currentCourse.id}-${Date.now()}`;
    state.runStartedAt = new Date();
    simulateTaskExecution(reports, totalReports);
}

/**
 * 生成基于内容的模拟评分
 * @param {string} expId - 实验ID
 * @param {string} type - 报告类型
 * @param {number} idx - 索引
 * @returns {number} 评分 (60-95)
 */
function scoreForReport(expId, type, idx) {
    const h = strHash(expId + ':' + type + ':' + idx);
    return 60 + (h % 36);
}

/**
 * 模拟评阅任务执行
 */
export function simulateTaskExecution(reports, totalReports) {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';
    let completed = 0;
    const expTaskItems = {};

    const interval = setInterval(() => {
        if (completed < totalReports) {
            const current = reports[completed];
            completed++;
            const progress = Math.round((completed / totalReports) * 100);

            document.getElementById('progressBar').style.width = progress + '%';
            document.getElementById('progressBar').textContent = progress + '%';
            document.getElementById('completedCount').textContent = completed;

            const remainingMinutes = Math.ceil((totalReports - completed) * 0.1);
            document.getElementById('remainingTime').textContent = remainingMinutes + ' 分钟';

            if (!expTaskItems[current.expId]) {
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item';
                const course = courseData[state.currentCourse.id];
                const exp = course ? course.experiments.find(e => e.id === current.expId) : null;
                const expName = exp ? exp.name : '未知实验';
                taskItem.innerHTML = `
                    <div id="exp_progress_${current.expId}">
                        <strong>${expName}</strong> - 正在评阅... (0/0)
                    </div>
                    <span class="status-icon" id="exp_icon_${current.expId}">⏳</span>
                `;
                taskList.insertBefore(taskItem, taskList.firstChild);

                const expTotal = reports.filter(r => r.expId === current.expId).length;
                expTaskItems[current.expId] = {
                    el: taskItem,
                    total: expTotal,
                    done: 0,
                    name: expName
                };
            }

            const expData = expTaskItems[current.expId];
            expData.done++;
            const progressDiv = document.getElementById(`exp_progress_${current.expId}`);
            if (progressDiv) {
                progressDiv.innerHTML = `<strong>${expData.name}</strong> - ${expData.done === expData.total ? '已完成' : '正在评阅...'} (${expData.done}/${expData.total})`;
            }
            if (expData.done === expData.total) {
                const icon = document.getElementById(`exp_icon_${current.expId}`);
                if (icon) icon.textContent = '✅';
            }

            state.processedReports.push({
                courseId: state.currentCourse.id,
                expId: current.expId,
                type: current.type,
                idx: current.idx,
                runId: state.currentRunId,
                score: scoreForReport(current.expId, current.type, current.idx)
            });
        } else {
            clearInterval(interval);
            document.getElementById('viewSummaryBtn').style.display = 'inline-block';
            finalizeTaskRun(state.currentRunId);
        }
    }, state.simulationSpeedMs);
}

/**
 * 结算评阅任务并持久化
 */
export function finalizeTaskRun(runId) {
    const course = courseData[state.currentCourse.id];
    const items = state.processedReports.filter(r => r.runId === runId);
    const finishedAt = new Date();
    const total = items.length;
    const avg = total ? (items.reduce((s, r) => s + r.score, 0) / total) : 0;
    const passRate = total ? (items.filter(r => r.score >= 60).length / total) : 0;
    const exRate = total ? (items.filter(r => r.score >= 85).length / total) : 0;
    const byExp = course.experiments.map(exp => {
        const list = items.filter(r => r.expId === exp.id);
        const t = list.length;
        const a = t ? (list.reduce((s, r) => s + r.score, 0) / t) : 0;
        const p = t ? (list.filter(r => r.score >= 60).length / t) : 0;
        const e = t ? (list.filter(r => r.score >= 85).length / t) : 0;
        return { id: exp.id, name: exp.name, total: t, avg: a, passRate: p, excellentRate: e };
    });

    const record = {
        id: runId,
        courseId: state.currentCourse.id,
        courseName: state.currentCourse.name,
        startedAt: state.runStartedAt ? state.runStartedAt.toISOString() : new Date().toISOString(),
        finishedAt: finishedAt.toISOString(),
        total,
        avgScore: avg,
        passRate,
        excellentRate: exRate,
        byExperiment: byExp
    };
    try {
        record.detailedReportHtml = generateDetailedReportHtml(course, items, byExp);
        const raw = localStorage.getItem('taskRecords');
        const list = raw ? JSON.parse(raw) : [];
        list.unshift(record);
        localStorage.setItem('taskRecords', JSON.stringify(list));
    } catch (e) {
        console.error('Failed to save task record:', e);
    }
}

/**
 * 加载所有评阅记录
 * @returns {Array}
 */
export function loadTaskRecords() {
    try {
        const raw = localStorage.getItem('taskRecords');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Error loading task records:', e);
        return [];
    }
}

/**
 * 暂停任务
 */
export function pauseTask() {
    if (confirm('确定要暂停评阅任务吗？')) {
        alert('任务已暂停');
    }
}
