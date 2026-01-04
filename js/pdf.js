/**
 * PDF渲染模块 - 增强版
 * 支持高清晰度渲染、翻页模式切换、目录功能和UI改进
 */
const PDFRenderer = {
    contentElement: null,
    currentPdfDoc: null,
    currentScale: 1.5,
    currentPage: 1,
    totalPages: 0,
    viewMode: 'scroll', // 'paged' 或 'scroll'
    devicePixelRatio: window.devicePixelRatio || 1,
    outline: null,
    toolbarCollapsed: false,
    scrollHandler: null, // 存储滚动事件处理器

    init: function(contentElement) {
        this.contentElement = contentElement;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.restoreToolbarState();
    },

    render: function(pdfUrl) {
        this.showLoading();
        document.body.classList.add('pdf-active');

        // 使用PDF.js加载PDF
        pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
            this.currentPdfDoc = pdf;
            this.totalPages = pdf.numPages;
            this.currentPage = 1;

            // 提取目录
            this.extractOutline();

            this.createPdfViewer();
            if (this.viewMode === 'paged') {
                this.renderPage(1);
            } else {
                this.renderScrollMode();
            }
        }).catch(error => {
            this.showError('PDF加载失败: ' + error.message);
        });
    },

    // 提取PDF目录并解析页码
    extractOutline: function() {
        if (!this.currentPdfDoc) return;

        this.currentPdfDoc.getOutline().then(async outline => {
            if (!outline || outline.length === 0) {
                this.clearTOC();
                return;
            }

            // 异步解析所有目录项的实际页码
            await this.resolveOutlinePages(outline);
            this.outline = outline;
            this.generateTOC();
        }).catch(error => {
            console.log('PDF无目录信息:', error);
            this.clearTOC();
        });
    },

    // 递归解析目录项的页码引用
    resolveOutlinePages: async function(items) {
        for (const item of items) {
            if (item.dest) {
                try {
                    // 如果 dest 是字符串（命名目的地），先解析它
                    let dest = item.dest;
                    if (typeof dest === 'string') {
                        dest = await this.currentPdfDoc.getDestination(dest);
                    }

                    if (dest) {
                        // 解析目的地获取页码索引
                        const pageIndex = await this.currentPdfDoc.getPageIndex(dest[0]);
                        item.resolvedPage = pageIndex + 1;
                    }
                } catch (e) {
                    console.warn('解析目录页码失败:', e);
                    item.resolvedPage = 1;
                }
            } else {
                item.resolvedPage = 1;
            }

            if (item.items && item.items.length > 0) {
                await this.resolveOutlinePages(item.items);
            }
        }
    },

    // 生成目录（支持折叠）
    generateTOC: function() {
        if (!this.outline || this.outline.length === 0) {
            this.clearTOC();
            return;
        }

        const tocNav = document.getElementById('toc-nav');
        if (!tocNav) return;

        const tocHtml = this.buildTOCHtml(this.outline);
        tocNav.innerHTML = tocHtml;

        // 绑定目录点击事件
        this.bindTOCEvents();
        // 初始高亮
        this.highlightCurrentTOCItem();
    },

    // 构建目录HTML（支持折叠）
    buildTOCHtml: function(items, level = 0) {
        let html = '<ul class="toc-list">';

        items.forEach(item => {
            const pageNum = item.resolvedPage || 1;
            html += `<li class="toc-item toc-level-${level + 1}" data-page="${pageNum}">`;

            if (item.items && item.items.length > 0) {
                // 有子项的目录项
                html += '<div class="toc-item-header">';
                html += '<span class="toc-toggle-icon">▼</span>';
                html += `<a href="#" class="toc-link" data-dest="${encodeURIComponent(JSON.stringify(item.dest))}" data-page="${pageNum}">`;
                html += `<span class="toc-title">${this.escapeHtml(item.title)}</span>`;
                html += '</a>';
                html += '</div>';

                html += '<ul class="toc-children">';
                html += this.buildTOCHtml(item.items, level + 1);
                html += '</ul>';
            } else {
                // 无子项的目录项
                html += `<a href="#" class="toc-link" data-dest="${encodeURIComponent(JSON.stringify(item.dest))}" data-page="${pageNum}">`;
                html += `<span class="toc-title">${this.escapeHtml(item.title)}</span>`;
                html += '</a>';
            }

            html += '</li>';
        });

        html += '</ul>';
        return html;
    },

    // 绑定目录事件
    bindTOCEvents: function() {
        // 绑定目录链接点击事件
        const tocLinks = document.querySelectorAll('.toc-link');
        tocLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const linkElem = e.target.closest('.toc-link');
                const destData = linkElem.getAttribute('data-dest');
                const pageNum = linkElem.getAttribute('data-page');

                if (destData) {
                    try {
                        const dest = JSON.parse(decodeURIComponent(destData));
                        // 优先使用已解析的页码，加快响应速度
                        if (pageNum) {
                            const page = parseInt(pageNum);
                            this.currentPage = page;
                            if (this.viewMode === 'paged') this.renderPage(page);
                            else this.scrollToPage(page);
                            this.updatePageInput();
                            this.highlightCurrentTOCItem();
                        } else {
                            this.navigateToDestination(dest);
                        }
                    } catch (error) {
                        console.error('目录导航失败:', error);
                    }
                }
            });
        });

        // 绑定目录折叠事件
        const toggleIcons = document.querySelectorAll('.toc-toggle-icon');
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

    // 高亮当前页面对应的目录项
    highlightCurrentTOCItem: function() {
        // 清除之前的高亮 - 同时清除 li 和 a
        const activeItems = document.querySelectorAll('.toc-item.active, .toc-link.active');
        activeItems.forEach(item => item.classList.remove('active'));

        // 找到当前页面对应的目录项
        const tocNav = document.getElementById('toc-nav');
        if (!tocNav) return;

        const tocItems = Array.from(tocNav.querySelectorAll('.toc-item[data-page]'));
        let bestMatch = null;
        let bestMatchPage = 0;

        tocItems.forEach(item => {
            const pageNumAttr = item.getAttribute('data-page');
            const itemPage = parseInt(pageNumAttr);
            if (!isNaN(itemPage) && itemPage <= this.currentPage && itemPage >= bestMatchPage) {
                bestMatch = item;
                bestMatchPage = itemPage;
            }
        });

        if (bestMatch) {
            // 只给 a 标签加 active，与 Markdown TOC 逻辑完全对齐
            const link = bestMatch.querySelector('.toc-link');
            if (link) {
                link.classList.add('active');
                // 确保可见
                link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            // 确保父级目录项展开
            this.expandTOCParents(bestMatch);
        }
    },

    // 展开目录项的父级
    expandTOCParents: function(item) {
        let parent = item.parentElement;
        while (parent && parent.classList.contains('toc-children')) {
            parent.style.display = 'block';
            const parentItem = parent.previousElementSibling;
            if (parentItem && parentItem.classList.contains('toc-item-header')) {
                const toggleIcon = parentItem.querySelector('.toc-toggle-icon');
                if (toggleIcon) {
                    toggleIcon.textContent = '▼';
                }
            }
            parent = parent.parentElement.parentElement;
        }
    },

    // 导航到目标位置
    navigateToDestination: function(dest) {
        if (!this.currentPdfDoc || !dest) return;

        // 获取目标页码
        this.currentPdfDoc.getPageIndex(dest[0]).then(pageIndex => {
            const pageNum = pageIndex + 1;
            this.currentPage = pageNum;

            if (this.viewMode === 'paged') {
                this.renderPage(pageNum);
            } else {
                this.scrollToPage(pageNum);
            }

            this.updatePageInput();
            this.highlightCurrentTOCItem();
        }).catch(error => {
            console.error('导航失败:', error);
        });
    },

    // 清空目录
    clearTOC: function() {
        const tocNav = document.getElementById('toc-nav');
        if (tocNav) {
            tocNav.innerHTML = '<p class="toc-empty">此PDF无目录信息</p>';
        }
    },

    createPdfViewer: function() {
        this.contentElement.innerHTML = `
            <div class="pdf-viewer">
                <div class="pdf-toolbar ${this.toolbarCollapsed ? 'collapsed' : ''}">
                    <div class="pdf-toolbar-content">
                        <div class="pdf-nav">
                            <button id="pdf-prev" class="pdf-btn" title="上一页">◀</button>
                            <span class="pdf-page-info">
                                <input type="number" id="pdf-page-input" value="1" min="1" max="${this.totalPages}">
                                / ${this.totalPages}
                            </span>
                            <button id="pdf-next" class="pdf-btn" title="下一页">▶</button>
                        </div>
                        <div class="pdf-controls">
                            <div class="pdf-view-mode">
                                <button id="pdf-mode-paged" class="pdf-btn ${this.viewMode === 'paged' ? 'active' : ''}" title="翻页模式">📄</button>
                                <button id="pdf-mode-scroll" class="pdf-btn ${this.viewMode === 'scroll' ? 'active' : ''}" title="滚动模式">📜</button>
                            </div>
                            <div class="pdf-zoom">
                                <button id="pdf-zoom-out" class="pdf-btn" title="缩小">-</button>
                                <span class="pdf-zoom-level">${Math.round(this.currentScale * 100)}%</span>
                                <button id="pdf-zoom-in" class="pdf-btn" title="放大">+</button>
                                <button id="pdf-fit-width" class="pdf-btn" title="适应宽度">⚏</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="pdf-container" id="pdf-container">
                    ${this.viewMode === 'paged' ? '<canvas id="pdf-canvas"></canvas>' : '<div id="pdf-scroll-container"></div>'}
                </div>
                <button class="pdf-toolbar-toggle ${this.toolbarCollapsed ? '' : 'expanded'}" id="pdf-toolbar-toggle" title="${this.toolbarCollapsed ? '展开工具栏' : '收起工具栏'}">
                    ${this.toolbarCollapsed ? '☰' : '✕'}
                </button>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents: function() {
        // 工具栏折叠按钮
        document.getElementById('pdf-toolbar-toggle').addEventListener('click', () => {
            this.toggleToolbar();
        });

        // 页面导航
        document.getElementById('pdf-prev').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                if (this.viewMode === 'paged') {
                    this.renderPage(this.currentPage);
                } else {
                    this.scrollToPage(this.currentPage);
                }
                this.updatePageInput();
                this.highlightCurrentTOCItem();
            }
        });

        document.getElementById('pdf-next').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                if (this.viewMode === 'paged') {
                    this.renderPage(this.currentPage);
                } else {
                    this.scrollToPage(this.currentPage);
                }
                this.updatePageInput();
                this.highlightCurrentTOCItem();
            }
        });

        // 页码输入
        document.getElementById('pdf-page-input').addEventListener('change', (e) => {
            const pageNum = parseInt(e.target.value);
            if (pageNum >= 1 && pageNum <= this.totalPages) {
                this.currentPage = pageNum;
                if (this.viewMode === 'paged') {
                    this.renderPage(this.currentPage);
                } else {
                    this.scrollToPage(this.currentPage);
                }
                this.highlightCurrentTOCItem();
            } else {
                e.target.value = this.currentPage;
            }
        });

        // 视图模式切换
        document.getElementById('pdf-mode-paged').addEventListener('click', () => {
            this.switchViewMode('paged');
        });

        document.getElementById('pdf-mode-scroll').addEventListener('click', () => {
            this.switchViewMode('scroll');
        });

        // 缩放控制
        document.getElementById('pdf-zoom-in').addEventListener('click', () => {
            this.currentScale = Math.min(this.currentScale * 1.2, 5.0);
            this.refreshCurrentView();
            this.updateZoomLevel();
        });

        document.getElementById('pdf-zoom-out').addEventListener('click', () => {
            this.currentScale = Math.max(this.currentScale / 1.2, 0.3);
            this.refreshCurrentView();
            this.updateZoomLevel();
        });

        document.getElementById('pdf-fit-width').addEventListener('click', () => {
            this.fitToWidth();
        });

        // 键盘导航
        document.addEventListener('keydown', (e) => {
            if (this.currentPdfDoc) {
                switch(e.key) {
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        if (this.viewMode === 'paged' && this.currentPage > 1) {
                            this.currentPage--;
                            this.renderPage(this.currentPage);
                            this.updatePageInput();
                            this.highlightCurrentTOCItem();
                        }
                        e.preventDefault();
                        break;
                    case 'ArrowRight':
                    case 'ArrowDown':
                        if (this.viewMode === 'paged' && this.currentPage < this.totalPages) {
                            this.currentPage++;
                            this.renderPage(this.currentPage);
                            this.updatePageInput();
                            this.highlightCurrentTOCItem();
                        }
                        e.preventDefault();
                        break;
                }
            }
        });

        // 绑定滚动事件（如果当前是滚动模式）
        this.bindScrollEvents();

    },

    // 绑定滚动事件 - 优化版本
    bindScrollEvents: function() {
        // 清理之前的滚动事件监听器
        this.removeScrollEvents();

        if (this.viewMode === 'scroll') {
            const container = document.getElementById('pdf-container');
            if (container) {
                // 创建新的滚动事件处理器
                this.scrollHandler = this.throttle(() => {
                    this.updateCurrentPageFromScroll();
                    this.highlightCurrentTOCItem();
                }, 50); // 提高响应性

                // 添加滚动事件监听器
                container.addEventListener('scroll', this.scrollHandler, { passive: true });
            }
        }
    },

    // 移除滚动事件监听器
    removeScrollEvents: function() {
        if (this.scrollHandler) {
            const container = document.getElementById('pdf-container');
            if (container) {
                container.removeEventListener('scroll', this.scrollHandler);
            }
            this.scrollHandler = null;
        }
    },

    // 节流函数 - 优化版本
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },

    // 工具栏折叠切换
    toggleToolbar: function() {
        this.toolbarCollapsed = !this.toolbarCollapsed;
        const toolbar = document.querySelector('.pdf-toolbar');
        const toggleBtn = document.getElementById('pdf-toolbar-toggle');

        if (toolbar) {
            toolbar.classList.toggle('collapsed', this.toolbarCollapsed);
        }

        if (toggleBtn) {
            toggleBtn.classList.toggle('expanded', !this.toolbarCollapsed);
            toggleBtn.innerHTML = this.toolbarCollapsed ? '☰' : '✕';
            toggleBtn.title = this.toolbarCollapsed ? '展开工具栏' : '收起工具栏';
        }

        // 保存状态
        localStorage.setItem('pdfToolbarCollapsed', this.toolbarCollapsed);
    },

    // 恢复工具栏状态
    restoreToolbarState: function() {
        const saved = localStorage.getItem('pdfToolbarCollapsed');
        if (saved === 'true') {
            this.toolbarCollapsed = true;
        }
    },

    // 切换视图模式
    switchViewMode: function(mode) {
        if (this.viewMode === mode) return;

        this.viewMode = mode;

        // 更新按钮状态
        document.getElementById('pdf-mode-paged').classList.toggle('active', mode === 'paged');
        document.getElementById('pdf-mode-scroll').classList.toggle('active', mode === 'scroll');

        // 重新创建容器
        const container = document.getElementById('pdf-container');

        if (mode === 'paged') {
            container.innerHTML = '<canvas id="pdf-canvas"></canvas>';
            this.renderPage(this.currentPage);
        } else {
            container.innerHTML = '<div id="pdf-scroll-container"></div>';
            this.renderScrollMode();
        }

        // 重新绑定滚动事件
        this.bindScrollEvents();
        this.highlightCurrentTOCItem();
    },

    // 翻页模式渲染
    renderPage: function(pageNum) {
        if (!this.currentPdfDoc) return;

        this.currentPdfDoc.getPage(pageNum).then(page => {
            const canvas = document.getElementById('pdf-canvas');
            const context = canvas.getContext('2d');

            // 使用设备像素比提高清晰度
            const viewport = page.getViewport({ scale: this.currentScale });
            const outputScale = this.devicePixelRatio;

            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            canvas.style.width = Math.floor(viewport.width) + 'px';
            canvas.style.height = Math.floor(viewport.height) + 'px';

            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

            const renderContext = {
                canvasContext: context,
                transform: transform,
                viewport: viewport
            };

            page.render(renderContext).promise.then(() => {
                this.updatePageInput();
                this.updatePageButtons();
                this.highlightCurrentTOCItem();
            });
        }).catch(error => {
            this.showError('页面渲染失败: ' + error.message);
        });
    },

    // 滚动模式渲染
    renderScrollMode: function() {
        const scrollContainer = document.getElementById('pdf-scroll-container');
        scrollContainer.innerHTML = '';

        // 渲染所有页面
        const renderPromises = [];
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            renderPromises.push(this.renderPageInScroll(pageNum, scrollContainer));
        }

        // 等待所有页面渲染完成后绑定滚动事件
        Promise.all(renderPromises).then(() => {
            // 确保DOM更新后再绑定事件
            requestAnimationFrame(() => {
                this.bindScrollEvents();
                this.highlightCurrentTOCItem();
            });
        }).catch(error => {
            console.error('滚动模式渲染失败:', error);
        });
    },

    // 在滚动容器中渲染单页 - 返回Promise
    renderPageInScroll: function(pageNum, container) {
        return this.currentPdfDoc.getPage(pageNum).then(page => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'pdf-page-scroll';
            pageDiv.setAttribute('data-page', pageNum);

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            // 使用设备像素比提高清晰度
            const viewport = page.getViewport({ scale: this.currentScale });
            const outputScale = this.devicePixelRatio;

            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            canvas.style.width = Math.floor(viewport.width) + 'px';
            canvas.style.height = Math.floor(viewport.height) + 'px';

            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

            const renderContext = {
                canvasContext: context,
                transform: transform,
                viewport: viewport
            };

            pageDiv.appendChild(canvas);
            container.appendChild(pageDiv);

            return page.render(renderContext).promise;
        });
    },

    // 滚动到指定页面
    scrollToPage: function(pageNum) {
        const pageElement = document.querySelector(`[data-page="${pageNum}"]`);
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    // 从滚动位置更新当前页码 - 优化版本
    updateCurrentPageFromScroll: function() {
        const container = document.getElementById('pdf-container');
        const pages = container.querySelectorAll('.pdf-page-scroll');

        if (pages.length === 0) return;

        const containerTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const viewportCenter = containerTop + containerHeight / 2;

        let currentPage = 1;
        let minDistance = Infinity;

        pages.forEach(page => {
            const pageTop = page.offsetTop;
            const pageHeight = page.offsetHeight;
            const pageCenter = pageTop + pageHeight / 2;
            const distance = Math.abs(pageCenter - viewportCenter);

            if (distance < minDistance) {
                minDistance = distance;
                currentPage = parseInt(page.getAttribute('data-page'));
            }
        });

        // 只有当页码真正改变时才更新
        if (currentPage !== this.currentPage) {
            this.currentPage = currentPage;
            this.updatePageInput();
        }
    },

    // 刷新当前视图
    refreshCurrentView: function() {
        if (this.viewMode === 'paged') {
            this.renderPage(this.currentPage);
        } else {
            this.renderScrollMode();
        }
    },

    updatePageButtons: function() {
        const prevBtn = document.getElementById('pdf-prev');
        const nextBtn = document.getElementById('pdf-next');

        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
    },

    updatePageInput: function() {
        const pageInput = document.getElementById('pdf-page-input');
        if (pageInput && parseInt(pageInput.value) !== this.currentPage) {
            pageInput.value = this.currentPage;
        }
        this.updatePageButtons();
    },

    updateZoomLevel: function() {
        const zoomLevel = document.querySelector('.pdf-zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(this.currentScale * 100) + '%';
        }
    },

    fitToWidth: function() {
        if (!this.currentPdfDoc) return;

        this.currentPdfDoc.getPage(this.currentPage).then(page => {
            const container = document.querySelector('.pdf-container');
            const containerWidth = container.clientWidth - 40;
            const viewport = page.getViewport({ scale: 1.0 });

            this.currentScale = containerWidth / viewport.width;
            this.refreshCurrentView();
            this.updateZoomLevel();
        });
    },

    showLoading: function() {
        this.contentElement.innerHTML = `
            <div class="pdf-loading">
                <div class="loading-spinner"></div>
                <p>正在加载PDF文件...</p>
            </div>
        `;
    },

    showError: function(message) {
        this.contentElement.innerHTML = `
            <div class="pdf-error">
                <h1>😕 PDF加载失败</h1>
                <p>${message}</p>
                <p>请检查文件是否存在或网络连接是否正常。</p>
            </div>
        `;
    },

    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 清理资源
    cleanup: function() {
        document.body.classList.remove('pdf-active');

        // 移除滚动事件监听器
        this.removeScrollEvents();

        if (this.currentPdfDoc) {
            this.currentPdfDoc.destroy();
            this.currentPdfDoc = null;
        }
        this.currentPage = 1;
        this.totalPages = 0;
        this.currentScale = 1.5;
        this.outline = null;
        this.clearTOC();
    }
};
