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

            // 确保 canvas 有稳定高度，避免响应式计算时父容器高度不确定导致无限扩展
            try {
                expChartCanvas.style.height = expChartCanvas.style.height || '220px';
                scoreChartCanvas.style.height = scoreChartCanvas.style.height || '220px';
            } catch (e) {
                console.warn('Could not set canvas style height', e);
            }
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
    
    // 渲染图表
    renderExperimentAvgScoreChart();
    renderUserExperimentCompletionChart();
    
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

    // 渲染学生统计表格
    renderStudentStatsTable(list);
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
    // 防止重复调用
    if (window.viewingTaskRecord === id) {
        return;
    }
    window.viewingTaskRecord = id;

    // 清理之前的图表实例（只清理存在的实例）
    if (window.taskRecordExpChart && typeof window.taskRecordExpChart.destroy === 'function') {
        window.taskRecordExpChart.destroy();
        window.taskRecordExpChart = null;
    }
    if (window.taskRecordScoreChart && typeof window.taskRecordScoreChart.destroy === 'function') {
        window.taskRecordScoreChart.destroy();
        window.taskRecordScoreChart = null;
    }

    const { loadTaskRecords } = document.appActions;
    const records = loadTaskRecords();
    const r = records.find(x => x.id === id);
    const box = document.getElementById('taskRecordDetail');
    const content = document.getElementById('taskRecordDetailContent');
    if (!r || !box || !content) {
        window.viewingTaskRecord = null;
        return;
    }
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

    let studentTableHtml = '';
    if (r.byStudent && r.byStudent.length > 0) {
        studentTableHtml = `
            <div style="margin-top:20px;">
                <h4 style="color:#333; font-size:16px; margin-bottom:10px;">学生维度分析</h4>
                <table style="width:100%; border-collapse: collapse; font-size:13px;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:10px; border:1px solid #eee; text-align:left;">学生姓名</th>
                            <th style="padding:10px; border:1px solid #eee;">提交实验数</th>
                            <th style="padding:10px; border:1px solid #eee;">平均分</th>
                            <th style="padding:10px; border:1px solid #eee;">最高分</th>
                            <th style="padding:10px; border:1px solid #eee;">最低分</th>
                            <th style="padding:10px; border:1px solid #eee;">优秀实验数</th>
                            <th style="padding:10px; border:1px solid #eee;">通过率</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${r.byStudent.map(student => `
                            <tr>
                                <td style="padding:10px; border:1px solid #eee;">${student.name}</td>
                                <td style="padding:10px; border:1px solid #eee; text-align:center;">${student.submissions}</td>
                                <td style="padding:10px; border:1px solid #eee; text-align:center;">${student.avgScore.toFixed(1)}</td>
                                <td style="padding:10px; border:1px solid #eee; text-align:center;">${student.maxScore}</td>
                                <td style="padding:10px; border:1px solid #eee; text-align:center;">${student.minScore}</td>
                                <td style="padding:10px; border:1px solid #eee; text-align:center;">${student.excellentCount}</td>
                                <td style="padding:10px; border:1px solid #eee; text-align:center;">${student.passRate.toFixed(1)}%</td>
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

        <!-- 图表区域 -->
        <div style="margin-top: 20px;">
            <h4 style="color:#333; font-size:16px; margin-bottom:15px;">📊 数据可视化</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px;">
                    <h5 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">实验平均分分布</h5>
                    <canvas id="taskRecordExpChart" width="300" height="200"></canvas>
                </div>
                <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px;">
                    <h5 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">成绩区间分布</h5>
                    <canvas id="taskRecordScoreChart" width="300" height="200"></canvas>
                </div>
            </div>
        </div>

        ${experimentTableHtml}
        ${studentTableHtml}
    `;

    // 等待DOM更新后再渲染图表
    setTimeout(() => {
        renderTaskRecordCharts(r);

        // 在图表渲染完成后，如果有详细报告，则添加它
        if (r.detailedReportHtml) {
            // 再次等待图表完全渲染
            setTimeout(() => {
                // 使用DOM操作添加详细报告，而不是重新设置innerHTML
                const detailDiv = document.createElement('div');
                detailDiv.style.marginTop = '14px';
                detailDiv.innerHTML = `
                    <h4 style="color:#333; font-size:16px; margin-bottom:8px;">详细报告预览</h4>
                    <div style="background:#fff; padding:12px; border:1px solid #e6e6e6; border-radius:6px; max-height:400px; overflow:auto;">${r.detailedReportHtml}</div>
                `;
                content.appendChild(detailDiv);
            }, 150); // 增加等待时间确保图表完全渲染
        }

        // 清除标志位
        window.viewingTaskRecord = null;
    }, 100);
}

/**
 * 渲染实验平均分柱状图
 */
function renderExperimentAvgScoreChart() {
    const course = courseData[state.currentCourse.id];
    const list = state.processedReports.filter(r => r.courseId === state.currentCourse.id);
    
    const labels = course.experiments.map(exp => exp.name);
    const data = course.experiments.map(exp => {
        const expList = list.filter(r => r.expId === exp.id);
        const reviewed = expList.length;
        return reviewed ? (expList.reduce((s, r) => s + r.score, 0) / reviewed) : 0;
    });

    const ctx = document.getElementById('experimentAvgScoreChart');
    if (!ctx) return;

    // 固定高度，避免响应式计算导致高度异常
    try { ctx.style.height = ctx.style.height || '220px'; } catch (e) { console.warn(e); }

    try {
        // 清理之前的图表实例
        if (window.experimentAvgScoreChart && typeof window.experimentAvgScoreChart.destroy === 'function') {
            window.experimentAvgScoreChart.destroy();
        }
        
        window.experimentAvgScoreChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '平均分',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering experiment chart:', error);
    }
}

/**
 * 渲染用户实验完成情况饼图
 */
function renderUserExperimentCompletionChart() {
    const course = courseData[state.currentCourse.id];
    const list = state.processedReports.filter(r => r.courseId === state.currentCourse.id);
    
    // 计算成绩分布
    const scoreRanges = {
        '优秀 (85-100)': list.filter(r => r.score >= 85).length,
        '良好 (70-84)': list.filter(r => r.score >= 70 && r.score < 85).length,
        '及格 (60-69)': list.filter(r => r.score >= 60 && r.score < 70).length,
        '不及格 (0-59)': list.filter(r => r.score < 60).length
    };

    const ctx = document.getElementById('userExperimentCompletionChart');
    if (!ctx) return;

    // 固定高度，避免响应式计算导致高度异常
    try { ctx.style.height = ctx.style.height || '220px'; } catch (e) { console.warn(e); }

    try {
        // 清理之前的图表实例
        if (window.userExperimentCompletionChart && typeof window.userExperimentCompletionChart.destroy === 'function') {
            window.userExperimentCompletionChart.destroy();
        }
        
        window.userExperimentCompletionChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(scoreRanges),
                datasets: [{
                    data: Object.values(scoreRanges),
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(255, 99, 132, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering completion chart:', error);
    }
}

/**
 * 渲染学生统计表格
 */
function renderStudentStatsTable(reports) {
    // 按学生ID分组统计
    const studentStats = {};
    
    reports.forEach(report => {
        const studentId = report.studentId || 'unknown';
        const studentName = report.studentName || `学生${studentId.split('_')[1] || '未知'}`;
        
        if (!studentStats[studentId]) {
            studentStats[studentId] = {
                name: studentName,
                submissions: [],
                scores: []
            };
        }
        
        studentStats[studentId].submissions.push(report);
        studentStats[studentId].scores.push(report.score);
    });
    
    // 计算每个学生的统计数据
    const studentData = Object.values(studentStats).map(student => {
        const submissions = student.scores.length;
        const avgScore = submissions > 0 ? (student.scores.reduce((a, b) => a + b, 0) / submissions) : 0;
        const maxScore = submissions > 0 ? Math.max(...student.scores) : 0;
        const minScore = submissions > 0 ? Math.min(...student.scores) : 0;
        const excellentCount = student.scores.filter(score => score >= 85).length;
        const passRate = submissions > 0 ? (student.scores.filter(score => score >= 60).length / submissions * 100) : 0;
        
        return {
            name: student.name,
            submissions,
            avgScore,
            maxScore,
            minScore,
            excellentCount,
            passRate
        };
    });
    
    // 按平均分降序排序
    studentData.sort((a, b) => b.avgScore - a.avgScore);
    
    const tbody = document.getElementById('studentStatsTableBody');
    tbody.innerHTML = studentData.map(student => `
        <tr>
            <td>${student.name}</td>
            <td>${student.submissions}</td>
            <td>${student.avgScore.toFixed(1)}</td>
            <td>${student.maxScore}</td>
            <td>${student.minScore}</td>
            <td>${student.excellentCount}</td>
            <td>${student.passRate.toFixed(1)}%</td>
            <td style="text-align:center;"><button class="btn" data-action="viewStudentDetails" data-student-id="${encodeURIComponent(student.name)}">查看详情</button></td>
        </tr>
    `).join('');

    // 清空之前的详情区域
    const detailContainer = document.getElementById('studentDetailContainer');
    if (detailContainer) detailContainer.innerHTML = '';
}

/**
 * 显示某学生的详细实验记录（按已处理报告中的 studentName/ studentId 匹配）
 */
export function viewStudentDetails(studentIdOrName) {
    const decoded = decodeURIComponent(studentIdOrName);
    const list = state.processedReports.filter(r => r.courseId === state.currentCourse.id);
    // 支持通过 studentId 或 studentName 查询
    const matched = list.filter(r => (r.studentId && r.studentId === decoded) || (r.studentName && r.studentName === decoded));

    const container = document.getElementById('studentDetailContainer');
    if (!container) return;
    if (!matched || matched.length === 0) {
        container.innerHTML = `<div class="muted">未找到学生 ${decoded} 的记录。</div>`;
        return;
    }

    // 简单规则：根据分数范围生成可能的扣分点
    function guessDeductionPoints(score) {
        if (score < 60) return ['实验思路错误', '结果缺失或错误', '格式严重不规范'];
        if (score < 70) return ['结果不完整', '实现细节错误', '缺少必要注释或说明'];
        if (score < 85) return ['分析不够深入', '边界情况未处理', '表达或格式可改进'];
        if (score < 95) return ['可增强注释', '可优化实现细节'];
        return [];
    }

    // 按实验分组并收集分数与扣分点
    const byExp = {};
    matched.forEach(r => {
        if (!byExp[r.expId]) byExp[r.expId] = { name: (courseData[state.currentCourse.id].experiments.find(e => e.id === r.expId) || {}).name || r.expId, submissions: [], deductionCounts: {} };
        const pts = r.score != null ? guessDeductionPoints(r.score) : [];
        byExp[r.expId].submissions.push({ idx: r.idx, score: r.score, runId: r.runId, finishedAt: r.finishedAt, deductions: pts });
        pts.forEach(p => byExp[r.expId].deductionCounts[p] = (byExp[r.expId].deductionCounts[p] || 0) + 1);
    });

    // 构建 HTML：每个实验的提交详情 + 常见扣分点与改进建议
    let html = `<div style="background:#fff; border:1px solid #e6e6e6; padding:12px; border-radius:8px;"><h4 style="margin:0 0 10px 0;">${decoded} 的实验明细与改进建议</h4>`;
    html += `<div style="margin-bottom:10px; color:#666; font-size:13px;">汇总 ${matched.length} 次提交，按实验列出提交次数、平均分与常见扣分点。</div>`;

    Object.keys(byExp).forEach(expId => {
        const info = byExp[expId];
        const scores = info.submissions.map(s => s.score || 0);
        const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        html += `<div style="margin-top:12px; padding:10px; border:1px solid #f0f0f0; border-radius:6px; background:#fafafa;">
            <div style="font-weight:600; color:#333; margin-bottom:6px;">${info.name} — 提交 ${scores.length} 次，平均分 ${avg.toFixed(1)}</div>`;

        // 提交明细
        html += `<div style="font-size:13px; color:#444; margin-bottom:8px;">`;
        html += info.submissions.map(s => `<div style="padding:4px 0;">索引:${s.idx} 分数:${s.score}${s.finishedAt?('｜'+formatDate(new Date(s.finishedAt))):''}</div>`).join('');
        html += `</div>`;

        // 常见扣分点
        const deductions = Object.entries(info.deductionCounts).sort((a, b) => b[1] - a[1]);
        if (deductions.length > 0) {
            html += `<div style="margin-top:8px;"><strong style="color:#333;">常见扣分点：</strong><ul style="margin:6px 0 0 18px; color:#555;">`;
            deductions.forEach(([point, cnt]) => {
                // 简短的改进建议
                let suggestion = '';
                if (point.includes('思路')) suggestion = '请先明确实验目标与方法，补充必要步骤说明。';
                else if (point.includes('结果缺失')) suggestion = '确保输出结果完整，并提供必要的解释与截图/输出示例。';
                else if (point.includes('格式')) suggestion = '检查文档结构与格式，统一命名与代码块样式。';
                else if (point.includes('实现细节')) suggestion = '关注边界条件与异常处理，补充核心实现细节。';
                else if (point.includes('注释')) suggestion = '增加注释，说明关键步骤与参数含义。';
                else if (point.includes('分析')) suggestion = '在结果分析中加入原因判断、对比与改进建议。';
                else suggestion = '加强相关部分描述与实现，提升准确性。';

                html += `<li style="margin-bottom:6px;">${point}（出现 ${cnt} 次） — 建议：${suggestion}</li>`;
            });
            html += `</ul></div>`;
        } else {
            html += `<div style="color:#666;">暂无明显扣分点建议。</div>`;
        }

        html += `</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * 渲染任务记录图表
 */
function renderTaskRecordCharts(record) {
    console.log('Rendering task record charts for record:', record.id);

    // 防止重复渲染
    if (window.renderingCharts) {
        console.log('Charts are already being rendered, skipping...');
        return;
    }
    window.renderingCharts = true;

    try {
        // 清理之前的图表实例
        const expChartCanvas = document.getElementById('taskRecordExpChart');
        const scoreChartCanvas = document.getElementById('taskRecordScoreChart');

        if (!expChartCanvas || !scoreChartCanvas) {
            console.warn('Chart canvases not found');
            window.renderingCharts = false;
            return;
        }

        console.log('Canvas elements found, creating charts...');

        // 获取canvas的2D上下文
        const expChartCtx = expChartCanvas.getContext('2d');
        const scoreChartCtx = scoreChartCanvas.getContext('2d');

        // 清理之前的图表实例（如果存在且有destroy方法）
        if (window.taskRecordExpChart && typeof window.taskRecordExpChart.destroy === 'function') {
            window.taskRecordExpChart.destroy();
            window.taskRecordExpChart = null;
        }
        if (window.taskRecordScoreChart && typeof window.taskRecordScoreChart.destroy === 'function') {
            window.taskRecordScoreChart.destroy();
            window.taskRecordScoreChart = null;
        }

        // 实验平均分柱状图
        if (record.byExperiment && record.byExperiment.length > 0) {
            console.log('Creating experiment chart with data:', record.byExperiment);
            const expLabels = record.byExperiment.map(exp => exp.name);
            const expData = record.byExperiment.map(exp => exp.avg);

            try {
                window.taskRecordExpChart = new Chart(expChartCtx, {
                    type: 'bar',
                    data: {
                        labels: expLabels,
                        datasets: [{
                            label: '平均分',
                            data: expData,
                            backgroundColor: 'rgba(54, 162, 235, 0.6)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
                console.log('Experiment chart created successfully');
            } catch (chartError) {
                console.error('Error creating experiment chart:', chartError);
            }
        } else {
            console.log('No experiment data available for chart');
        }

        // 成绩区间分布饼图
        if (record.byStudent && record.byStudent.length > 0) {
            console.log('Creating score chart with student data:', record.byStudent.length, 'students');
            // 计算成绩分布
            const scoreRanges = {
                '优秀 (85-100)': record.byStudent.filter(s => s.avgScore >= 85).length,
                '良好 (70-84)': record.byStudent.filter(s => s.avgScore >= 70 && s.avgScore < 85).length,
                '及格 (60-69)': record.byStudent.filter(s => s.avgScore >= 60 && s.avgScore < 70).length,
                '不及格 (0-59)': record.byStudent.filter(s => s.avgScore < 60).length
            };

            console.log('Score ranges:', scoreRanges);

            try {
                window.taskRecordScoreChart = new Chart(scoreChartCtx, {
                    type: 'pie',
                    data: {
                        labels: Object.keys(scoreRanges),
                        datasets: [{
                            data: Object.values(scoreRanges),
                            backgroundColor: [
                                'rgba(75, 192, 192, 0.6)',
                                'rgba(255, 206, 86, 0.6)',
                                'rgba(255, 159, 64, 0.6)',
                                'rgba(255, 99, 132, 0.6)'
                            ],
                            borderColor: [
                                'rgba(75, 192, 192, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(255, 159, 64, 1)',
                                'rgba(255, 99, 132, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    boxWidth: 12,
                                    font: {
                                        size: 11
                                    }
                                }
                            }
                        }
                    }
                });
                console.log('Score chart created successfully');
            } catch (chartError) {
                console.error('Error creating score chart:', chartError);
            }
        } else {
            console.log('No student data available for chart');
        }

        console.log('Chart rendering completed');

    } catch (error) {
        console.error('Error in renderTaskRecordCharts:', error);
    } finally {
        // 清除渲染标志
        window.renderingCharts = false;
    }
}
