(() => {
    "use strict";

    const API = "/__dev/api";
    const MAX_HIGHLIGHT_SIZE = 300000;
    const MAX_RESTORED_TABS = 10;
    const state = {
        activePath: "",
        selectedPath: "",
        previewPath: "",
        previewUrl: "",
        tabs: new Map(),
        treeCache: new Map(),
        expanded: new Set(),
        searchTimer: null,
        searchToken: 0,
        paletteTimer: null,
        paletteToken: 0,
        paletteItems: [],
        paletteIndex: 0,
        paletteMode: "files",
        renderFrame: null,
        modalResolver: null,
        contextPath: "",
        contextType: "",
        outputClass: "output-muted"
    };

    const elements = {
        appShell: document.getElementById("appShell"),
        workspaceName: document.getElementById("workspaceName"),
        fileTree: document.getElementById("fileTree"),
        searchInput: document.getElementById("searchInput"),
        searchScope: document.getElementById("searchScope"),
        searchSummary: document.getElementById("searchSummary"),
        searchResults: document.getElementById("searchResults"),
        tabStrip: document.getElementById("tabStrip"),
        activeFileTitle: document.getElementById("activeFileTitle"),
        breadcrumbs: document.getElementById("breadcrumbs"),
        saveState: document.getElementById("saveState"),
        copyPathButton: document.getElementById("copyPathButton"),
        welcomePane: document.getElementById("welcomePane"),
        codeEditor: document.getElementById("codeEditor"),
        codeInput: document.getElementById("codeInput"),
        lineNumbers: document.getElementById("lineNumbers"),
        highlightLayer: document.querySelector(".highlight-layer"),
        highlightCode: document.getElementById("highlightCode"),
        editorRegion: document.getElementById("editorRegion"),
        previewPane: document.getElementById("previewPane"),
        previewResizer: document.getElementById("previewResizer"),
        previewFrame: document.getElementById("previewFrame"),
        previewFrameWrap: document.getElementById("previewFrameWrap"),
        previewEmpty: document.getElementById("previewEmpty"),
        previewFileName: document.getElementById("previewFileName"),
        outputPanel: document.getElementById("outputPanel"),
        outputContent: document.getElementById("outputContent"),
        outputStatus: document.getElementById("outputStatus"),
        statusLanguage: document.getElementById("statusLanguage"),
        statusPosition: document.getElementById("statusPosition"),
        statusFileSize: document.getElementById("statusFileSize"),
        statusSave: document.getElementById("statusSave"),
        paletteBackdrop: document.getElementById("paletteBackdrop"),
        paletteInput: document.getElementById("paletteInput"),
        paletteResults: document.getElementById("paletteResults"),
        modalBackdrop: document.getElementById("modalBackdrop"),
        modalTitle: document.getElementById("modalTitle"),
        modalBody: document.getElementById("modalBody"),
        modalActions: document.getElementById("modalActions"),
        modalCloseButton: document.getElementById("modalCloseButton"),
        contextMenu: document.getElementById("contextMenu"),
        toastRegion: document.getElementById("toastRegion")
    };

    const commands = [
        { title: "File: Save", detail: "⌘ S", icon: "S", action: () => saveActiveTab() },
        { title: "File: Save All", detail: "⇧⌘ S", icon: "S", action: () => saveAllTabs() },
        { title: "File: New File", detail: "", icon: "+", action: () => createEntry("file") },
        { title: "File: New Folder", detail: "", icon: "+", action: () => createEntry("folder") },
        { title: "Edit: Rename Current File", detail: "", icon: "R", action: () => renameEntry(state.activePath) },
        { title: "Run: Preview Current File", detail: "⌘ ↵", icon: "▶", action: () => runCurrentPreview() },
        { title: "Run: Current Process", detail: "", icon: "▶", action: () => runCurrentProcess() },
        { title: "Run: Open in Safari", detail: "", icon: "↗", action: () => openCurrentInSafari() },
        { title: "View: Toggle Live Preview", detail: "", icon: "▣", action: () => setPreviewOpen(!elements.editorRegion.classList.contains("preview-open")) },
        { title: "View: Toggle Output", detail: "", icon: "›_", action: () => toggleOutput() },
        { title: "View: Toggle Sidebar", detail: "", icon: "☰", action: () => elements.appShell.classList.toggle("sidebar-hidden") },
        { title: "Workspace: Refresh Explorer", detail: "", icon: "↻", action: () => refreshTree() },
        { title: "Workspace: Clear Output", detail: "", icon: "×", action: () => clearOutput() }
    ];

    class ApiFailure extends Error {
        constructor(message, status, payload) {
            super(message);
            this.name = "ApiFailure";
            this.status = status;
            this.payload = payload;
        }
    }

    function apiUrl(path, params = {}) {
        const url = new URL(`${API}${path}`, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, value);
            }
        });
        return `${url.pathname}${url.search}`;
    }

    async function api(path, options = {}) {
        const query = {};
        ["path", "query"].forEach((name) => {
            if (options[name] !== undefined) query[name] = options[name];
        });
        const request = { cache: "no-store", ...options };
        delete request.path;
        delete request.query;
        request.headers = { ...(options.headers || {}) };
        if (options.body && typeof options.body !== "string") {
            request.headers["Content-Type"] = "application/json";
            request.body = JSON.stringify(options.body);
        }
        const response = await fetch(apiUrl(path, query), request);
        const text = await response.text();
        let payload = null;
        if (text) {
            try {
                payload = JSON.parse(text);
            } catch {
                payload = { error: text };
            }
        }
        if (!response.ok) {
            throw new ApiFailure(payload?.error || `Request failed (${response.status})`, response.status, payload);
        }
        return payload;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function basename(path) {
        if (!path) return "Workspace";
        return path.split("/").filter(Boolean).pop() || path;
    }

    function dirname(path) {
        if (!path) return "";
        const index = path.lastIndexOf("/");
        return index < 0 ? "" : path.slice(0, index);
    }

    function joinPath(directory, name) {
        return directory ? `${directory}/${name}` : name;
    }

    function extensionOf(path) {
        const name = basename(path).toLowerCase();
        const index = name.lastIndexOf(".");
        return index > 0 ? name.slice(index) : "";
    }

    function languageForPath(path) {
        const extension = extensionOf(path);
        const names = {
            ".js": "JavaScript",
            ".mjs": "JavaScript",
            ".cjs": "JavaScript",
            ".jsx": "JavaScript JSX",
            ".ts": "TypeScript",
            ".json": "JSON",
            ".html": "HTML",
            ".htm": "HTML",
            ".css": "CSS",
            ".py": "Python",
            ".sh": "Shell",
            ".bash": "Shell",
            ".command": "Shell",
            ".md": "Markdown",
            ".txt": "Plain Text",
            ".yml": "YAML",
            ".yaml": "YAML",
            ".sql": "SQL",
            ".xml": "XML"
        };
        if (extension === ".gitignore" || basename(path) === ".gitignore") return "Ignore";
        return names[extension] || (extension ? extension.slice(1).toUpperCase() : "Plain Text");
    }

    function languageKey(path) {
        const extension = extensionOf(path);
        if ([".js", ".mjs", ".cjs", ".jsx", ".ts"].includes(extension)) return "javascript";
        if ([".html", ".htm", ".xml", ".svg"].includes(extension)) return "html";
        if (extension === ".css") return "css";
        if ([".py", ".command"].includes(extension)) return "python";
        if ([".sh", ".bash"].includes(extension)) return "shell";
        if (extension === ".json") return "json";
        if ([".md", ".txt"].includes(extension)) return "markdown";
        if ([".yml", ".yaml"].includes(extension)) return "yaml";
        return "plain";
    }

    function iconInfo(path, type) {
        if (type === "directory") {
            return { label: "DIR", className: "folder" };
        }
        const extension = extensionOf(path);
        const info = {
            ".html": ["<>", "html"],
            ".htm": ["<>", "html"],
            ".js": ["JS", "javascript"],
            ".mjs": ["JS", "javascript"],
            ".cjs": ["JS", "javascript"],
            ".jsx": ["JS", "javascript"],
            ".ts": ["TS", "javascript"],
            ".json": ["{}", "json"],
            ".css": ["#", "css"],
            ".py": ["PY", "python"],
            ".md": ["M", "markdown"],
            ".txt": ["T", "markdown"],
            ".sh": ["$_", "shell"],
            ".bash": ["$_", "shell"]
        }[extension];
        if (info) return { label: info[0], className: info[1] };
        return { label: extension ? extension.slice(1, 2).toUpperCase() : "F", className: "plain" };
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    function readPreferences() {
        try {
            const value = JSON.parse(localStorage.getItem("workspace-editor-state-v1") || "{}");
            return value && typeof value === "object" ? value : {};
        } catch {
            return {};
        }
    }

    function savePreferences() {
        try {
            localStorage.setItem("workspace-editor-state-v1", JSON.stringify({
                activePath: state.activePath,
                tabs: Array.from(state.tabs.keys()).slice(0, MAX_RESTORED_TABS),
                expanded: Array.from(state.expanded).slice(0, 300),
                previewOpen: elements.editorRegion.classList.contains("preview-open")
            }));
        } catch {
            return;
        }
    }

    function setView(view) {
        document.querySelectorAll(".activity-button[data-view]").forEach((button) => {
            button.classList.toggle("active", button.dataset.view === view);
        });
        document.querySelectorAll(".sidebar-view").forEach((panel) => {
            panel.classList.toggle("active", panel.dataset.panel === view);
        });
    }

    async function loadDirectory(path, force = false) {
        if (!force && state.treeCache.has(path)) return state.treeCache.get(path);
        const data = await api("/tree", { path });
        state.treeCache.set(path || "", data);
        return data;
    }

    async function refreshTree() {
        const paths = ["", ...Array.from(state.expanded).filter(Boolean)];
        state.treeCache.clear();
        for (const path of paths) {
            try {
                await loadDirectory(path, true);
            } catch (error) {
                if (path) state.expanded.delete(path);
            }
        }
        renderTree();
        showToast("Explorer refreshed", "The workspace file list is up to date.");
    }

    function treeChildren(path) {
        return state.treeCache.get(path || "")?.entries || [];
    }

    function createTreeRow(entry, depth) {
        const row = document.createElement("button");
        const icon = iconInfo(entry.path, entry.type);
        row.type = "button";
        row.className = "tree-row";
        row.dataset.path = entry.path;
        row.dataset.type = entry.type;
        row.dataset.name = entry.name;
        row.style.paddingLeft = `${5 + depth * 13}px`;
        row.title = entry.path || "Workspace";
        if (entry.path === state.selectedPath || entry.path === state.activePath) row.classList.add("selected");
        const chevron = document.createElement("span");
        chevron.className = `tree-chevron${state.expanded.has(entry.path) ? " expanded" : ""}`;
        chevron.textContent = entry.type === "directory" ? "›" : "";
        const fileIcon = document.createElement("span");
        fileIcon.className = `tree-icon ${icon.className}`;
        fileIcon.textContent = icon.label;
        const name = document.createElement("span");
        name.className = "tree-name";
        name.textContent = entry.name;
        row.append(chevron, fileIcon, name);
        return row;
    }

    function renderTree() {
        const fragment = document.createDocumentFragment();
        const root = state.treeCache.get("");
        if (!root || root.entries.length === 0) {
            const empty = document.createElement("div");
            empty.className = "tree-empty";
            empty.textContent = state.treeCache.has("") ? "This folder is empty." : "Loading workspace…";
            fragment.append(empty);
        } else {
            const renderEntries = (entries, depth) => {
                entries.forEach((entry) => {
                    fragment.append(createTreeRow(entry, depth));
                    if (entry.type === "directory" && state.expanded.has(entry.path)) {
                        const children = treeChildren(entry.path);
                        if (children.length) renderEntries(children, depth + 1);
                    }
                });
            };
            renderEntries(root.entries, 0);
        }
        elements.fileTree.replaceChildren(fragment);
    }

    async function toggleDirectory(path) {
        state.selectedPath = path;
        if (state.expanded.has(path)) {
            state.expanded.delete(path);
            renderTree();
            return;
        }
        state.expanded.add(path);
        renderTree();
        if (!state.treeCache.has(path)) {
            try {
                await loadDirectory(path);
                renderTree();
            } catch (error) {
                state.expanded.delete(path);
                renderTree();
                showToast("Folder unavailable", error.message, "error");
            }
        }
        savePreferences();
    }

    async function openFile(path, options = {}) {
        const quiet = Boolean(options.quiet);
        if (state.tabs.has(path) && !options.force) {
            state.selectedPath = path;
            if (options.activate !== false) activateTab(path, options.line || 0);
            renderTree();
            return true;
        }
        try {
            const data = await api("/file", { path });
            const existing = state.tabs.get(path);
            const tab = {
                path,
                content: data.content,
                savedContent: existing?.savedContent ?? data.content,
                etag: data.etag,
                cursor: existing?.cursor || 0,
                selectionEnd: existing?.selectionEnd || existing?.cursor || 0,
                scrollTop: existing?.scrollTop || 0,
                scrollLeft: existing?.scrollLeft || 0
            };
            if (options.force) tab.savedContent = data.content;
            state.tabs.set(path, tab);
            state.selectedPath = path;
            if (options.activate !== false) activateTab(path, options.line || 0);
            renderTree();
            savePreferences();
            return true;
        } catch (error) {
            if (!quiet) showToast("Could not open file", error.message, "error");
            return false;
        }
    }

    function captureEditorState() {
        const tab = state.tabs.get(state.activePath);
        if (!tab) return;
        tab.content = elements.codeInput.value;
        tab.cursor = elements.codeInput.selectionStart;
        tab.selectionEnd = elements.codeInput.selectionEnd;
        tab.scrollTop = elements.codeInput.scrollTop;
        tab.scrollLeft = elements.codeInput.scrollLeft;
    }

    function activateTab(path, line = 0) {
        const tab = state.tabs.get(path);
        if (!tab) return;
        if (state.activePath && state.activePath !== path) captureEditorState();
        state.activePath = path;
        state.selectedPath = path;
        elements.welcomePane.hidden = true;
        elements.codeEditor.hidden = false;
        elements.codeInput.value = tab.content;
        renderCode();
        const offset = line > 0 ? offsetForLine(tab.content, line) : tab.cursor;
        requestAnimationFrame(() => {
            elements.codeInput.focus({ preventScroll: true });
            elements.codeInput.setSelectionRange(offset, offset);
            elements.codeInput.scrollTop = tab.scrollTop;
            elements.codeInput.scrollLeft = tab.scrollLeft;
            syncEditorScroll();
            updateCursorStatus();
        });
        renderTabs();
        renderBreadcrumbs();
        renderTree();
        updateSaveState();
        savePreferences();
    }

    function closeActiveView() {
        captureEditorState();
        state.activePath = "";
        elements.welcomePane.hidden = false;
        elements.codeEditor.hidden = true;
        elements.activeFileTitle.textContent = "No file open";
        elements.breadcrumbs.replaceChildren();
        elements.statusSave.classList.remove("dirty");
        elements.statusSave.textContent = "Saved";
        elements.saveState.classList.remove("dirty");
        elements.saveState.textContent = "Ready";
        renderTabs();
        renderTree();
        savePreferences();
    }

    function renderTabs() {
        const fragment = document.createDocumentFragment();
        state.tabs.forEach((tab, path) => {
            const item = document.createElement("div");
            item.className = `editor-tab${path === state.activePath ? " active" : ""}`;
            item.dataset.path = path;
            item.setAttribute("role", "tab");
            item.setAttribute("aria-selected", String(path === state.activePath));
            const icon = iconInfo(path, "file");
            const type = document.createElement("span");
            type.className = "tab-type-icon";
            type.textContent = icon.label;
            const name = document.createElement("span");
            name.className = "tab-name";
            name.textContent = basename(path);
            name.title = path;
            item.append(type, name);
            if (tab.content !== tab.savedContent) {
                const dirty = document.createElement("span");
                dirty.className = "tab-dirty";
                dirty.title = "Unsaved changes";
                item.append(dirty);
            }
            const close = document.createElement("button");
            close.type = "button";
            close.className = "tab-close";
            close.dataset.closePath = path;
            close.setAttribute("aria-label", `Close ${basename(path)}`);
            close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
            item.append(close);
            fragment.append(item);
        });
        elements.tabStrip.replaceChildren(fragment);
        const active = elements.tabStrip.querySelector(".editor-tab.active");
        active?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    function renderBreadcrumbs() {
        const path = state.activePath;
        if (!path) {
            elements.breadcrumbs.replaceChildren();
            return;
        }
        const fragment = document.createDocumentFragment();
        const root = document.createElement("button");
        root.type = "button";
        root.className = "breadcrumb";
        root.textContent = elements.workspaceName.textContent || "Workspace";
        root.addEventListener("click", () => {
            state.expanded.add("");
            renderTree();
        });
        fragment.append(root);
        const parts = path.split("/");
        let current = "";
        parts.forEach((part, index) => {
            const separator = document.createElement("span");
            separator.className = "breadcrumb-separator";
            separator.textContent = "›";
            const crumb = document.createElement("button");
            crumb.type = "button";
            crumb.className = "breadcrumb";
            current = current ? `${current}/${part}` : part;
            crumb.textContent = part;
            const target = index === parts.length - 1 ? current : current;
            crumb.addEventListener("click", async () => {
                state.expanded.add(target);
                try {
                    await loadDirectory(target);
                } catch {
                    state.selectedPath = target;
                }
                renderTree();
            });
            fragment.append(separator, crumb);
        });
        elements.breadcrumbs.replaceChildren(fragment);
    }

    function lineCount(content) {
        let count = 1;
        for (let index = 0; index < content.length; index += 1) {
            if (content.charCodeAt(index) === 10) count += 1;
        }
        return count;
    }

    function renderCode() {
        const tab = state.tabs.get(state.activePath);
        if (!tab) return;
        const content = tab.content;
        const count = lineCount(content);
        const visibleCount = Math.min(count, 30000);
        const numbers = new Array(visibleCount);
        for (let index = 0; index < visibleCount; index += 1) numbers[index] = String(index + 1);
        if (count > visibleCount) numbers.push("…");
        elements.lineNumbers.textContent = numbers.join("\n");
        elements.highlightCode.innerHTML = highlightCode(content, languageKey(tab.path));
        elements.activeFileTitle.textContent = tab.path;
        elements.statusLanguage.textContent = languageForPath(tab.path);
        elements.statusFileSize.textContent = formatBytes(new Blob([content]).size);
        syncEditorScroll();
        updateCursorStatus();
        updateSaveState();
        renderTabs();
        renderBreadcrumbs();
    }

    function updateSaveState() {
        const tab = state.tabs.get(state.activePath);
        const dirty = Boolean(tab && tab.content !== tab.savedContent);
        elements.saveState.textContent = tab ? (dirty ? "Unsaved" : "Saved") : "Ready";
        elements.saveState.classList.toggle("dirty", dirty);
        elements.statusSave.textContent = dirty ? "Unsaved" : "Saved";
        elements.statusSave.classList.toggle("dirty", dirty);
    }

    function updateEditorContent() {
        const tab = state.tabs.get(state.activePath);
        if (!tab) return;
        tab.content = elements.codeInput.value;
        if (state.renderFrame) cancelAnimationFrame(state.renderFrame);
        state.renderFrame = requestAnimationFrame(renderCode);
    }

    function updateCursorStatus() {
        const value = elements.codeInput.value;
        const cursor = elements.codeInput.selectionStart;
        const before = value.slice(0, cursor);
        const line = before.split("\n").length;
        const lastBreak = before.lastIndexOf("\n");
        const column = cursor - lastBreak;
        let status = `Ln ${line}, Col ${column}`;
        if (elements.codeInput.selectionStart !== elements.codeInput.selectionEnd) {
            status += ` (${elements.codeInput.selectionEnd - elements.codeInput.selectionStart} selected)`;
        }
        elements.statusPosition.textContent = status;
    }

    function syncEditorScroll() {
        elements.highlightLayer.scrollTop = elements.codeInput.scrollTop;
        elements.highlightLayer.scrollLeft = elements.codeInput.scrollLeft;
        elements.lineNumbers.scrollTop = elements.codeInput.scrollTop;
    }

    function offsetForLine(content, line) {
        if (line <= 1) return 0;
        let currentLine = 1;
        for (let index = 0; index < content.length; index += 1) {
            if (content.charCodeAt(index) === 10) {
                currentLine += 1;
                if (currentLine === line) return index + 1;
            }
        }
        return content.length;
    }

    function tokenRules(language) {
        const stringRule = { className: "string", pattern: /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g };
        const numberRule = { className: "number", pattern: /\b(?:0x[\da-f]+|0b[01]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/gi };
        const functionRule = { className: "function", pattern: /\b[A-Za-z_$][\w$]*(?=\s*\()/g };
        const rules = {
            javascript: [
                { className: "comment", pattern: /\/\*[\s\S]*?\*\/|\/\/.*/g },
                { ...stringRule, pattern: /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g },
                numberRule,
                { className: "keyword", pattern: /\b(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|get|if|import|in|instanceof|let|new|of|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield|true|false|null|undefined)\b/g },
                functionRule
            ],
            python: [
                { className: "string", pattern: /[rbfu]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/gi },
                { className: "comment", pattern: /#.*/g },
                numberRule,
                { className: "keyword", pattern: /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|True|False|None|self)\b/g },
                functionRule
            ],
            html: [
                { className: "comment", pattern: /<!--[\s\S]*?-->/g },
                { className: "tag", pattern: /<\/?[A-Za-z][^>]*>/g }
            ],
            css: [
                { className: "comment", pattern: /\/\*[\s\S]*?\*\//g },
                stringRule,
                numberRule,
                { className: "property", pattern: /(?:^|[;{]\s*)[-A-Za-z_][\w-]*(?=\s*:)/gm },
                { className: "keyword", pattern: /@[A-Za-z-]+|::?[A-Za-z-]+|\b(?:important|inherit|initial|unset|auto|none)\b/g },
                functionRule
            ],
            shell: [
                { className: "comment", pattern: /#.*/g },
                stringRule,
                numberRule,
                { className: "keyword", pattern: /\b(?:case|do|done|elif|else|esac|fi|for|function|if|in|select|then|until|while|time|coproc|return|export|local|readonly|declare|source)\b/g },
                functionRule
            ],
            json: [
                { className: "property", pattern: /"(?:\\.|[^"\\])*"(?=\s*:)/g },
                { className: "string", pattern: /"(?:\\.|[^"\\])*"/g },
                numberRule,
                { className: "keyword", pattern: /\b(?:true|false|null)\b/g }
            ],
            markdown: [
                { className: "keyword", pattern: /^#{1,6}\s.*$/gm },
                { className: "string", pattern: /```[\s\S]*?```|`[^`\n]+`/g },
                { className: "function", pattern: /\[[^\]\n]+\]\([^)\n]+\)/g },
                { className: "keyword", pattern: /^\s*(?:[-*+] |\d+\. |> )/gm }
            ],
            yaml: [
                { className: "comment", pattern: /#.*/g },
                { className: "string", pattern: /"(?:\\.|[^"\\])*"|'(?:''|[^'\n])*'/g },
                { className: "property", pattern: /^\s*[A-Za-z_][\w.-]*(?=\s*:)/gm },
                { className: "boolean", pattern: /\b(?:true|false|null|yes|no|on|off)\b/gi }
            ]
        };
        return rules[language] || [];
    }

    function highlightCode(code, language) {
        if (code.length > MAX_HIGHLIGHT_SIZE) return escapeHtml(code);
        const rules = tokenRules(language);
        if (!rules.length) return escapeHtml(code);
        let cursor = 0;
        let output = "";
        while (cursor < code.length) {
            let bestMatch = null;
            let bestRule = null;
            rules.forEach((rule) => {
                rule.pattern.lastIndex = cursor;
                const match = rule.pattern.exec(code);
                if (match && match.index >= cursor && (!bestMatch || match.index < bestMatch.index)) {
                    bestMatch = match;
                    bestRule = rule;
                }
            });
            if (!bestMatch) {
                output += escapeHtml(code[cursor]);
                cursor += 1;
                continue;
            }
            output += escapeHtml(code.slice(cursor, bestMatch.index));
            output += `<span class="tok-${bestRule.className}">${escapeHtml(bestMatch[0])}</span>`;
            cursor = bestMatch.index + bestMatch[0].length;
        }
        return output;
    }

    async function writeTab(tab, expectedEtag) {
        const payload = { path: tab.path, content: tab.content };
        if (expectedEtag) payload.expectedEtag = expectedEtag;
        return api("/file", { method: "PUT", body: payload });
    }

    async function saveTab(tab) {
        if (!tab || tab.content === tab.savedContent) return true;
        try {
            const result = await writeTab(tab, tab.etag);
            tab.etag = result.etag;
            tab.savedContent = tab.content;
            if (state.activePath === tab.path) updateSaveState();
            renderTabs();
            return true;
        } catch (error) {
            if (error instanceof ApiFailure && error.status === 409) {
                const choice = await showConflictModal(tab.path);
                if (choice === "reload") {
                    const data = await api("/file", { path: tab.path });
                    tab.content = data.content;
                    tab.savedContent = data.content;
                    tab.etag = data.etag;
                    if (state.activePath === tab.path) {
                        elements.codeInput.value = tab.content;
                        renderCode();
                    }
                    showToast("File reloaded", "The newer version on disk replaced the editor buffer.");
                    return true;
                }
                if (choice === "overwrite") {
                    const result = await writeTab(tab, null);
                    tab.etag = result.etag;
                    tab.savedContent = tab.content;
                    if (state.activePath === tab.path) updateSaveState();
                    renderTabs();
                    showToast("File overwritten", "Your editor version replaced the newer disk version.");
                    return true;
                }
                return false;
            }
            throw error;
        }
    }

    async function saveActiveTab() {
        const tab = state.tabs.get(state.activePath);
        if (!tab) return false;
        captureEditorState();
        if (tab.content === tab.savedContent) return true;
        try {
            const saved = await saveTab(tab);
            if (saved) showToast("Saved", tab.path);
            return saved;
        } catch (error) {
            showToast("Save failed", error.message, "error");
            return false;
        }
    }

    async function saveAllTabs() {
        captureEditorState();
        const dirtyTabs = Array.from(state.tabs.values()).filter((tab) => tab.content !== tab.savedContent);
        let saved = 0;
        for (const tab of dirtyTabs) {
            try {
                if (await saveTab(tab)) saved += 1;
            } catch (error) {
                showToast("Save failed", `${tab.path}: ${error.message}`, "error");
                break;
            }
        }
        if (saved) showToast("Files saved", `${saved} file${saved === 1 ? "" : "s"} written to disk.`);
        return saved === dirtyTabs.length;
    }

    async function requestCloseTab(path) {
        const tab = state.tabs.get(path);
        if (!tab) return true;
        if (path === state.activePath) captureEditorState();
        if (tab.content !== tab.savedContent) {
            const choice = await showUnsavedModal(path);
            if (choice === "save") {
                try {
                    if (!await saveTab(tab)) return false;
                } catch (error) {
                    showToast("Save failed", error.message, "error");
                    return false;
                }
            } else if (choice !== "discard") {
                return false;
            }
        }
        const order = Array.from(state.tabs.keys());
        const index = order.indexOf(path);
        state.tabs.delete(path);
        if (path === state.activePath) {
            const next = order[index + 1] || order[index - 1] || "";
            if (next && state.tabs.has(next)) activateTab(next);
            else closeActiveView();
        }
        renderTabs();
        renderTree();
        savePreferences();
        return true;
    }

    function creationDirectory() {
        const selected = state.selectedPath;
        if (selected) {
            const selectedEntry = findTreeEntry(selected);
            if (selectedEntry?.type === "directory") return selected;
            return dirname(selected);
        }
        if (state.activePath) return dirname(state.activePath);
        return "";
    }

    function findTreeEntry(path) {
        const parent = dirname(path);
        return treeChildren(parent).find((entry) => entry.path === path) || null;
    }

    async function createEntry(type, directory = creationDirectory()) {
        const label = type === "file" ? "New file" : "New folder";
        const placeholder = type === "file" ? "example.html" : "new-folder";
        const name = await showPromptModal(label, directory ? `Create in ${directory}` : "Create in workspace", placeholder);
        if (!name) return;
        if (name.includes("/") || name === "." || name === "..") {
            showToast("Invalid name", "Enter one file or folder name without a slash.", "error");
            return;
        }
        const path = joinPath(directory, name);
        try {
            await api("/operation", {
                method: "POST",
                body: { action: type === "file" ? "create-file" : "create-folder", path }
            });
            state.selectedPath = path;
            state.expanded.add(directory);
            state.treeCache.delete(directory);
            await loadDirectory(directory, true);
            renderTree();
            if (type === "file") await openFile(path);
            showToast(type === "file" ? "File created" : "Folder created", path);
        } catch (error) {
            showToast("Could not create item", error.message, "error");
        }
    }

    async function renameEntry(path) {
        if (!path) {
            showToast("Nothing selected", "Choose a file or folder first.", "warning");
            return;
        }
        const oldName = basename(path);
        const name = await showPromptModal("Rename", dirname(path) || "Workspace", oldName);
        if (!name || name === oldName) return;
        if (name.includes("/") || name === "." || name === "..") {
            showToast("Invalid name", "Enter one file or folder name without a slash.", "error");
            return;
        }
        const destination = joinPath(dirname(path), name);
        try {
            await api("/operation", {
                method: "POST",
                body: { action: "rename", path, destination }
            });
            renameOpenPaths(path, destination);
            invalidateTree(path);
            invalidateTree(destination);
            const oldParent = dirname(path);
            const newParent = dirname(destination);
            if (oldParent !== newParent) state.treeCache.delete(newParent);
            await Promise.all([
                loadDirectory(oldParent, true).catch(() => null),
                loadDirectory(newParent, true).catch(() => null)
            ]);
            state.selectedPath = destination;
            renderTree();
            if (state.tabs.has(destination) && state.activePath === destination) {
                elements.activeFileTitle.textContent = destination;
                renderTabs();
                renderBreadcrumbs();
                updateSaveState();
            }
            showToast("Renamed", destination);
        } catch (error) {
            showToast("Rename failed", error.message, "error");
        }
    }

    function renameOpenPaths(oldPath, newPath) {
        const updates = [];
        state.tabs.forEach((tab, path) => {
            if (path === oldPath || path.startsWith(`${oldPath}/`)) {
                updates.push([path, `${newPath}${path.slice(oldPath.length)}`]);
            }
        });
        updates.forEach(([path, updated]) => {
            const tab = state.tabs.get(path);
            state.tabs.delete(path);
            tab.path = updated;
            state.tabs.set(updated, tab);
        });
        const expandedUpdates = [];
        state.expanded.forEach((path) => {
            if (path === oldPath || path.startsWith(`${oldPath}/`)) {
                expandedUpdates.push([path, `${newPath}${path.slice(oldPath.length)}`]);
            }
        });
        expandedUpdates.forEach(([path, updated]) => {
            state.expanded.delete(path);
            state.expanded.add(updated);
        });
        if (state.activePath === oldPath || state.activePath.startsWith(`${oldPath}/`)) {
            state.activePath = `${newPath}${state.activePath.slice(oldPath.length)}`;
        }
        if (state.selectedPath === oldPath || state.selectedPath.startsWith(`${oldPath}/`)) {
            state.selectedPath = `${newPath}${state.selectedPath.slice(oldPath.length)}`;
        }
    }

    function invalidateTree(path) {
        Array.from(state.treeCache.keys()).forEach((key) => {
            if (key === path || key.startsWith(`${path}/`)) state.treeCache.delete(key);
        });
    }

    async function deleteEntry(path) {
        if (!path) {
            showToast("Workspace protected", "The workspace root cannot be deleted.", "warning");
            return;
        }
        const entry = findTreeEntry(path);
        const recursive = entry?.type === "directory";
        const label = recursive ? "folder and everything inside it" : "file";
        const choice = await showConfirmModal(
            "Delete item",
            `Delete ${label} “${basename(path)}”? This cannot be undone.`,
            "Delete",
            "Cancel",
            true
        );
        if (choice !== "confirm") return;
        try {
            await api("/operation", {
                method: "POST",
                body: { action: "delete", path, recursive }
            });
            removeOpenPaths(path);
            invalidateTree(path);
            const parent = dirname(path);
            await loadDirectory(parent, true);
            state.selectedPath = parent;
            renderTree();
            showToast("Deleted", path);
        } catch (error) {
            showToast("Delete failed", error.message, "error");
        }
    }

    function removeOpenPaths(path) {
        const remove = Array.from(state.tabs.keys()).filter((tabPath) => tabPath === path || tabPath.startsWith(`${path}/`));
        const hadActive = remove.includes(state.activePath);
        remove.forEach((tabPath) => state.tabs.delete(tabPath));
        remove.filter((tabPath) => state.expanded.has(tabPath)).forEach((tabPath) => state.expanded.delete(tabPath));
        if (hadActive) closeActiveView();
        if (state.previewPath === path || state.previewPath.startsWith(`${path}/`)) clearPreview();
    }

    function showContextMenu(event, path, type) {
        event.preventDefault();
        state.contextPath = path;
        state.contextType = type;
        const items = [];
        if (type === "file") {
            items.push({ label: "Open", action: () => openFile(path) });
        }
        items.push(
            { label: "New File Inside", hint: "", action: () => createEntry("file", path) },
            { label: "New Folder Inside", hint: "", action: () => createEntry("folder", path) }
        );
        if (path) {
            items.push(
                { separator: true },
                { label: "Rename", hint: "", action: () => renameEntry(path) },
                { label: "Delete", hint: "", danger: true, action: () => deleteEntry(path) }
            );
            if (type === "file") {
                items.push(
                    { separator: true },
                    { label: "Open in Safari", hint: "", action: () => openPathInSafari(path) }
                );
            }
        }
        const fragment = document.createDocumentFragment();
        items.forEach((item) => {
            if (item.separator) {
                const separator = document.createElement("div");
                separator.className = "context-separator";
                fragment.append(separator);
                return;
            }
            const button = document.createElement("button");
            button.type = "button";
            button.className = `context-item${item.danger ? " danger" : ""}`;
            const label = document.createElement("span");
            label.textContent = item.label;
            button.append(label);
            if (item.hint) {
                const hint = document.createElement("small");
                hint.textContent = item.hint;
                button.append(hint);
            }
            button.addEventListener("click", () => {
                closeContextMenu();
                item.action();
            });
            fragment.append(button);
        });
        elements.contextMenu.replaceChildren(fragment);
        elements.contextMenu.hidden = false;
        const width = 205;
        const height = Math.min(300, elements.contextMenu.offsetHeight);
        elements.contextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - width - 8)}px`;
        elements.contextMenu.style.top = `${Math.min(event.clientY, window.innerHeight - height - 8)}px`;
    }

    function closeContextMenu() {
        elements.contextMenu.hidden = true;
        state.contextPath = "";
        state.contextType = "";
    }

    async function runWorkspaceSearch() {
        const query = elements.searchInput.value.trim();
        if (query.length < 2) {
            state.searchToken += 1;
            elements.searchSummary.textContent = "Type at least two characters.";
            elements.searchResults.replaceChildren();
            return;
        }
        const token = ++state.searchToken;
        elements.searchSummary.textContent = "Searching…";
        const root = elements.searchScope.checked ? dirname(state.activePath) : "";
        try {
            const data = await api("/search", { query, path: root });
            if (token !== state.searchToken) return;
            renderSearchResults(data.results, data.truncated, data.scanned);
        } catch (error) {
            if (token !== state.searchToken) return;
            elements.searchSummary.textContent = "Search failed";
            elements.searchResults.replaceChildren();
            showToast("Search failed", error.message, "error");
        }
    }

    function renderSearchResults(results, truncated, scanned) {
        elements.searchSummary.textContent = results.length
            ? `${results.length}${truncated ? "+" : ""} result${results.length === 1 ? "" : "s"} in ${scanned} files`
            : `No results in ${scanned} files`;
        const fragment = document.createDocumentFragment();
        results.forEach((result) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "search-result";
            const title = document.createElement("strong");
            title.textContent = result.line ? `${result.path}:${result.line}` : result.path;
            const detail = document.createElement("span");
            detail.textContent = result.type === "content" ? result.text : "Filename match";
            button.append(title, detail);
            button.addEventListener("click", () => openFile(result.path, { line: result.line || 0 }));
            fragment.append(button);
        });
        elements.searchResults.replaceChildren(fragment);
    }

    function knownFiles() {
        const files = new Map();
        state.treeCache.forEach((data) => {
            data.entries.forEach((entry) => {
                if (entry.type === "file") files.set(entry.path, entry);
            });
        });
        return Array.from(files.values());
    }

    function openPalette(mode = "files") {
        state.paletteMode = mode;
        state.paletteToken += 1;
        state.paletteItems = [];
        state.paletteIndex = 0;
        elements.paletteBackdrop.hidden = false;
        elements.paletteInput.value = mode === "commands" ? ">" : "";
        elements.paletteInput.placeholder = mode === "commands"
            ? "Type a command"
            : "Search files by name or type a command with >";
        renderPalette();
        requestAnimationFrame(() => {
            elements.paletteInput.focus();
            elements.paletteInput.setSelectionRange(elements.paletteInput.value.length, elements.paletteInput.value.length);
        });
    }

    function closePalette() {
        elements.paletteBackdrop.hidden = true;
        state.paletteToken += 1;
        clearTimeout(state.paletteTimer);
    }

    function localPaletteItems(query) {
        const folded = query.toLocaleLowerCase();
        return knownFiles()
            .filter((entry) => !folded || entry.path.toLocaleLowerCase().includes(folded))
            .sort((left, right) => {
                const leftName = basename(left.path).toLocaleLowerCase();
                const rightName = basename(right.path).toLocaleLowerCase();
                const leftStarts = leftName.startsWith(folded) ? 0 : 1;
                const rightStarts = rightName.startsWith(folded) ? 0 : 1;
                return leftStarts - rightStarts || left.path.localeCompare(right.path);
            })
            .slice(0, 80)
            .map((entry) => ({ type: "file", path: entry.path, title: entry.path, icon: iconInfo(entry.path, "file").label }));
    }

    function renderPalette() {
        const query = elements.paletteInput.value;
        if (query.startsWith(">")) {
            const commandQuery = query.slice(1).trim().toLocaleLowerCase();
            state.paletteItems = commands
                .filter((command) => !commandQuery || command.title.toLocaleLowerCase().includes(commandQuery))
                .map((command) => ({ ...command, type: "command" }));
        } else {
            state.paletteItems = localPaletteItems(query.trim());
        }
        if (state.paletteIndex >= state.paletteItems.length) state.paletteIndex = Math.max(0, state.paletteItems.length - 1);
        const fragment = document.createDocumentFragment();
        if (!state.paletteItems.length) {
            const empty = document.createElement("div");
            empty.className = "palette-empty";
            empty.textContent = query.startsWith(">") ? "No matching commands" : "No matching files";
            fragment.append(empty);
        }
        state.paletteItems.forEach((item, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `palette-item${index === state.paletteIndex ? " selected" : ""}`;
            const icon = document.createElement("span");
            icon.className = "palette-item-icon";
            icon.textContent = item.icon || "F";
            const copy = document.createElement("span");
            copy.className = "palette-item-copy";
            copy.textContent = item.title;
            const detail = document.createElement("span");
            detail.className = "palette-item-detail";
            detail.textContent = item.detail || dirname(item.path || "");
            button.append(icon, copy, detail);
            button.addEventListener("click", () => executePaletteItem(index));
            button.addEventListener("mousemove", () => {
                if (state.paletteIndex === index) return;
                state.paletteIndex = index;
                renderPalette();
            });
            fragment.append(button);
        });
        elements.paletteResults.replaceChildren(fragment);
        elements.paletteResults.querySelector(".selected")?.scrollIntoView({ block: "nearest" });
    }

    function schedulePaletteSearch() {
        clearTimeout(state.paletteTimer);
        const query = elements.paletteInput.value.trim();
        if (query.startsWith(">") || query.length < 2) return;
        const token = ++state.paletteToken;
        state.paletteTimer = setTimeout(async () => {
            try {
                const data = await api("/search", { query, path: "" });
                if (token !== state.paletteToken || elements.paletteInput.value.trim() !== query) return;
                const paths = new Set(state.paletteItems.map((item) => item.path));
                const additions = data.results
                    .filter((result) => !paths.has(result.path))
                    .map((result) => ({ type: "file", path: result.path, title: result.path, icon: iconInfo(result.path, "file").label }));
                state.paletteItems = [...state.paletteItems, ...additions].slice(0, 140);
                renderPalette();
            } catch {
                return;
            }
        }, 260);
    }

    function executePaletteItem(index = state.paletteIndex) {
        const item = state.paletteItems[index];
        if (!item) return;
        closePalette();
        if (item.type === "command") item.action();
        else openFile(item.path, { line: item.line || 0 });
    }

    function showModal(title, bodyHtml, actions) {
        if (state.modalResolver) state.modalResolver(null);
        elements.modalTitle.textContent = title;
        elements.modalBody.innerHTML = bodyHtml;
        elements.modalActions.replaceChildren();
        actions.forEach((action) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = action.className || "";
            button.textContent = action.label;
            button.addEventListener("click", () => closeModal(action.value));
            elements.modalActions.append(button);
        });
        elements.modalBackdrop.hidden = false;
        return new Promise((resolve) => {
            state.modalResolver = resolve;
            requestAnimationFrame(() => {
                const input = elements.modalBody.querySelector("input");
                if (input) {
                    input.focus();
                    input.select();
                } else {
                    elements.modalActions.querySelector(".primary, .danger")?.focus();
                }
            });
        });
    }

    function closeModal(value = null) {
        elements.modalBackdrop.hidden = true;
        const resolve = state.modalResolver;
        state.modalResolver = null;
        if (resolve) resolve(value);
    }

    async function showPromptModal(title, locationLabel, defaultValue = "") {
        const action = await showModal(
            title,
            `<label for="modalInput">${escapeHtml(locationLabel)}</label><input id="modalInput" value="${escapeHtml(defaultValue)}" autocomplete="off">`,
            [
                { label: "Cancel", value: null },
                { label: title.startsWith("Rename") ? "Rename" : "Create", value: "submit", className: "primary" }
            ]
        );
        if (action !== "submit") return null;
        return elements.modalBody.querySelector("input")?.value.trim() || null;
    }

    function showUnsavedModal(path) {
        return showModal(
            "Unsaved changes",
            `<p>Save changes to <strong>${escapeHtml(basename(path))}</strong> before closing?</p>`,
            [
                { label: "Cancel", value: "cancel" },
                { label: "Discard", value: "discard", className: "danger" },
                { label: "Save", value: "save", className: "primary" }
            ]
        );
    }

    function showConfirmModal(title, message, confirmLabel = "OK", cancelLabel = "Cancel", danger = false) {
        return showModal(
            title,
            `<p>${escapeHtml(message)}</p>`,
            [
                { label: cancelLabel, value: "cancel" },
                { label: confirmLabel, value: danger && title === "Delete item" ? "confirm" : "confirm", className: danger ? "danger" : "primary" }
            ]
        );
    }

    function showConflictModal(path) {
        return showModal(
            "File changed on disk",
            `<p><strong>${escapeHtml(path)}</strong> was changed after you opened it.</p><p>Reload the newest version or overwrite it with the editor contents.</p>`,
            [
                { label: "Cancel", value: null },
                { label: "Overwrite", value: "overwrite", className: "danger" },
                { label: "Reload Latest", value: "reload", className: "primary" }
            ]
        );
    }

    function showAboutModal() {
        return showModal(
            "Workspace Editor",
            `<p>A private, local editor for this code workspace. Files are read and written directly on disk through a server bound to <strong>127.0.0.1</strong>.</p><p>Use the file tree, global search, live preview, process output, or launch the current file in Safari.</p>`,
            [{ label: "Done", value: "done", className: "primary" }]
        );
    }

    function showToast(title, message = "", type = "success", duration = 3600) {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        const copy = document.createElement("div");
        copy.className = "toast-copy";
        const heading = document.createElement("strong");
        heading.textContent = title;
        copy.append(heading);
        if (message) {
            const detail = document.createElement("span");
            detail.textContent = message;
            copy.append(detail);
        }
        toast.append(copy);
        toast.addEventListener("click", () => toast.remove());
        elements.toastRegion.append(toast);
        setTimeout(() => toast.remove(), duration);
    }

    function processExtension(path) {
        return [".py", ".sh", ".bash", ".command", ".ts"].includes(extensionOf(path));
    }

    function setPreviewOpen(open) {
        elements.editorRegion.classList.toggle("preview-open", open);
        savePreferences();
    }

    function clearPreview() {
        elements.previewFrame.removeAttribute("src");
        state.previewPath = "";
        state.previewUrl = "";
        elements.previewFileName.textContent = "Nothing running";
        elements.previewEmpty.hidden = false;
    }

    function previewUrlFor(path) {
        return `${apiUrl("/preview", { path })}&v=${Date.now()}`;
    }

    async function runCurrentPreview() {
        if (!state.activePath) {
            showToast("No file open", "Open a file before running the preview.", "warning");
            return;
        }
        if (processExtension(state.activePath)) {
            await runCurrentProcess();
            return;
        }
        if (!(await saveActiveTab())) return;
        const path = state.activePath;
        const url = previewUrlFor(path);
        state.previewPath = path;
        state.previewUrl = url;
        setPreviewOpen(true);
        elements.previewFileName.textContent = path;
        elements.previewEmpty.hidden = true;
        elements.previewFrame.src = url;
        setOutput(`Preview started for ${path}`, "Preview running", "output-success");
    }

    function refreshPreview() {
        if (!state.previewPath) return;
        const separator = state.previewUrl.includes("?") ? "&" : "?";
        state.previewUrl = `${state.previewUrl.split("&v=")[0]}${separator}v=${Date.now()}`;
        elements.previewFrame.src = state.previewUrl;
    }

    async function openPathInSafari(path) {
        if (!path) {
            showToast("No file open", "Open a file before opening Safari.", "warning");
            return;
        }
        const tab = state.tabs.get(path);
        if (tab) {
            if (path === state.activePath) captureEditorState();
            if (tab.content !== tab.savedContent && !(await saveTab(tab))) return;
        }
        try {
            const result = await api("/open", { method: "POST", body: { path } });
            showToast("Opened in Safari", result.url);
        } catch (error) {
            showToast("Safari launch failed", error.message, "error");
        }
    }

    function openCurrentInSafari() {
        openPathInSafari(state.activePath);
    }

    function setOutput(text, status = "", className = "") {
        elements.outputContent.textContent = text;
        elements.outputContent.className = className;
        elements.outputStatus.textContent = status;
        state.outputClass = className;
    }

    function appendOutput(text, className = "") {
        if (elements.outputContent.classList.contains("output-muted") || !elements.outputContent.textContent) {
            elements.outputContent.textContent = "";
            elements.outputContent.className = "";
        }
        elements.outputContent.append(document.createTextNode(`${text}\n`));
        if (className) elements.outputContent.classList.add(className);
        elements.outputContent.scrollTop = elements.outputContent.scrollHeight;
    }

    function clearOutput() {
        setOutput("Output cleared.", "Cleared", "output-muted");
    }

    function toggleOutput(force) {
        const shouldShow = typeof force === "boolean" ? force : elements.outputPanel.hidden;
        elements.outputPanel.hidden = !shouldShow;
    }

    async function runCurrentProcess() {
        if (!state.activePath) {
            showToast("No file open", "Open a JavaScript, Python, or shell file first.", "warning");
            return;
        }
        const path = state.activePath;
        if (!(await saveActiveTab())) return;
        elements.outputPanel.hidden = false;
        setOutput(`Running ${path}…`, "Running", "output-muted");
        try {
            const result = await api("/run", {
                method: "POST",
                body: { path, timeout: 20 }
            });
            const header = [
                `$ ${result.command}`,
                result.timedOut ? "Process timed out after 20 seconds." : `Process exited with code ${result.code}.`,
                `Completed in ${result.duration}s`,
                ""
            ].join("\n");
            const className = result.code === 0 && !result.timedOut ? "output-success" : "output-error";
            setOutput(`${header}${result.output}`, result.timedOut ? "Timed out" : `Exit ${result.code}`, className);
        } catch (error) {
            setOutput(`Could not run ${path}\n${error.message}`, "Run failed", "output-error");
            showToast("Run failed", error.message, "error");
        }
    }

    async function copyCurrentPath() {
        if (!state.activePath) return;
        try {
            await navigator.clipboard.writeText(state.activePath);
            showToast("Path copied", state.activePath);
        } catch {
            showToast("Could not copy path", state.activePath, "warning");
        }
    }

    function handleEditorTab(event) {
        const input = elements.codeInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const value = input.value;
        if (event.key === "Tab") {
            event.preventDefault();
            if (!event.shiftKey && start === end) {
                input.setRangeText("  ", start, end, "end");
                updateEditorContent();
                return;
            }
            const lineStart = value.lastIndexOf("\n", start - 1) + 1;
            let lineEnd = value.indexOf("\n", end);
            if (lineEnd < 0) lineEnd = value.length;
            const block = value.slice(lineStart, lineEnd);
            const replacement = event.shiftKey
                ? block.split("\n").map((line) => line.replace(/^ {1,2}/, "")).join("\n")
                : block.split("\n").map((line) => `  ${line}`).join("\n");
            input.setRangeText(replacement, lineStart, lineEnd, "select");
            input.selectionStart = lineStart;
            input.selectionEnd = lineStart + replacement.length;
            updateEditorContent();
            return;
        }
        if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
            const lineStart = value.lastIndexOf("\n", start - 1) + 1;
            const currentLine = value.slice(lineStart, start);
            const indent = (currentLine.match(/^[ \t]*/) || [""])[0];
            const insertion = `\n${indent}`;
            input.setRangeText(insertion, start, end, "end");
            updateEditorContent();
            return;
        }
        const pairs = { "(": ")", "[": "]", "{": "}" };
        if (pairs[event.key] && !event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            const selected = input.value.slice(start, end);
            const wrapped = `${event.key}${selected}${pairs[event.key]}`;
            input.setRangeText(wrapped, start, end, "select");
            input.setSelectionRange(start + 1, start + 1 + selected.length);
            updateEditorContent();
            return;
        }
        if (Object.values(pairs).includes(event.key) && start === end && value[start] === event.key) {
            event.preventDefault();
            input.setSelectionRange(start + 1, start + 1);
        }
    }

    function bindPreviewResize() {
        let startX = 0;
        let startWidth = 0;
        elements.previewResizer.addEventListener("pointerdown", (event) => {
            startX = event.clientX;
            startWidth = elements.previewPane.getBoundingClientRect().width;
            elements.previewResizer.classList.add("dragging");
            elements.previewResizer.setPointerCapture(event.pointerId);
        });
        elements.previewResizer.addEventListener("pointermove", (event) => {
            if (!elements.previewResizer.hasPointerCapture(event.pointerId)) return;
            const total = elements.editorRegion.getBoundingClientRect().width;
            const maximum = Math.max(280, total - 330);
            const nextWidth = Math.min(maximum, Math.max(280, startWidth - event.clientX + startX));
            document.documentElement.style.setProperty("--preview-width", `${nextWidth}px`);
        });
        const stop = (event) => {
            if (elements.previewResizer.hasPointerCapture(event.pointerId)) {
                elements.previewResizer.releasePointerCapture(event.pointerId);
            }
            elements.previewResizer.classList.remove("dragging");
        };
        elements.previewResizer.addEventListener("pointerup", stop);
        elements.previewResizer.addEventListener("pointercancel", stop);
        elements.previewResizer.addEventListener("dblclick", () => document.documentElement.style.setProperty("--preview-width", "42%"));
    }

    function bindEvents() {
        document.querySelectorAll(".activity-button[data-view]").forEach((button) => {
            button.addEventListener("click", () => setView(button.dataset.view));
        });
        document.getElementById("newFileButton").addEventListener("click", () => createEntry("file"));
        document.getElementById("newFolderButton").addEventListener("click", () => createEntry("folder"));
        document.getElementById("refreshTreeButton").addEventListener("click", refreshTree);
        document.querySelector(".workspace-heading").addEventListener("contextmenu", (event) => showContextMenu(event, "", "directory"));
        elements.fileTree.addEventListener("click", (event) => {
            const row = event.target.closest(".tree-row");
            if (!row) return;
            if (row.dataset.type === "directory") toggleDirectory(row.dataset.path);
            else openFile(row.dataset.path);
        });
        elements.fileTree.addEventListener("contextmenu", (event) => {
            const row = event.target.closest(".tree-row");
            if (row) showContextMenu(event, row.dataset.path, row.dataset.type);
        });
        elements.fileTree.addEventListener("keydown", (event) => {
            const row = event.target.closest(".tree-row");
            if (row && (event.key === "F10" && event.shiftKey)) showContextMenu(event, row.dataset.path, row.dataset.type);
        });
        elements.tabStrip.addEventListener("click", (event) => {
            const close = event.target.closest("[data-close-path]");
            if (close) {
                event.stopPropagation();
                requestCloseTab(close.dataset.closePath);
                return;
            }
            const tab = event.target.closest(".editor-tab");
            if (tab) activateTab(tab.dataset.path);
        });
        elements.tabStrip.addEventListener("auxclick", (event) => {
            const tab = event.target.closest(".editor-tab");
            if (tab && event.button === 1) {
                event.preventDefault();
                requestCloseTab(tab.dataset.path);
            }
        });
        elements.codeInput.addEventListener("input", updateEditorContent);
        elements.codeInput.addEventListener("keydown", handleEditorTab);
        elements.codeInput.addEventListener("keyup", updateCursorStatus);
        elements.codeInput.addEventListener("click", updateCursorStatus);
        elements.codeInput.addEventListener("select", updateCursorStatus);
        elements.codeInput.addEventListener("scroll", syncEditorScroll);
        document.getElementById("saveButton").addEventListener("click", saveActiveTab);
        document.getElementById("runButton").addEventListener("click", runCurrentPreview);
        document.getElementById("safariButton").addEventListener("click", openCurrentInSafari);
        document.getElementById("runPanelPreview").addEventListener("click", runCurrentPreview);
        document.getElementById("runPanelProcess").addEventListener("click", runCurrentProcess);
        document.getElementById("runPanelSafari").addEventListener("click", openCurrentInSafari);
        document.getElementById("toggleTerminalButton").addEventListener("click", () => toggleOutput());
        document.getElementById("togglePreviewButton").addEventListener("click", () => setPreviewOpen(!elements.editorRegion.classList.contains("preview-open")));
        document.getElementById("closePreviewButton").addEventListener("click", () => setPreviewOpen(false));
        document.getElementById("refreshPreviewButton").addEventListener("click", refreshPreview);
        document.getElementById("previewSafariButton").addEventListener("click", openCurrentInSafari);
        document.getElementById("closeOutputButton").addEventListener("click", () => toggleOutput(false));
        document.getElementById("clearOutputButton").addEventListener("click", clearOutput);
        document.querySelectorAll(".viewport-controls button").forEach((button) => {
            button.addEventListener("click", () => {
                document.querySelectorAll(".viewport-controls button").forEach((item) => item.classList.toggle("active", item === button));
                elements.previewFrameWrap.className = `preview-frame-wrap ${button.dataset.width}`;
            });
        });
        elements.searchInput.addEventListener("input", () => {
            clearTimeout(state.searchTimer);
            state.searchTimer = setTimeout(runWorkspaceSearch, 320);
        });
        elements.searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                const first = elements.searchResults.querySelector(".search-result");
                first?.click();
            }
        });
        elements.searchScope.addEventListener("change", runWorkspaceSearch);
        document.getElementById("commandTrigger").addEventListener("click", () => openPalette("files"));
        document.getElementById("welcomeOpenFile").addEventListener("click", () => openPalette("files"));
        document.getElementById("welcomeNewFile").addEventListener("click", () => createEntry("file"));
        document.getElementById("aboutButton").addEventListener("click", showAboutModal);
        elements.copyPathButton.addEventListener("click", copyCurrentPath);
        elements.paletteInput.addEventListener("input", () => {
            state.paletteIndex = 0;
            renderPalette();
            schedulePaletteSearch();
        });
        elements.paletteInput.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                state.paletteIndex = Math.min(state.paletteItems.length - 1, state.paletteIndex + 1);
                renderPalette();
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                state.paletteIndex = Math.max(0, state.paletteIndex - 1);
                renderPalette();
            } else if (event.key === "Enter") {
                event.preventDefault();
                executePaletteItem();
            } else if (event.key === "Escape") {
                closePalette();
            }
        });
        elements.paletteBackdrop.addEventListener("click", (event) => {
            if (event.target === elements.paletteBackdrop) closePalette();
        });
        elements.modalCloseButton.addEventListener("click", () => closeModal());
        elements.modalBackdrop.addEventListener("click", (event) => {
            if (event.target === elements.modalBackdrop) closeModal();
        });
        elements.modalBody.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && event.target.id === "modalInput") {
                event.preventDefault();
                closeModal("submit");
            } else if (event.key === "Escape") {
                closeModal();
            }
        });
        document.addEventListener("pointerdown", (event) => {
            if (!elements.contextMenu.hidden && !elements.contextMenu.contains(event.target)) closeContextMenu();
        });
        window.addEventListener("resize", closeContextMenu);
        window.addEventListener("message", (event) => {
            if (event.source !== elements.previewFrame.contentWindow) return;
            const data = event.data;
            if (!data || typeof data !== "object" || !String(data.type || "").startsWith("workspace-preview")) return;
            elements.outputPanel.hidden = false;
            const prefix = data.type === "workspace-preview-error" ? "[error] " : "[preview] ";
            appendOutput(`${prefix}${data.message}`);
        });
        window.addEventListener("keydown", (event) => {
            const commandKey = event.metaKey || event.ctrlKey;
            if (!commandKey) return;
            const key = event.key.toLocaleLowerCase();
            if (key === "p") {
                event.preventDefault();
                openPalette(event.shiftKey ? "commands" : "files");
            } else if (key === "s") {
                event.preventDefault();
                if (event.shiftKey) saveAllTabs();
                else saveActiveTab();
            } else if (event.key === "Enter") {
                event.preventDefault();
                runCurrentPreview();
            } else if (key === "f" && event.shiftKey) {
                event.preventDefault();
                setView("search");
                elements.searchInput.focus();
            }
        });
        window.addEventListener("beforeunload", (event) => {
            const dirty = Array.from(state.tabs.values()).some((tab) => tab.content !== tab.savedContent);
            if (!dirty) return;
            event.preventDefault();
            event.returnValue = "";
        });
        bindPreviewResize();
    }

    async function initialize() {
        bindEvents();
        try {
            const health = await api("/health");
            elements.workspaceName.textContent = basename(health.workspace);
        } catch (error) {
            elements.workspaceName.textContent = "Workspace";
            showToast("Server unavailable", error.message, "error", 8000);
        }
        const preferences = readPreferences();
        if (preferences.previewOpen) setPreviewOpen(true);
        Array.isArray(preferences.expanded) && preferences.expanded.forEach((path) => state.expanded.add(path));
        state.expanded.add("");
        try {
            await loadDirectory("");
            const expandedPaths = Array.from(state.expanded).filter(Boolean);
            for (const path of expandedPaths) {
                try {
                    await loadDirectory(path);
                } catch {
                    state.expanded.delete(path);
                }
            }
        } catch (error) {
            showToast("Could not load workspace", error.message, "error", 8000);
        }
        renderTree();
        const savedTabs = Array.isArray(preferences.tabs) ? preferences.tabs.slice(0, MAX_RESTORED_TABS) : [];
        for (const path of savedTabs) await openFile(path, { activate: false, quiet: true });
        let activePath = typeof preferences.activePath === "string" ? preferences.activePath : "";
        if (activePath && state.tabs.has(activePath)) activateTab(activePath);
        else if (state.tabs.size) activateTab(state.tabs.keys().next().value);
        else {
            const rootIndex = treeChildren("").find((entry) => entry.type === "file" && entry.name === "index.html");
            if (rootIndex) await openFile(rootIndex.path);
            else closeActiveView();
        }
        savePreferences();
    }

    initialize();
})();
