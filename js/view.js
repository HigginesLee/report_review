/**
 * @module View
 * @description Centralized view management to avoid circular dependencies.
 */

/**
 * 切换视图
 * @param {string} viewId - 视图ID
 */
export function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');
    setActiveStep(viewId);
}

/**
 * 设置当前激活的步骤芯片
 * @param {string} viewId - 当前激活的视图ID
 */
export function setActiveStep(viewId) {
    const chips = document.querySelectorAll('#globalStepper .step-chip');
    chips.forEach(c => c.classList.remove('active'));
    const current = document.querySelector(`#globalStepper .step-chip[data-step="${viewId}"]`);
    if (current) current.classList.add('active');
}
