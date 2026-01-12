/**
 * @module Stats
 * @description Handles teaching statistics and report generation.
 */
import { state } from './state.js';
import { courseData } from './config.js';
import {
    getExpCount,
    strHash,
    formatDate,
    getExpReportType,
    getCourseTotalReports
} from './utils.js';
import { showView } from './view.js';

// ===== 教学统计与报告生成 =====

/**
 * 显示教学统计视图
 */
export function showTeachingStats() {
    const course = courseData[state.currentCourse.id];
    if (!course) return;
    document.getElementById('statsCourseName').textContent = course.name;
    const stats = computeTeachingStats(course);
    renderTeachingStats(stats);
    showView('teachingStatsView');
}

/**
 * 计算教学统计数据
 */
export function computeTeachingStats(course) {
    const buckets = ['0-59', '60-69', '70-79', '80-89', '90-100'];
    let totalReports = 0;
    let reviewedTotal = 0;
    let weightedScoreSum = 0;
    let overallBucketCounts = [0, 0, 0, 0, 0];

    const expStats = course.experiments.map(exp => {
        const total = getExpCount(exp);
        totalReports += total;
        const h = strHash(exp.id + (exp.reportType || ''));
        const progressRatio = 0.75 + (h % 21) / 100;
        const reviewed = Math.min(total, Math.round(total * progressRatio));

        const tilt = (h % 3) - 1;
        let b = [0, 0, 0, 0, 0];
        b[0] = Math.round(reviewed * 0.06);
        b[1] = Math.round(reviewed * (0.12 + (tilt === -1 ? 0.04 : 0)));
        b[2] = Math.round(reviewed * (0.28 + (tilt === 0 ? 0.04 : 0)));
        b[3] = Math.round(reviewed * (0.34 + (tilt === 1 ? 0.04 : 0)));
        b[4] = reviewed - (b[0] + b[1] + b[2] + b[3]);

        const centers = [50, 65, 75, 85, 95];
        const scoreSum = b.reduce((s, c, i) => s + c * centers[i], 0);
        const avgScore = reviewed > 0 ? (scoreSum / reviewed) : 0;
        const pass = reviewed - b[0];
        const passRate = reviewed > 0 ? (pass / reviewed) : 0;

        reviewedTotal += reviewed;
        weightedScoreSum += scoreSum;
        overallBucketCounts = overallBucketCounts.map((v, i) => v + b[i]);

        return {
            id: exp.id,
            name: exp.name,
            total,
            reviewed,
            progress: total > 0 ? Math.round((reviewed / total) * 100) : 0,
            avgScore,
            passRate,
            buckets: b
        };
    });

    const avgScore = reviewedTotal > 0 ? (weightedScoreSum / reviewedTotal) : 0;
    const passOverall = reviewedTotal - overallBucketCounts[0];
    const passRate = reviewedTotal > 0 ? (passOverall / reviewedTotal) : 0;

    return {
        totalReports,
        reviewedTotal,
        avgScore,
        passRate,
        expStats,
        overallBucketCounts,
        buckets
    };
}

/**
 * 渲染教学统计界面
 */
