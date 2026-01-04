/**
 * 主题管理模块
 */
const ThemeManager = {
    // 预设主题
    themes: {
        light: {
            name: '浅色',
            icon: '☀️',
            vars: {
                '--primary-color': '#2563eb',
                '--text-color': '#1e293b',
                '--text-secondary': '#64748b',
                '--bg-color': '#ffffff',
                '--sidebar-bg': '#f8fafc',
                '--border-color': '#e2e8f0',
                '--hover-bg': '#f1f5f9',
                '--code-bg': '#f1f5f9',
                '--link-color': '#2563eb'
            },
            hljsTheme: 'github'
        },
        dark: {
            name: '深色',
            icon: '🌙',
            vars: {
                '--primary-color': '#3b82f6',
                '--text-color': '#e5e7eb',
                '--text-secondary': '#9ca3af',
                '--bg-color': '#1f2937',
                '--sidebar-bg': '#111827',
                '--border-color': '#374151',
                '--hover-bg': '#374151',
                '--code-bg': '#374151',
                '--link-color': '#60a5fa'
            },
            hljsTheme: 'github-dark'
        },
        sepia: {
            name: '护眼',
            icon: '📜',
            vars: {
                '--primary-color': '#b45309',
                '--text-color': '#44403c',
                '--text-secondary': '#78716c',
                '--bg-color': '#fef3c7',
                '--sidebar-bg': '#fde68a',
                '--border-color': '#d6d3d1',
                '--hover-bg': '#fef9c3',
                '--code-bg': '#fef9c3',
                '--link-color': '#b45309'
            },
            hljsTheme: 'github'
        },
        nord: {
            name: 'Nord',
            icon: '❄️',
            vars: {
                '--primary-color': '#5e81ac',
                '--text-color': '#eceff4',
                '--text-secondary': '#d8dee9',
                '--bg-color': '#2e3440',
                '--sidebar-bg': '#3b4252',
                '--border-color': '#4c566a',
                '--hover-bg': '#434c5e',
                '--code-bg': '#3b4252',
                '--link-color': '#88c0d0'
            },
            hljsTheme: 'nord'
        },
        dracula: {
            name: 'Dracula',
            icon: '🧛',
            vars: {
                '--primary-color': '#bd93f9',
                '--text-color': '#f8f8f2',
                '--text-secondary': '#6272a4',
                '--bg-color': '#282a36',
                '--sidebar-bg': '#21222c',
                '--border-color': '#44475a',
                '--hover-bg': '#44475a',
                '--code-bg': '#44475a',
                '--link-color': '#8be9fd'
            },
            hljsTheme: 'dracula'
        },
        solarized: {
            name: 'Solarized',
            icon: '🌅',
            vars: {
                '--primary-color': '#268bd2',
                '--text-color': '#657b83',
                '--text-secondary': '#93a1a1',
                '--bg-color': '#fdf6e3',
                '--sidebar-bg': '#eee8d5',
                '--border-color': '#93a1a1',
                '--hover-bg': '#eee8d5',
                '--code-bg': '#eee8d5',
                '--link-color': '#268bd2'
            },
            hljsTheme: 'solarized-light'
        }
    },

    // 当前主题
    currentTheme: 'light',

    // 初始化
    init: function() {
        // 从localStorage读取保存的主题
        const saved = localStorage.getItem('theme');
        if (saved) {
            if (saved.startsWith('{')) {
                // 自定义主题
                try {
                    this.applyCustomTheme(JSON.parse(saved));
                } catch (e) {
                    this.applyTheme('light');
                }
            } else if (this.themes[saved]) {
                this.applyTheme(saved);
            }
        }

        this.renderThemeList();
        this.bindEvents();
        this.updateThemeIcon();
    },

    // 应用主题
    applyTheme: function(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;

        this.currentTheme = themeName;

        // 应用CSS变量
        const root = document.documentElement;
        // 设置 data-theme 属性，确保基于属性的选择器（如 [data-theme="dark"]）生效
        root.setAttribute('data-theme', themeName);

        for (const [key, value] of Object.entries(theme.vars)) {
            root.style.setProperty(key, value);
        }

        // 更新highlight.js主题
        const hljsLink = document.getElementById('hljs-theme');
        if (hljsLink) {
            hljsLink.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${theme.hljsTheme}.min.css`;
        }

        // 保存到localStorage
        localStorage.setItem('theme', themeName);

        // 更新主题列表选中状态
        this.updateThemeListSelection(themeName);
        this.updateThemeIcon();
    },

    // 应用自定义主题
    applyCustomTheme: function(customVars) {
        this.currentTheme = 'custom';

        const root = document.documentElement;
        root.setAttribute('data-theme', 'custom');

        for (const [key, value] of Object.entries(customVars)) {
            root.style.setProperty(key, value);
        }

        // 保存到localStorage
        localStorage.setItem('theme', JSON.stringify(customVars));

        // 清除主题列表选中状态
        this.updateThemeListSelection(null);
        this.updateThemeIcon();
    },

    // 更新主题图标
    updateThemeIcon: function() {
        const iconEl = document.getElementById('theme-icon');
        if (iconEl) {
            const theme = this.themes[this.currentTheme];
            iconEl.textContent = theme ? theme.icon : '🎨';
        }
    },

    // 渲染主题列表
    renderThemeList: function() {
        const container = document.getElementById('theme-list');
        if (!container) return;

        container.innerHTML = '';

        for (const [key, theme] of Object.entries(this.themes)) {
            const item = document.createElement('div');
            item.className = 'theme-item' + (key === this.currentTheme ? ' active' : '');
            item.dataset.theme = key;
            item.innerHTML = `
                <span class="theme-icon">${theme.icon}</span>
                <span class="theme-name">${theme.name}</span>
            `;
            item.onclick = () => this.applyTheme(key);
            container.appendChild(item);
        }
    },

    // 更新主题列表选中状态
    updateThemeListSelection: function(themeName) {
        const items = document.querySelectorAll('.theme-item');
        items.forEach(item => {
            if (item.dataset.theme === themeName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    // 绑定事件
    bindEvents: function() {
        // 主题按钮 - 使用正确的ID
        const themeBtn = document.getElementById('theme-toggle-btn');
        const themePanel = document.getElementById('theme-panel');
        const closeBtn = document.getElementById('theme-panel-close');

        if (themeBtn && themePanel) {
            themeBtn.onclick = (e) => {
                e.stopPropagation();
                themePanel.classList.toggle('show');
            };
        }

        if (closeBtn && themePanel) {
            closeBtn.onclick = () => {
                themePanel.classList.remove('show');
            };
        }

        // 点击面板外部关闭
        document.addEventListener('click', (e) => {
            if (themePanel && !themePanel.contains(e.target) && e.target !== themeBtn && !themeBtn.contains(e.target)) {
                themePanel.classList.remove('show');
            }
        });

        // 自定义主题 - 使用正确的ID
        const applyBtn = document.getElementById('apply-custom');
        if (applyBtn) {
            applyBtn.onclick = () => {
                const customVars = {
                    '--primary-color': document.getElementById('custom-primary').value,
                    '--bg-color': document.getElementById('custom-bg').value,
                    '--text-color': document.getElementById('custom-text').value,
                    '--sidebar-bg': document.getElementById('custom-sidebar').value,
                    '--text-secondary': this.lightenColor(document.getElementById('custom-text').value, 30),
                    '--border-color': this.lightenColor(document.getElementById('custom-sidebar').value, -10),
                    '--hover-bg': this.lightenColor(document.getElementById('custom-bg').value, -5),
                    '--code-bg': this.lightenColor(document.getElementById('custom-bg').value, -5),
                    '--link-color': document.getElementById('custom-primary').value
                };
                this.applyCustomTheme(customVars);
                themePanel.classList.remove('show');
            };
        }
    },

    // 颜色变亮/变暗
    lightenColor: function(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
};

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
