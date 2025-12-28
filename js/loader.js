/**
 * 数据加载模块
 * 处理文章列表和内容加载
 */
const Loader = {
    // 从本地posts.json加载
    loadFromLocal: function() {
        return fetch('posts.json')
            .then(response => {
                if (!response.ok) throw new Error('posts.json不存在，请运行 node build.js');
                return response.json();
            });
    },

    // 从GitHub API加载
    loadFromGitHub: function() {
        const { owner, repo, branch, postsPath } = BlogConfig.github;
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${postsPath}?ref=${branch}`;

        return this.fetchGitHubDirectory(apiUrl, '')
            .then(tree => {
                localStorage.setItem('postsTree', JSON.stringify(tree));
                localStorage.setItem('postsTreeTime', Date.now());
                return tree;
            })
            .catch(error => {
                const cached = localStorage.getItem('postsTree');
                if (cached) {
                    return JSON.parse(cached);
                }
                throw error;
            });
    },

    // 递归获取GitHub目录
    fetchGitHubDirectory: async function(url, basePath) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('GitHub API请求失败');

        const items = await response.json();
        const result = [];

        items.sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            return a.name.localeCompare(b.name, 'zh-CN');
        });

        for (const item of items) {
            if (item.type === 'dir') {
                const children = await this.fetchGitHubDirectory(item.url, item.path);
                if (children.length > 0) {
                    result.push({
                        type: 'folder',
                        name: item.name,
                        path: basePath ? `${basePath}/${item.name}` : item.name,
                        children: children
                    });
                }
            } else if (item.name.endsWith('.md')) {
                const relativePath = item.path.replace(/^posts\//, '');
                result.push({
                    type: 'file',
                    name: item.name,
                    title: item.name.replace(/\.md$/, ''),
                    path: relativePath,
                    fileType: 'markdown'
                });
            } else if (item.name.endsWith('.pdf')) {
                const relativePath = item.path.replace(/^posts\//, '');
                result.push({
                    type: 'file',
                    name: item.name,
                    title: item.name.replace(/\.pdf$/, ''),
                    path: relativePath,
                    fileType: 'pdf'
                });
            } else if (item.name.endsWith('.docx')) {
                const relativePath = item.path.replace(/^posts\//, '');
                result.push({
                    type: 'file',
                    name: item.name,
                    title: item.name.replace(/\.docx$/, ''),
                    path: relativePath,
                    fileType: 'word'
                });
            }
        }

        return result;
    },

    // 加载文章内容
    loadPost: function(filepath) {
        let url;

        if (BlogConfig.useGitHubAPI && BlogConfig.github.owner && BlogConfig.github.repo) {
            const { owner, repo, branch, postsPath } = BlogConfig.github;
            url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${postsPath}/${filepath}`;
        } else {
            // 确保路径处理健壮，防止重复拼接 posts/
            const cleanPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;
            url = cleanPath.startsWith('posts/') ? cleanPath : 'posts/' + cleanPath;
        }

        // 如果是PDF文件，直接返回URL
        if (filepath.endsWith('.pdf')) {
            return Promise.resolve({
                type: 'pdf',
                url: url
            });
        }

        // 如果是Word文件，同样返回URL
        if (filepath.endsWith('.docx')) {
            return Promise.resolve({
                type: 'word',
                url: url
            });
        }

        // Markdown文件，获取文本内容
        return fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('文章不存在');
                return response.text();
            })
            .then(content => ({
                type: 'markdown',
                content: content
            }));
    },

    // 加载文章树
    loadPostsTree: function() {
        if (BlogConfig.useGitHubAPI && BlogConfig.github.owner && BlogConfig.github.repo) {
            return this.loadFromGitHub();
        } else {
            return this.loadFromLocal();
        }
    }
};
