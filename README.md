# 笔记博客

一个基于纯静态技术的轻量级笔记博客系统，支持Markdown，PDF，Word，专为GitHub Pages设计。

> 推荐使用 Markdown ，PDF。
> Word文件解析目前有点问题：1，目录无法解析。2，文件内容遇到特殊格式会解析错误。

**GitHub 仓库**: [https://github.com/ItQianChen/online-notes](https://github.com/ItQianChen/online-notes)

## ✨ 特性

- 📝 **Markdown支持**: 使用 [marked.js](https://marked.js.org/) 解析Markdown，支持GFM语法
- 🎨 **代码高亮**: 使用 [highlight.js](https://highlightjs.org/) 实现语法高亮，支持多种语言
- 📦 **代码块增强**:
    - 自动行号显示
    - 一键复制代码
    - 智能折叠（超过15行自动折叠，可配置）
    - 语言标签显示
- 📂 **树形目录**: 自动扫描`posts`目录，支持多级文件夹作为分类
- ↔️ **侧边栏**: 左右侧边栏均可展开/收缩，状态持久化
- 📑 **文章目录 (TOC)**: 自动生成文章标题目录，支持折叠、滚动高亮同步
- 📄 **PDF阅读增强**: 支持PDF目录自动同步、高亮跟随及异步页码解析
- 💙 **Word文档支持**: 支持`.docx`格式预览，自动生成文章目录（支持多级折叠、自动高亮）
- 🎨 **丰富主题系统**:
    - 内置6种预设主题：浅色☀️、深色🌙、护眼📜、Nord❄️、Dracula🧛、Solarized🌅
    - 支持自定义主题颜色（主色调、背景色、文字色、侧边栏）
    - 主题状态持久化
    - 代码高亮主题自动适配
- 📱 **响应式设计**: 完美适配PC、平板和手机，移动端独立导航
- 🚀 **纯静态**: 无需后端，可轻松部署在任何静态托管服务
- 🔄 **两种数据模式**:
    - **本地模式**: 通过`build.js`生成索引，适合本地开发
    - **GitHub API模式**: 动态读取仓库目录，部署后自动更新，支持离线缓存

## 🚀 快速开始

### 本地预览

1.  **克隆仓库**:
    ```bash
    git clone https://github.com/ItQianChen/online-notes.git
    cd note-md
    ```
2.  **添加文章**: 在`posts/`目录下添加你的Markdown文件。
3.  **本地模式**:
    - 运行构建脚本生成索引：
      ```bash
      node build.js
      ```
    - 启动本地服务器：
      ```bash
      npx serve -l 8080
      ```
4.  **浏览器访问**: 打开 `http://localhost:8080`

### 部署到GitHub Pages

1.  **Fork仓库**: Fork此仓库到你的GitHub账号。
2.  **修改配置**: 修改`js/config.js`文件：
    ```javascript
    const BlogConfig = {
        title: '我的笔记博客',
        // ...
        github: {
            owner: '你的GitHub用户名',
            repo: '你的仓库名称',
            // ...
        },
        useGitHubAPI: true  // 启用GitHub API动态读取
    };
    ```
3.  **启用Pages**: 在你的仓库 `Settings` -> `Pages` 中，选择 `main` 分支并保存。
4.  **访问**: 部署完成后，访问 `https://你的用户名.github.io/你的仓库名/`。

## 📁 目录结构

项目已经过模块化重构，结构如下：

```
note-md/
├── index.html              # 主页面
├── README.md               # 项目说明
├── build.js                # (本地模式) 构建脚本
├── posts.json              # (本地模式) 文章索引
├── css/                    # 样式模块
│   ├── base.css            # 基础样式和CSS变量
│   ├── code.css            # 代码块样式（行号、折叠、复制）
│   ├── content.css         # 主内容区样式
│   ├── mobile.css          # 移动端响应式样式
│   ├── sidebar.css         # 左侧边栏样式
│   ├── theme-panel.css     # 主题选择面板样式
│   ├── toc.css             # 右侧目录样式
│   ├── pdf.css             # PDF渲染样式
│   └── word.css            # Word文档渲染样式
├── js/                     # 脚本模块
│   ├── app.js              # 主应用入口，协调各模块
│   ├── config.js           # 配置文件（GitHub API、代码折叠等）
│   ├── loader.js           # 数据加载模块（本地/GitHub API）
│   ├── markdown.js         # Markdown渲染模块（marked.js集成）
│   ├── mobile.js           # 移动端适配模块
│   ├── router.js           # URL路由模块
│   ├── sidebar.js          # 左侧边栏模块
│   ├── themes.js           # 主题管理模块（6种主题+自定义）
│   ├── toc.js              # TOC目录模块（自动生成、高亮同步）
│   ├── pdf.js              # PDF渲染模块（PDF.js集成）
│   └── word.js             # Word渲染模块（docx-preview集成）
└── posts/                  # 文章内容目录 (Markdown, PDF, Word)
    ├── welcome.md
    └── 前端/
        └── javascript-basics.md
```

## ⚙️ 配置

所有配置项均在 `js/config.js` 中。

- `title`: 博客标题
- `useGitHubAPI`: `true` 使用GitHub API模式, `false` 使用本地模式
- `github`: GitHub API模式下的仓库信息（owner、repo、branch、postsPath）
- `codeBlock`: 代码块配置
    - `foldable`: 是否启用折叠功能（默认true）
    - `foldThreshold`: 超过多少行自动折叠，同时也是折叠后显示的行数（默认15）

## 两种模式

### 1. 本地模式

- **适用场景**: 本地开发、预览，或部署在非GitHub Pages平台。
- **设置**: `useGitHubAPI: false`。
- **工作流程**: 每次新增、删除或重命名文章后，需在项目根目录运行 `node build.js` 来更新`posts.json`索引文件。

### 2. GitHub API 模式

- **适用场景**: 部署到GitHub Pages，实现文章自动更新。
- **设置**: `useGitHubAPI: true`，并正确填写`github`配置。
- **工作流程**: 直接推送`posts`目录的变更到GitHub仓库即可，无需运行任何脚本。

## ✍️ 添加文章

1.  在`posts/`目录下直接创建`.md`文件。
2.  可以创建任意层级的子文件夹来对文章进行分类。
3.  文章标题将从Markdown文件的第一个H1标题 (`# 标题`) 中自动获取。如果不存在H1标题，则使用文件名作为标题。

## 🛠️ 技术栈

-   **核心**: HTML5, CSS3, JavaScript (ES6+)
-   **Markdown解析**: [marked.js v11.1.1](https://marked.js.org/)
-   **代码高亮**: [highlight.js v11.9.0](https://highlightjs.org/)
-   **PDF渲染**: [PDF.js v3.11.174](https://mozilla.github.io/pdf.js/)
-   **Word转换**: [docx-preview](https://github.com/VolodymyrBaydalka/docxjs) + [JSZip](https://stuk.github.io/jszip/)
-   **数据来源**: GitHub API 或 本地`posts.json`文件
-   **架构模式**: 模块化设计，职责分离

## 🎨 主题说明

内置6种精心设计的主题：

| 主题 | 说明 | 适用场景 |
|------|------|---------|
| ☀️ 浅色 | 经典白色背景，适合日间阅读 | 默认主题 |
| 🌙 深色 | 护眼深色模式，减少眼疲劳 | 夜间阅读 |
| 📜 护眼 | 温暖的米黄色调 | 长时间阅读 |
| ❄️ Nord | 北欧风格配色 | 简约爱好者 |
| 🧛 Dracula | 经典暗色主题 | 开发者最爱 |
| 🌅 Solarized | 科学配色方案 | 专业用户 |

所有主题均适配代码高亮，自动切换对应的highlight.js主题。

## 📝 代码块功能

增强的代码块体验：

- **自动行号**: 所有代码块自动显示行号
- **智能折叠**: 超过15行（可配置）的代码块自动折叠，点击展开/收起
- **一键复制**: 点击复制按钮快速复制代码
- **语言标识**: 自动显示代码语言标签
- **主题适配**: 代码高亮随主题自动切换

## License

MIT
