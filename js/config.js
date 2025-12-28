/**
 * 博客配置文件
 */
const BlogConfig = {
    // 博客标题
    title: 'CY的笔记',

    // GitHub仓库配置（用于动态读取文件目录）
    github: {
        // 仓库所有者（你的GitHub用户名）
        owner: 'seewhychan',
        // 仓库名称
        repo: 'online-notes',
        // 分支名称
        branch: 'master',
        // posts目录路径
        postsPath: 'posts'
    },

    // 是否使用GitHub API（设为false则使用本地posts.json）
    useGitHubAPI: true,

    // 代码块配置
    codeBlock: {
        // 是否启用代码块折叠功能
        foldable: true,
        // 超过多少行自动折叠，同时也是折叠后显示的行数（默认15行）
        foldThreshold: 15
    }
};
