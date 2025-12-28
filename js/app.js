/**
 * 笔记博客主应用入口
 * 整合所有模块，协调各组件工作
 */
(function() {
    'use strict';

    const App = {
        elements: {
            content: null,
            contentWrapper: null
        },

        init: function() {
            this.elements.content = document.getElementById('content');
            this.elements.contentWrapper = document.querySelector('.content-wrapper');

            // 初始化各模块
            Markdown.init(this.elements.content);
            PDFRenderer.init(this.elements.content);
            WordRenderer.init(this.elements.content);
            Sidebar.init();
            TOC.init();
            Mobile.init();

            // 初始化路由
            Router.init((path) => this.onRouteChange(path));

            // 绑定滚动事件
            this.bindScrollEvent();

            // 绑定主题面板关闭按钮
            this.bindThemePanelClose();

            // 加载文章列表
            this.loadPosts();
        },

        bindScrollEvent: function() {
            if (this.elements.contentWrapper) {
                this.elements.contentWrapper.addEventListener('scroll', () => {
                    // 如果 PDF 激活，不触发 Markdown 的目录滚动高亮
                    if (document.body.classList.contains('pdf-active')) return;
                    TOC.highlightOnScroll(this.elements.content);
                });
            }
        },

        bindThemePanelClose: function() {
            const themePanelClose = document.getElementById('theme-panel-close');
            if (themePanelClose) {
                themePanelClose.addEventListener('click', () => {
                    document.getElementById('theme-panel').classList.remove('show');
                });
            }
        },

        loadPosts: function() {
            Loader.loadPostsTree()
                .then(tree => {
                    Sidebar.setPostsTree(tree);
                    Router.handleRouting();
                })
                .catch(error => {
                    Sidebar.showError(error.message);
                    Markdown.showWelcome();
                });
        },

        onRouteChange: function(path) {
            if (path) {
                this.loadPost(path);
                Sidebar.updateActiveLink(path);
                Sidebar.expandParentFolders(path);
            } else {
                // 先清理所有渲染器，防止清理逻辑误删欢迎页内容
                PDFRenderer.cleanup();
                WordRenderer.cleanup();

                // 再显示欢迎页
                Markdown.showWelcome();
                Sidebar.updateActiveLink(null);
                TOC.clear();
            }
        },

        loadPost: function(filepath) {
            Loader.loadPost(filepath)
                .then(result => {
                    if (result.type === 'markdown') {
                        // 清理其他渲染器
                        PDFRenderer.cleanup();
                        WordRenderer.cleanup();
                        // 渲染Markdown
                        Markdown.render(result.content);
                        TOC.generate(this.elements.content);
                    } else if (result.type === 'pdf') {
                        // 清理之前的内容
                        TOC.clear();
                        WordRenderer.cleanup();
                        // 渲染PDF
                        PDFRenderer.render(result.url);
                    } else if (result.type === 'word') {
                        // 清理其他渲染器
                        PDFRenderer.cleanup();
                        // 渲染Word
                        WordRenderer.render(result.url);
                    }
                })
                .catch(error => {
                    // 清理所有渲染器
                    PDFRenderer.cleanup();
                    WordRenderer.cleanup();
                    Markdown.showError(error.message);
                    TOC.clear();
                });
        }
    };

    // 启动应用
    document.addEventListener('DOMContentLoaded', () => App.init());
})();