export function renderTeachingStats(stats) {
    document.getElementById('kpiTotalReports').textContent = stats.totalReports;
    document.getElementById('kpiReviewed').textContent = stats.reviewedTotal;
    document.getElementById('kpiAvgScore').textContent = stats.avgScore.toFixed(1);
    document.getElementById('kpiPassRate').textContent = (stats.passRate * 100).toFixed(1) + '%';

    const progressEl = document.getElementById('expProgressList');
    progressEl.innerHTML = stats.expStats.map(e => `
        <div style="margin: 10px 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <div style="color:#333; font-weight:600;">${e.name}</div>
                <div style="color:#666; font-size:12px;">${e.reviewed}/${e.total} (${e.progress}%)</div>
            </div>
            <div class="progress-track">
                <div class="progress-bar-sm" style="width:${e.progress}%"></div>
            </div>
        </div>
    `).join('');

    const total = stats.overallBucketCounts.reduce((a, b) => a + b, 0) || 1;
    const scoreEl = document.getElementById('scoreDistCards');
    scoreEl.innerHTML = stats.buckets.map((label, i) => {
        const cnt = stats.overallBucketCounts[i];
        const pct = Math.round((cnt / total) * 100);
        return `
            <div class="kpi-card">
                <div class="kpi-title">${label}</div>
                <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                    <div class="mini-bar" style="flex:1"><div class="mini-bar-fill" style="width:${pct}%"></div></div>
                    <div style="width:56px; text-align:right; color:#333; font-weight:600;">${cnt}</div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 显示评阅汇总视图
 */
export function viewSummary() {
    document.getElementById('summaryCourseName').textContent = state.currentCourse.name;
    refreshSummaryFromProcessed();
    try {
        const course = courseData[state.currentCourse.id];
        const items = state.processedReports.filter(r => r.courseId === state.currentCourse.id);
        const byExp = course.experiments.map(exp => {
            const list = items.filter(r => r.expId === exp.id);
            const t = list.length;
            const a = t ? (list.reduce((s, r) => s + r.score, 0) / t) : 0;
            const p = t ? (list.filter(r => r.score >= 60).length / t) : 0;
            return { id: exp.id, name: exp.name, total: t, avg: a, passRate: p };
        });
        const html = generateDetailedReportHtml(course, items, byExp);
        const container = document.getElementById('detailedReportContainer');
        if (container) {
            container.style.display = 'block';
            container.innerHTML = html;
        }
    } catch (e) {
        console.error('Error generating summary:', e);
        document.getElementById('detailedReportContainer').style.display = 'none';
    }
    showView('summaryView');
}

/**
 * 刷新汇总数据
 */
export function refreshSummaryFromProcessed() {
    const course = courseData[state.currentCourse.id];
    const total = getCourseTotalReports(course);
    const list = state.processedReports.filter(r => r.courseId === state.currentCourse.id);
    const completed = list.length;
    const avg = completed ? (list.reduce((s, r) => s + r.score, 0) / completed) : 0;
    const excellent = completed ? (list.filter(r => r.score >= 85).length / completed * 100) : 0;

    document.getElementById('summaryTotal').textContent = String(total);
    document.getElementById('summaryCompleted').textContent = String(completed);
    document.getElementById('summaryAvgScore').textContent = completed ? avg.toFixed(1) : '-';
    document.getElementById('summaryExcellent').textContent = completed ? excellent.toFixed(1) + '%' : '-';

    const tbody = document.getElementById('experimentStatsTableBody');
    tbody.innerHTML = course.experiments.map(exp => {
        const expList = list.filter(r => r.expId === exp.id);
        const reviewed = expList.length;
        const eavg = reviewed ? (expList.reduce((s, r) => s + r.score, 0) / reviewed) : 0;
        const exl = reviewed ? (expList.filter(r => r.score >= 85).length / reviewed * 100) : 0;
        const isWord = getExpReportType(exp) === 'word';
        const wordCnt = isWord ? getExpCount(exp) : 0;
        const difyCnt = isWord ? 0 : getExpCount(exp);
        return `
            <tr>
                <td>${exp.name}</td>
                <td>${getExpCount(exp)}</td>
                <td>${reviewed}</td>
                <td>${reviewed ? eavg.toFixed(1) : '-'}</td>
                <td>${reviewed ? exl.toFixed(1) + '%' : '-'}</td>
                <td>${wordCnt}</td>
                <td>${difyCnt}</td>
            </tr>
        `;
    }).join('');
}

/**
 * 生成详细 HTML 报告内容
 */
export function generateDetailedReportHtml(course, items, byExp) {
    const total = items.length;
    const avg = total ? (items.reduce((s, r) => s + r.score, 0) / total) : 0;
    const passRate = total ? (items.filter(r => r.score >= 60).length / total) : 0;

    const style = `
        <div class="report-style-wrapper">
            <style>
                .report-section { background: white; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0; margin-bottom: 25px; }
                .report-section h3 { color: #667eea; font-size: 22px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #667eea; }
                .report-section h4 { color: #333; font-size: 18px; margin: 20px 0 12px 0; font-weight: 600; }
                .report-section p { color: #555; line-height: 1.8; margin-bottom: 12px; text-indent: 2em; }
                .report-section ul { margin-left: 2em; color: #555; line-height: 1.8; }
                .report-section li { margin-bottom: 8px; }
                .highlight-box { background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
                .data-badge { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; margin: 0 4px; }
            </style>
        </div>
    `;

    let html = style + `
        <div class="report-section">
            <h3>一、实验概况</h3>
            <p>本次 ${course.name} 实验共处理 <span class="data-badge">${total}</span> 份报告，平均得分 <strong>${avg.toFixed(1)}</strong>，合格率 <strong>${(passRate * 100).toFixed(1)}%</strong>。</p>
        </div>
        <div class="report-section">
            <h3>二、各模块实验数据分析</h3>
    `;

    byExp.forEach(exp => {
        const t = exp.total || 0;
        const targetExp = course.experiments.find(e => e.id === exp.id);
        const completion = t && getExpCount(targetExp) ? (t / getExpCount(targetExp) * 100).toFixed(1) : '-';
        const avgScore = exp.avg ? exp.avg.toFixed(1) : '-';
        const pass = exp.total ? ((exp.passRate || 0) * 100).toFixed(1) + '%' : '-';

        html += `
            <h4>• ${exp.name}</h4>
            <div class="highlight-box">
                <strong>📊 完成情况：</strong><br>
                共处理 <span class="data-badge">${t}</span> 份报告，完成率 ${completion === '-' ? '-' : completion + '%'}；平均得分 <span class="data-badge">${avgScore}</span>，合格率 <span class="data-badge">${pass}</span>。
            </div>
            <p><strong>典型问题：</strong></p>
            <ul>
                <li>常见问题示例：提交格式不规范、结果缺失、分析不充分（示例统计仅供参考）。</li>
            </ul>
        `;
    });

    html += `</div>`;
    return html;
}

/**
 * 导出报告（模拟）
 */
export function exportReport() {
    alert('正在导出汇总报告...\n将包含：\n- 完整评阅结果\n- 统计图表\n- 详细反馈');
}

/**
 * 渲染任务记录表格
 */
export function renderTaskRecordsTable(records) {
    const tbody = document.getElementById('taskRecordsTableBody');
    if (!tbody) return;
    tbody.innerHTML = records.map(r => {
        const dt = new Date(r.finishedAt);
        const timeStr = formatDate(dt);
        return `
            <tr>
                <td>${timeStr}</td>
                <td>${r.courseName}</td>
                <td>${r.total}</td>
                <td>${r.total ? r.avgScore.toFixed(1) : '-'}</td>
                <td>${r.total ? (r.passRate * 100).toFixed(1) + '%' : '-'}</td>
                <td>
                    <button class="btn btn-view-record" data-action="viewTaskRecord" data-id="${r.id}">查看</button>
                    <button class="btn btn-delete-record" data-action="deleteTaskRecord" data-id="${r.id}">删除</button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * 查看单个评阅记录详情
 */
export function viewTaskRecord(id) {
    const { loadTaskRecords } = document.appActions;
    const records = loadTaskRecords();
    const r = records.find(x => x.id === id);
    const box = document.getElementById('taskRecordDetail');
    const content = document.getElementById('taskRecordDetailContent');
    if (!r || !box || !content) return;
    box.style.display = 'block';

    let experimentTableHtml = '';
    if (r.byExperiment && r.byExperiment.length > 0) {
        experimentTableHtml = `
            <div style="margin-top:20px;">
                <h4 style="color:#333; font-size:16px; margin-bottom:10px;">实验维度分析</h4>
                <table style="width:100%; border-collapse: collapse; font-size:13px;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:10px; border:1px solid #eee; text-align:left;">实验名称</th>
                            <th style="padding:10px; border:1px solid #eee;">数量</th>
                            <th style="padding:10px; border:1px solid #eee;">均分</th>
                            <th style="padding:10px; border:1px solid #eee;">合格率</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${r.byExperiment.map(exp => `
                            <tr>
                                <td style="padding:10px; border:1px solid #eee;">${exp.name}</td>
                                <td style="padding:10px; border:1px solid #eee; text-align:center;">${exp.total}</td>
                                <td style="padding:10px; border:1px solid #eee; text-align:center;">${exp.avg.toFixed(1)}</td>
                                <td style="padding:10px; border:1px solid #eee; text-align:center;">${(exp.passRate * 100).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    content.innerHTML = `
        <div style="color:#666; margin-bottom:8px;">课程：${r.courseName} ｜ 起止：${formatDate(new Date(r.startedAt))} - ${formatDate(new Date(r.finishedAt))}</div>
        <div class="kpi-grid" style="margin-top:8px;">
            <div class="kpi-card"><div class="kpi-title">处理数</div><div class="kpi-value">${r.total}</div></div>
            <div class="kpi-card"><div class="kpi-title">平均分</div><div class="kpi-value">${r.total ? r.avgScore.toFixed(1) : '-'}</div></div>
            <div class="kpi-card"><div class="kpi-title">合格率</div><div class="kpi-value">${r.total ? (r.passRate * 100).toFixed(1) + '%' : '-'}</div></div>
            <div class="kpi-card"><div class="kpi-title">优秀率</div><div class="kpi-value">${r.total ? (r.excellentRate * 100).toFixed(1) + '%' : '-'}</div></div>
        </div>
        ${experimentTableHtml}
    `;
    if (r.detailedReportHtml) {
        content.innerHTML += `
            <div style="margin-top:14px;">
                <h4 style="color:#333; font-size:16px; margin-bottom:8px;">详细报告预览</h4>
                <div style="background:#fff; padding:12px; border:1px solid #e6e6e6; border-radius:6px; max-height:400px; overflow:auto;">${r.detailedReportHtml}</div>
            </div>
        `;
    }
}
