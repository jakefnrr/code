const fs = require('fs');
const b = fs.readFileSync('/Users/jake/Desktop/FortniteMap.glb');
let o = 12;                       // skip 12-byte GLB header
let json = null, bin = null;
while (o + 8 <= b.length) {
  const len = b.readUInt32LE(o);
  const type = b.readUInt32LE(o + 4);
  const data = b.slice(o + 8, o + 8 + len);
  if (type === 0x4E4F534A) json = JSON.parse(data.toString('utf8'));
  else if (type === 0x004E4942) bin = data;
  o += 8 + len + ((4 - (len % 4)) % 4);
}
console.log('bin bytes', bin.length, 'json ok', !!json);

const acc = (a) => {
  const v = json.bufferViews[a.bufferView];
  const off = (v.byteOffset || 0) + (a.byteOffset || 0);
  const Ctor = a.componentType === 5126 ? Float32Array : a.componentType === 5123 ? Uint16Array : Uint32Array;
  const comp = a.type === 'VEC3' ? 3 : a.type === 'VEC2' ? 2 : 1;
  return { arr: new Ctor(bin.buffer, bin.byteOffset + off, a.count * comp), comp };
};

const prim = json.meshes[0].primitives[0];
const pa = json.accessors[prim.attributes.POSITION];
const { arr: P, comp } = acc(pa);
let min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
for (let i = 0; i < pa.count; i++) for (let k = 0; k < 3; k++) { const v = P[i * comp + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
console.log('verts', pa.count, 'min', min.map(v => +v.toFixed(4)), 'max', max.map(v => +v.toFixed(4)));
console.log('footprint', +(max[0] - min[0]).toFixed(4), 'x', +(max[2] - min[2]).toFixed(4), 'relief', +(max[1] - min[1]).toFixed(4));

const outDir = '/Users/jake/Desktop/code/fortnite2/assets';
fs.mkdirSync(outDir, { recursive: true });
json.images.forEach((im, i) => {
  const bv = json.bufferViews[im.bufferView];
  const buf = bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  const sig = buf.slice(0, 8).toString('hex');
  const ext = (im.mimeType || 'image/png').split('/')[1];
  const f = outDir + '/island_tex' + i + '.' + ext;
  fs.writeFileSync(f, buf);
  console.log('img', i, 'sig', sig.slice(0, 8), 'bytes', buf.length, '->', f);
});
