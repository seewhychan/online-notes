/**
 * Word文档渲染模块 - 完整目录支持版
 */
const WordRenderer = {
    contentElement: null,
    currentScale: 1.0,
    toolbarCollapsed: false,

    init: function(contentElement) {
        this.contentElement = contentElement;
        this.restoreToolbarState();
    },

    render: async function(docxUrl) {
        if (typeof docx === 'undefined' || typeof JSZip === 'undefined') {
            this.showError('渲染引擎库加载失败，请检查网络连接。');
            return;
        }

        this.showLoading();
        document.body.classList.add('word-active');

        try {
            const response = await fetch(encodeURI(docxUrl));
            if (!response.ok) throw new Error(`文件获取失败: ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();

            // 创建带工具栏的容器
            this.createWordViewer();
            const container = document.getElementById('word-container');

            await docx.renderAsync(arrayBuffer, container, null, {
                className: "docx-viewer",
                inWrapper: true,
                ignoreWidth: true,
                breakPages: true
            });

            // 后置处理：提取目录、初始化缩放
            setTimeout(() => {
                this.extractAndGenerateTOC();
                this.applyInitialScale();
                this.bindScrollListener();
            }, 500);  // 增加延迟，确保DOM完全渲染

        } catch (error) {
            console.error('Word 处理失败:', error);
            this.showError('文档解析失败: ' + error.message);
        }
    },

    /**
     * 创建 Word 查看器结构
     */
    createWordViewer: function() {
        const toolbarHtml = `
            <div class="word-toolbar pdf-toolbar ${this.toolbarCollapsed ? 'collapsed' : ''}">
                <div class="pdf-toolbar-content">
                    <div class="pdf-controls">
                        <div class="pdf-zoom">
                            <button id="word-zoom-out" class="pdf-btn" title="缩小">-</button>
                            <span class="pdf-zoom-level" id="word-zoom-level">${Math.round(this.currentScale * 100)}%</span>
                            <button id="word-zoom-in" class="pdf-btn" title="放大">+</button>
                            <button id="word-fit-width" class="pdf-btn" title="适应宽度">⚏</button>
                        </div>
                    </div>
                </div>
            </div>
            <button class="pdf-toolbar-toggle ${this.toolbarCollapsed ? '' : 'expanded'}" id="word-toolbar-toggle">
                ${this.toolbarCollapsed ? '☰' : '✕'}
            </button>
        `;

        this.contentElement.innerHTML = `
            <div class="word-viewer">
                ${toolbarHtml}
                <div class="word-container" id="word-scroll-container">
                    <div id="word-container" class="word-content"></div>
                </div>
            </div>
        `;
        this.bindEvents();
    },

    bindEvents: function() {
        document.getElementById('word-toolbar-toggle').addEventListener('click', () => this.toggleToolbar());

        document.getElementById('word-zoom-in').addEventListener('click', () => {
            this.currentScale = Math.min(this.currentScale + 0.1, 3.0);
            this.updateZoom();
        });

        document.getElementById('word-zoom-out').addEventListener('click', () => {
            this.currentScale = Math.max(this.currentScale - 0.1, 0.5);
            this.updateZoom();
        });

        document.getElementById('word-fit-width').addEventListener('click', () => {
            this.fitToWidth();
        });
    },

    /**
     * 提取标题并生成目录（增强版，支持docx-preview特殊结构）
     */
    extractAndGenerateTOC: function() {
        const container = document.getElementById('word-container');
        const tocNav = document.getElementById('toc-nav');

        if (!container || !tocNav) {
            console.warn('TOC: 容器元素未找到');
            return;
        }

        // 尝试多种方式查找标题
        let headings = [];

        // 方法1：标准HTML标题标签
        headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');


        // 方法2：如果没有标准标题，尝试通过docx样式类查找
        if (headings.length === 0) {
            // docx-preview可能使用特定的样式类标识标题
            const allParagraphs = container.querySelectorAll('p, div');
            // 输出前几个段落的详细信息用于调试
            if (allParagraphs.length > 0) {

                Array.from(allParagraphs).slice(0, 3).forEach((p, i) => {
                    const computed = window.getComputedStyle(p);
                });
            }

            headings = Array.from(allParagraphs).filter(p => {
                const style = p.getAttribute('style') || '';
                const className = p.className || '';
                const text = p.textContent.trim();
                const computed = window.getComputedStyle(p);
                const fontSize = parseFloat(computed.fontSize);
                const fontWeight = parseInt(computed.fontWeight) || 400;

                // 检查是否有标题样式（字号大、加粗等）
                // 放宽条件：只要有一个标题特征即可
                // 增加对字号的判断：大于16px通常是标题（正文通常是14px或16px，但标题通常更大或加粗）
                return text.length > 0 && text.length < 100 && (
                    style.includes('bold') ||
                    style.includes('font-weight') ||
                    className.includes('heading') ||
                    className.includes('title') ||
                    className.includes('Heading') ||
                    fontWeight >= 600 || // 显式加粗
                    fontSize >= 18 // 字号明显较大
                );
            });


            // 如果还是没有，尝试通过字体大小和字重判断
            if (headings.length === 0) {
                const paragraphs = Array.from(allParagraphs).filter(p => {
                    const text = p.textContent.trim();
                    return text.length > 0 && text.length < 200; // 过滤掉空段和超长段
                });

                const fontSizes = paragraphs.map(p => {
                    const style = window.getComputedStyle(p);
                    return parseFloat(style.fontSize);
                });
                const avgSize = fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length;

                headings = paragraphs.filter(p => {
                    const computed = window.getComputedStyle(p);
                    const size = parseFloat(computed.fontSize);
                    const weight = parseInt(computed.fontWeight);
                    const text = p.textContent.trim();

                    // 更宽松的条件：较大字号 OR 加粗 + 短文本
                    return (size > avgSize * 1.15) ||
                           (weight >= 600 && text.length < 100);
                });


                // 输出找到的标题样本
                if (headings.length > 0) {
                    Array.from(headings).slice(0, 5).forEach((h, i) => {
                        const computed = window.getComputedStyle(h);
                    });
                }
            }
        }

        if (headings.length === 0) {
            tocNav.innerHTML = '<p class="toc-empty">未发现文档目录结构</p>';
            return;
        }

        // 为标题添加ID和级别
        headings.forEach((heading, index) => {
            if (!heading.id) {
                heading.id = `word-heading-${index}`;
            }
            // 如果不是h标签，需要推断级别
            if (!heading.tagName.match(/^H[1-6]$/)) {
                const fontSize = parseFloat(window.getComputedStyle(heading).fontSize);
                // 根据字体大小分配级别（简单启发式）
                if (fontSize >= 24) heading.dataset.level = '1';
                else if (fontSize >= 20) heading.dataset.level = '2';
                else if (fontSize >= 18) heading.dataset.level = '3';
                else heading.dataset.level = '4';
            }
        });

        // 构建目录HTML
        const tocHtml = this.buildTOCHtml(headings);
        tocNav.innerHTML = tocHtml;

        // 绑定事件
        this.bindTOCEvents();
    },

    /**
     * 构建目录HTML（支持折叠）
     */
    buildTOCHtml: function(headings) {
        const tree = this.buildHeadingTree(headings);
        return this.renderTOCTree(tree, 0);
    },

    /**
     * 构建标题树结构（增强版）
     */
    buildHeadingTree: function(headings) {
        const tree = [];
        const stack = [{ level: 0, children: tree }];

        headings.forEach((heading) => {
            // 获取级别
            let level;
            if (heading.tagName.match(/^H[1-6]$/)) {
                level = parseInt(heading.tagName.charAt(1));
            } else if (heading.dataset.level) {
                level = parseInt(heading.dataset.level);
            } else {
                level = 3; // 默认级别
            }

            const node = {
                id: heading.id,
                text: heading.textContent.trim(),
                level: level,
                children: []
            };

            while (stack.length > 1 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }

            stack[stack.length - 1].children.push(node);
            stack.push(node);
        });

        return tree;
    },

    /**
     * 渲染目录树
     */
    renderTOCTree: function(nodes, parentLevel) {
        let html = '<ul class="toc-list">';

        nodes.forEach(node => {
            html += `<li class="toc-item toc-level-${node.level}">`;

            if (node.children.length > 0) {
                // 有子项的目录项
                html += '<div class="toc-item-header">';
                html += '<span class="toc-toggle-icon">▼</span>';
                html += `<a href="#${node.id}" class="toc-link" data-target="${node.id}">`;
                html += `<span class="toc-title">${this.escapeHtml(node.text)}</span>`;
                html += '</a>';
                html += '</div>';
                html += '<ul class="toc-children">';
                html += this.renderTOCTree(node.children, node.level);
                html += '</ul>';
            } else {
                // 无子项的目录项
                html += `<a href="#${node.id}" class="toc-link" data-target="${node.id}">`;
                html += `<span class="toc-title">${this.escapeHtml(node.text)}</span>`;
                html += '</a>';
            }

            html += '</li>';
        });

        html += '</ul>';
        return html;
    },

    /**
     * 绑定目录事件
     */
    bindTOCEvents: function() {
        // 绑定目录点击事件
        const tocLinks = document.querySelectorAll('#toc-nav .toc-link');
        tocLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    // 滚动到目标位置
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    this.highlightTOCItem(targetId);
                }
            });
        });

        // 绑定折叠图标点击事件
        const toggleIcons = document.querySelectorAll('#toc-nav .toc-toggle-icon');
        toggleIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const li = e.target.closest('.toc-item');
                const children = li.querySelector('.toc-children');

                if (children) {
                    const isOpen = children.style.display !== 'none';
                    children.style.display = isOpen ? 'none' : 'block';
                    e.target.textContent = isOpen ? '▶' : '▼';
                }
            });
        });
    },

    /**
     * 绑定滚动监听
     */
    bindScrollListener: function() {
        const scrollContainer = document.getElementById('word-scroll-container');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', () => {
                this.updateTOCHighlight();
            });
        }
    },

    /**
     * 更新目录高亮
     */
    updateTOCHighlight: function() {
        const container = document.getElementById('word-container');
        if (!container) return;

        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let currentHeading = null;

        // 找到当前可见的标题
        headings.forEach(heading => {
            const rect = heading.getBoundingClientRect();
            if (rect.top <= 150) {
                currentHeading = heading;
            }
        });

        if (currentHeading) {
            this.highlightTOCItem(currentHeading.id);
        }
    },

    /**
     * 高亮指定的目录项
     */
    highlightTOCItem: function(targetId) {
        // 清除所有高亮
        const tocLinks = document.querySelectorAll('#toc-nav .toc-link');
        tocLinks.forEach(link => link.classList.remove('active'));

        // 添加新高亮
        const targetLink = document.querySelector(`#toc-nav .toc-link[data-target="${targetId}"]`);
        if (targetLink) {
            targetLink.classList.add('active');
            this.expandTOCParents(targetLink);
            // 确保可见
            targetLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    },

    /**
     * 展开目录项的父级
     */
    expandTOCParents: function(element) {
        let parent = element.parentElement;
        while (parent && parent.id !== 'toc-nav') {
            if (parent.classList.contains('toc-children')) {
                parent.style.display = 'block';
                const parentLi = parent.parentElement;
                if (parentLi && parentLi.classList.contains('toc-item')) {
                    const toggleIcon = parentLi.querySelector('.toc-toggle-icon');
                    if (toggleIcon) {
                        toggleIcon.textContent = '▼';
                    }
                }
            }
            parent = parent.parentElement;
        }
    },

    updateZoom: function() {
        const viewer = document.querySelector('.docx-viewer');
        if (viewer) {
            viewer.style.transform = `scale(${this.currentScale})`;
            viewer.style.transformOrigin = 'top center';
            const container = document.getElementById('word-container');
            container.style.paddingBottom = `${viewer.offsetHeight * (this.currentScale - 1)}px`;
        }
        document.getElementById('word-zoom-level').textContent = `${Math.round(this.currentScale * 100)}%`;
    },

    fitToWidth: function() {
        const container = document.getElementById('word-scroll-container');
        const viewer = document.querySelector('.docx-viewer');
        if (container && viewer) {
            const containerWidth = container.clientWidth - 60;
            const viewerWidth = viewer.offsetWidth;
            this.currentScale = containerWidth / viewerWidth;
            this.updateZoom();
        }
    },

    toggleToolbar: function() {
        this.toolbarCollapsed = !this.toolbarCollapsed;
        const toolbar = document.querySelector('.word-toolbar');
        const toggleBtn = document.getElementById('word-toolbar-toggle');

        toolbar.classList.toggle('collapsed', this.toolbarCollapsed);
        toggleBtn.classList.toggle('expanded', !this.toolbarCollapsed);
        toggleBtn.innerHTML = this.toolbarCollapsed ? '☰' : '✕';

        localStorage.setItem('wordToolbarCollapsed', this.toolbarCollapsed);
    },

    restoreToolbarState: function() {
        this.toolbarCollapsed = localStorage.getItem('wordToolbarCollapsed') === 'true';
    },

    applyInitialScale: function() {
        this.fitToWidth();
    },

    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    showLoading: function() {
        this.contentElement.innerHTML = `
            <div class="pdf-loading word-loading">
                <div class="loading-spinner"></div>
                <p>正在加载 Word 文档...</p>
            </div>
        `;
    },

    showError: function(message) {
        this.contentElement.innerHTML = `
            <div class="pdf-error" style="color: #ef4444; background: #fff; padding: 40px; border-radius: 8px; margin: 20px; border: 2px solid #fee2e2; text-align: center;">
                <h1 style="color: #b91c1c; margin-bottom: 16px;">😕 解析失败</h1>
                <p style="font-size: 16px; line-height: 1.6;">${message}</p>
            </div>
        `;
    },

    /**
     * 清理资源与 UI 状态
     */
    cleanup: function() {
        document.body.classList.remove('word-active');
        this.contentElement.innerHTML = '';

        // 清空目录侧边栏
        const tocNav = document.getElementById('toc-nav');
        if (tocNav) {
            tocNav.innerHTML = '<p class="toc-empty">选择文章查看目录</p>';
        }

        // 重置状态
        this.currentScale = 1.0;
    }
};
