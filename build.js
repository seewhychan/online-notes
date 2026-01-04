/**
 * 构建脚本 - 扫描posts目录生成posts.json索引
 * 运行方式: node build.js
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = './posts';
const OUTPUT_FILE = './posts.json';

/**
 * 从文件名生成显示标题（去掉扩展名）
 */
function getDisplayName(filename) {
    return filename.replace(/\.(md|pdf|docx)$/, '');
}

/**
 * 获取文件类型
 */
function getFileType(filename) {
    if (filename.endsWith('.md')) return 'markdown';
    if (filename.endsWith('.pdf')) return 'pdf';
    if (filename.endsWith('.docx')) return 'word';
    return null;
}

/**
 * 递归扫描目录
 */
function scanDirectory(dir, basePath = '') {
    const items = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    // 排序：文件夹在前，文件在后，按名称排序
    entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name, 'zh-CN');
    });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
            // 文件夹
            const children = scanDirectory(fullPath, relativePath);
            if (children.length > 0) {
                items.push({
                    type: 'folder',
                    name: entry.name,
                    path: relativePath,
                    children: children
                });
            }
        } else {
            const fileType = getFileType(entry.name);
            if (fileType) {
                // Markdown或PDF文件
                items.push({
                    type: 'file',
                    name: entry.name,
                    title: getDisplayName(entry.name),
                    path: relativePath,
                    fileType: fileType
                });
            }
        }
    }

    return items;
}

// 执行构建
console.log('正在扫描 posts 目录...');
const tree = scanDirectory(POSTS_DIR);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tree, null, 2), 'utf-8');
console.log(`已生成 ${OUTPUT_FILE}`);
console.log(`共扫描到 ${countFiles(tree)} 个文件`);

function countFiles(items) {
    let count = 0;
    for (const item of items) {
        if (item.type === 'file') {
            count++;
        } else if (item.children) {
            count += countFiles(item.children);
        }
    }
    return count;
}
