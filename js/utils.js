/**
 * @module Utils
 * @description Common utility functions for data handling and formatting.
 */
/**
 * 判断实验是否为单一类型（即已确定是 Word 还是 Dify）
 * @param {Object} exp - 实验对象
 * @returns {boolean}
 */
export function isSingleType(exp) {
    return !!exp.reportType;
}

/**
 * 获取实验的主报告类型
 * @param {Object} exp - 实验对象
 * @returns {string} 'word' | 'dify'
 */
export function getExpReportType(exp) {
    if (exp.reportType) return exp.reportType; // 'word' | 'dify'
    // 兼容老数据：哪个计数大就认为为主类型（若相等默认 word）
    const w = exp.wordCount || 0;
    const d = exp.difyCount || 0;
    if (w >= d) return 'word';
    return 'dify';
}

/**
 * 获取实验的报告总数
 * @param {Object} exp - 实验对象
 * @returns {number}
 */
export function getExpCount(exp) {
    if (exp.count != null) return exp.count;
    const w = exp.wordCount || 0;
    const d = exp.difyCount || 0;
    // 若无单一类型，返回两者之和；否则返回单一类型对应值
    if (isSingleType(exp)) {
        return getExpReportType(exp) === 'word' ? (exp.count || w) : (exp.count || d);
    }
    return w + d;
}

export function getCourseTotalReports(course) {
    return course.experiments.reduce((sum, exp) => sum + getExpCount(exp), 0);
}

/**
 * 格式化日期对象为 YYYY-MM-DD HH:mm
 * @param {Date} [d=new Date()] - 日期对象
 * @returns {string}
 */
export function formatDate(d = new Date()) {
    // 简单格式：YYYY-MM-DD HH:mm
    const pad = (n) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}-${m}-${day} ${hh}:${mm}`;
}

/**
 * 简单的字符串哈希函数 (32位无符号整数)
 * @param {string} s - 待哈希字符串
 * @returns {number}
 */
export function strHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return h;
}
