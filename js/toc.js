/**
 * TOC目录模块 - 增强版
 * 管理右侧文章目录，支持折叠和拖拽调整宽度
 */
const TOC = {
    elements: {
        tocSidebar: null,
        tocNav: null,
        toggleBtn: null,
        resizeHandle: null
    },

    // 拖拽相关状态
    isResizing: false,
    startX: 0,
    startWidth: 260,
    minWidth: 200,
    maxWidth: 500,

    init: function() {
        this.elements.tocSidebar = document.getElementById('toc-sidebar');
        this.elements.tocNav = document.getElementById('toc-nav');
        this.elements.toggleBtn = document.getElementById('toggle-toc');

        // 设置默认折叠 margin 变量
        if (this.elements.tocSidebar) {
            const initialWidth = this.elements.tocSidebar.offsetWidth || 260;
            document.documentElement.style.setProperty('--toc-collapsed-margin', `-${initialWidth}px`);
        }

        this.bindEvents();
        this.restoreState();
        this.createResizeHandle();
    },

    bindEvents: function() {
        if (this.elements.toggleBtn) {
            this.elements.toggleBtn.addEventListener('click', () => this.toggle());
        }
    },

    // 创建拖拽调整手柄
    createResizeHandle: function() {
        if (!this.elements.tocSidebar) return;

        const handle = document.createElement('div');
        handle.className = 'toc-resize-handle';
        handle.title = '拖拽调整目录宽度';

        this.elements.tocSidebar.appendChild(handle);
        this.elements.resizeHandle = handle;

        // 绑定拖拽事件
        handle.addEventListener('mousedown', (e) => this.startResize(e));
        document.addEventListener('mousemove', (e) => this.doResize(e));
        document.addEventListener('mouseup', () => this.stopResize());

        // 触摸事件支持
        handle.addEventListener('touchstart', (e) => this.startResize(e.touches[0]));
        document.addEventListener('touchmove', (e) => this.doResize(e.touches[0]));
        document.addEventListener('touchend', () => this.stopResize());
    },

    // 开始拖拽调整
    startResize: function(e) {
        this.isResizing = true;
        this.startX = e.clientX;
        this.startWidth = this.elements.tocSidebar.offsetWidth;

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        // 添加拖拽状态类
        this.elements.tocSidebar.classList.add('resizing');

        e.preventDefault();
    },

    // 执行拖拽调整
    doResize: function(e) {
        if (!this.isResizing) return;

        const deltaX = this.startX - e.clientX;
        const newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.startWidth + deltaX));

        this.setTocWidth(newWidth);
        e.preventDefault();
    },

    // 停止拖拽调整
    stopResize: function() {
        if (!this.isResizing) return;

        this.isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // 移除拖拽状态类
        this.elements.tocSidebar.classList.remove('resizing');

        // 保存宽度
        const currentWidth = this.elements.tocSidebar.offsetWidth;
        localStorage.setItem('tocWidth', currentWidth);
    },

    // 设置TOC宽度
    setTocWidth: function(width) {
        if (!this.elements.tocSidebar) return;

        this.elements.tocSidebar.style.width = width + 'px';
        this.elements.tocSidebar.style.minWidth = width + 'px';

        // 更新折叠按钮位置
        if (this.elements.toggleBtn) {
            this.elements.toggleBtn.style.right = width + 'px';
        }

        // 更新折叠时的margin
        const collapsedMargin = -width + 'px';
        document.documentElement.style.setProperty('--toc-collapsed-margin', collapsedMargin);
    },

    toggle: function() {
        const toc = this.elements.tocSidebar;
        const btn = this.elements.toggleBtn;

        toc.classList.toggle('collapsed');

        if (toc.classList.contains('collapsed')) {
            btn.textContent = '◀';
            btn.title = '展开目录';
            // 确保按钮移动到最右侧
            btn.style.right = '0';
        } else {
            btn.textContent = '▶';
            btn.title = '收起目录';
            // 恢复基于当前宽度的位置
            btn.style.right = toc.offsetWidth + 'px';
        }

        localStorage.setItem('tocCollapsed', toc.classList.contains('collapsed'));
    },

    restoreState: function() {
        if (window.innerWidth <= 768) return;

        // 恢复折叠状态
        if (localStorage.getItem('tocCollapsed') === 'true') {
            this.elements.tocSidebar.classList.add('collapsed');
            if (this.elements.toggleBtn) {
                this.elements.toggleBtn.textContent = '◀';
                this.elements.toggleBtn.title = '展开目录';
            }
        }

        // 恢复宽度
        const savedWidth = localStorage.getItem('tocWidth');
        if (savedWidth) {
            const width = Math.max(this.minWidth, Math.min(this.maxWidth, parseInt(savedWidth)));
            this.setTocWidth(width);
        }
    },

    generate: function(contentElement) {
        const tocNav = this.elements.tocNav;
        if (!tocNav) return;

        tocNav.innerHTML = '';

        const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');

        if (headings.length === 0) {
            tocNav.innerHTML = '<p class="toc-empty">暂无目录</p>';
            return;
        }

        const tree = this.buildTree(headings);
        const ul = document.createElement('ul');
        ul.className = 'toc-list';
        this.renderTree(tree, ul, true);
        tocNav.appendChild(ul);
    },

    buildTree: function(headings) {
        const tree = [];
        const stack = [{ level: 0, children: tree }];

        headings.forEach((heading) => {
            const level = parseInt(heading.tagName.charAt(1));
            const node = {
                id: heading.id,
                text: heading.textContent,
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

    renderTree: function(nodes, container, defaultOpen) {
        nodes.forEach(node => {
            const li = document.createElement('li');
            li.className = `toc-item toc-level-${node.level}`;

            if (node.children.length > 0) {
                li.classList.add('toc-folder');
                if (defaultOpen) {
                    li.classList.add('open');
                }

                const toggle = document.createElement('span');
                toggle.className = 'toc-toggle-icon';
                toggle.textContent = defaultOpen ? '▼' : '▶';
                toggle.onclick = (e) => {
                    e.stopPropagation();
                    li.classList.toggle('open');
                    toggle.textContent = li.classList.contains('open') ? '▼' : '▶';
                };

                const a = document.createElement('a');
                a.href = '#' + node.id;
                a.textContent = node.text;
                a.dataset.target = node.id;
                a.onclick = (e) => {
                    e.preventDefault();
                    document.getElementById(node.id).scrollIntoView({ behavior: 'smooth' });
                    this.highlightItem(node.id);
                };

                const header = document.createElement('div');
                header.className = 'toc-item-header';
                header.appendChild(toggle);
                header.appendChild(a);
                li.appendChild(header);

                const childUl = document.createElement('ul');
                childUl.className = 'toc-children';
                this.renderTree(node.children, childUl, defaultOpen);
                li.appendChild(childUl);
            } else {
                const a = document.createElement('a');
                a.href = '#' + node.id;
                a.textContent = node.text;
                a.dataset.target = node.id;
                a.onclick = (e) => {
                    e.preventDefault();
                    document.getElementById(node.id).scrollIntoView({ behavior: 'smooth' });
                    this.highlightItem(node.id);
                };
                li.appendChild(a);
            }

            container.appendChild(li);
        });
    },

    clear: function() {
        if (this.elements.tocNav) {
            this.elements.tocNav.innerHTML = '<p class="toc-empty">选择文章查看目录</p>';
        }
    },

    highlightItem: function(targetId) {
        const tocItems = document.querySelectorAll('.toc-item a');

        if (targetId) {
            tocItems.forEach(item => {
                if (item.dataset.target === targetId) {
                    item.classList.add('active');
                    this.expandParents(item);
                    // 确保可见
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    item.classList.remove('active');
                }
            });
            return;
        }
    },

    highlightOnScroll: function(contentElement) {
        const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const tocItems = document.querySelectorAll('.toc-item a');
        let currentHeading = null;

        headings.forEach(heading => {
            const rect = heading.getBoundingClientRect();
            // 适当放宽检测范围，确保首个标题也能被选中
            if (rect.top <= 150) {
                currentHeading = heading;
            }
        });

        if (currentHeading) {
            tocItems.forEach(item => {
                if (item.dataset.target === currentHeading.id) {
                    if (!item.classList.contains('active')) {
                        item.classList.add('active');
                        this.expandParents(item);
                        // 滚动时不需要 scrollIntoView，否则会和用户的滚动冲突
                    }
                } else {
                    item.classList.remove('active');
                }
            });
        }
    },

    // 展开指定元素的父级目录
    expandParents: function(element) {
        let parent = element.parentElement; // li
        while (parent) {
            if (parent.classList.contains('toc-children')) {
                parent.style.display = 'block';
                // 找到对应的 li.toc-folder 并设为 open
                const folderLi = parent.parentElement;
                if (folderLi && folderLi.classList.contains('toc-folder')) {
                    folderLi.classList.add('open');
                    const toggle = folderLi.querySelector('.toc-toggle-icon');
                    if (toggle) toggle.textContent = '▼';
                }
            }
            parent = parent.parentElement;
            if (!parent || parent.id === 'toc-nav') break;
        }
    }
};
