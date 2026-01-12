// Dify YAML模板
export const difyTemplates = {
    workflow_analysis: `# Dify工作流分析评阅
请从以下维度评阅学生提交的Dify YAML工作流配置：

1. **工作流结构完整性** (25分)
   - 节点配置是否完整
   - 节点连接是否正确
   - 输入输出是否匹配

2. **逻辑设计合理性** (30分)
   - 工作流程是否符合需求
   - 条件判断是否准确
   - 错误处理是否完善

3. **参数配置正确性** (25分)
   - 模型参数设置
   - 提示词质量
   - 变量传递准确性

4. **优化与创新** (20分)
   - 是否有优化思路
   - 是否有创新设计`,

    prompt_quality: `# Dify提示词质量评阅
重点评估YAML中的提示词设计：

1. **提示词清晰度** (30分)
   - 指令是否明确
   - 上下文是否充分
   - 格式要求是否清楚

2. **提示词有效性** (30分)
   - 能否达成目标
   - 输出质量如何
   - 边界情况处理

3. **提示词优化** (20分)
   - token使用效率
   - 上下文管理
   - 性能优化

4. **文档规范** (20分)
   - 注释完整性
   - 命名规范性`,

    integration_test: `# Dify集成测试评阅
评估YAML工作流的实际运行效果：

1. **功能完整性** (30分)
   - 是否实现所有要求功能
   - 边界条件处理
   - 异常情况处理

2. **运行稳定性** (25分)
   - 工作流运行稳定性
   - 错误恢复能力
   - 日志记录完整性

3. **输出质量** (25分)
   - 输出格式规范
   - 内容准确性
   - 可读性

4. **测试覆盖** (20分)
   - 测试用例完整性
   - 测试结果分析`
};

// 实验数据模拟
/**
 * @module Config
 * @description Mock data and template configurations for the system.
 */
export const courseData = {
    hadoop: {
        name: 'Hadoop原理与技术',
        experiments: [
            { id: 'hdfs_exp', name: 'HDFS分布式文件系统部署与操作', reportType: 'word', count: 45 },
            { id: 'mapreduce_exp', name: 'MapReduce编程实现数据统计', reportType: 'word', count: 45 },
            { id: 'yarn_exp', name: 'YARN资源调度配置与监控', reportType: 'word', count: 45 }
        ]
    },
    java: {
        name: 'Java程序设计',
        experiments: [
            { id: 'java_exp1', name: '实验一：Java基本语法', wordCount: 40, difyCount: 0 },
            { id: 'java_exp2', name: '实验二：面向对象编程', wordCount: 38, difyCount: 2 },
            { id: 'java_exp3', name: '实验三：异常处理与集合', wordCount: 35, difyCount: 5 }
        ]
    },
    datastructure: {
        name: '数据结构',
        experiments: [
            { id: 'ds_exp1', name: '实验一：线性表', wordCount: 30, difyCount: 10 },
            { id: 'ds_exp2', name: '实验二：栈和队列', wordCount: 25, difyCount: 20 },
            { id: 'ds_exp3', name: '实验三：二叉树遍历', wordCount: 28, difyCount: 12 }
        ]
    },
    database: {
        name: '数据库原理',
        experiments: [
            { id: 'db_exp1', name: '实验一：SQL基础查询', wordCount: 50, difyCount: 0 },
            { id: 'db_exp2', name: '实验二：数据库设计与范式', wordCount: 45, difyCount: 0 }
        ]
    }
};
