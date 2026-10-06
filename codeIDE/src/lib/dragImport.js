// Read files & folders dragged from the OS (via webkitGetAsEntry) into tree nodes.

const BINARY_EXTS = [
  'png','jpg','jpeg','gif','webp','bmp','ico','svg','mp3','wav','ogg','mp4','webm',
  'mov','avi','pdf','zip','gz','tar','rar','woff','woff2','ttf','otf','eot','exe','bin'
];

export function isBinaryName(name) {
  const ext = name.split('.').pop().toLowerCase();
  return BINARY_EXTS.includes(ext);
}

function entryToNode(entry) {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file) => {
        const reader = new FileReader();
        if (isBinaryName(entry.name)) {
          reader.onload = () =>
            resolve({ id: Math.random().toString(36).slice(2), type: 'file', name: entry.name, content: reader.result, binary: true });
          reader.onerror = () =>
            resolve({ id: Math.random().toString(36).slice(2), type: 'file', name: entry.name, content: '', binary: true });
          reader.readAsDataURL(file);
        } else {
          reader.onload = () =>
            resolve({ id: Math.random().toString(36).slice(2), type: 'file', name: entry.name, content: reader.result, binary: false });
          reader.onerror = () =>
            resolve({ id: Math.random().toString(36).slice(2), type: 'file', name: entry.name, content: '', binary: false });
          reader.readAsText(file);
        }
      }, () => resolve(null));
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const all = [];
      const readBatch = () => {
        reader.readEntries(async (entries) => {
          if (!entries.length) {
            const children = (await Promise.all(all)).filter(Boolean);
            resolve({ id: Math.random().toString(36).slice(2), type: 'folder', name: entry.name, content: '', binary: false, children });
          } else {
            all.push(...entries);
            readBatch();
          }
        }, () => resolve(null));
      };
      readBatch();
    } else {
      resolve(null);
    }
  });
}

export async function readDataTransferItems(dataTransfer) {
  const items = dataTransfer.items;
  if (!items) return [];
  const entries = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.webkitGetAsEntry) {
      const e = it.webkitGetAsEntry();
      if (e) entries.push(e);
    }
  }
  const nodes = await Promise.all(entries.map(entryToNode));
  return nodes.filter(Boolean);
}

// Fallback: read flat files (no folder support) when webkitGetAsEntry is unavailable.
export async function readDataTransferFiles(dataTransfer) {
  const files = dataTransfer.files;
  const nodes = [];
  for (const file of files) {
    const node = await new Promise((resolve) => {
      const reader = new FileReader();
      if (isBinaryName(file.name)) {
        reader.onload = () =>
          resolve({ id: Math.random().toString(36).slice(2), type: 'file', name: file.name, content: reader.result, binary: true });
        reader.readAsDataURL(file);
      } else {
        reader.onload = () =>
          resolve({ id: Math.random().toString(36).slice(2), type: 'file', name: file.name, content: reader.result, binary: false });
        reader.readAsText(file);
      }
    });
    nodes.push(node);
  }
  return nodes;
}