// 生成桌宠「团团」图标 icon.png + icon.ico（纯 Node 手写 PNG/ICO，无依赖）
// 运行：node make-icon.js
// 设计：大圆身体（奶油色）+ 两只圆眼睛（深棕），带一圈更深的描边。
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const W = 256
const H = 256

// ---------- PNG 编码 ----------
let crcTable = null
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      crcTable[n] = c >>> 0
    }
  }
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}
function encodePng(rgba, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- ICO 打包 ----------
function encodeIco(pngs) {
  const count = pngs.length
  const dir = Buffer.alloc(6 + 16 * count)
  dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(count, 4)
  let offset = 6 + 16 * count
  const blobs = []
  pngs.forEach((p, i) => {
    const e = 6 + i * 16
    dir[e] = p.size >= 256 ? 0 : p.size
    dir[e + 1] = p.size >= 256 ? 0 : p.size
    dir[e + 2] = 0; dir[e + 3] = 0
    dir.writeUInt16LE(1, e + 4); dir.writeUInt16LE(32, e + 6)
    dir.writeUInt32LE(p.data.length, e + 8)
    dir.writeUInt32LE(offset, e + 12)
    blobs.push(p.data); offset += p.data.length
  })
  return Buffer.concat([dir, ...blobs])
}

// ---------- 设计参数 ----------
const BODY = { x: 128, y: 138, r: 98 }
const EYE_L = { x: 94, y: 116, r: 19 }
const EYE_R = { x: 162, y: 116, r: 19 }
const STROKE = 5

const BODY_C = [246, 231, 198]   // #F6E7C6 奶油
const STROKE_C = [184, 173, 148] // 身体色 -25%
const EYE_C = [107, 78, 51]      // #6B4E33 深棕

function dist2(px, py, c) { const dx = px - c.x, dy = py - c.y; return dx * dx + dy * dy }

// 每个子采样点返回 [r,g,b,a]（a 0..1）
function sample(px, py) {
  const dB = dist2(px, py, BODY)
  const dL = dist2(px, py, EYE_L)
  const dR = dist2(px, py, EYE_R)

  if (dL <= EYE_L.r * EYE_L.r || dR <= EYE_R.r * EYE_R.r) return [...EYE_C, 1]

  const rOuter = BODY.r + STROKE / 2
  const rInner = BODY.r - STROKE / 2
  if (dB <= rInner * rInner) return [...BODY_C, 1]
  if (dB <= rOuter * rOuter) return [...STROKE_C, 1]
  return [0, 0, 0, 0]
}

const rgba = Buffer.alloc(W * H * 4)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // 4x 超采样抗锯齿
    let r = 0, g = 0, b = 0, a = 0
    for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
      const s = sample(x + ox, y + oy)
      r += s[0] * s[3]; g += s[1] * s[3]; b += s[2] * s[3]; a += s[3]
    }
    const idx = (y * W + x) * 4
    if (a > 0) {
      rgba[idx] = Math.round(r / a)
      rgba[idx + 1] = Math.round(g / a)
      rgba[idx + 2] = Math.round(b / a)
      rgba[idx + 3] = Math.round((a / 4) * 255)
    }
  }
}

function downsample(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4)
  const sx = sw / dw, sy = sh / dh
  for (let dy = 0; dy < dh; dy++) {
    for (let dx = 0; dx < dw; dx++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0
      const x0 = Math.floor(dx * sx), x1 = Math.max(x0 + 1, Math.ceil((dx + 1) * sx))
      const y0 = Math.floor(dy * sy), y1 = Math.max(y0 + 1, Math.ceil((dy + 1) * sy))
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (yy * sw + xx) * 4, aa = src[i + 3]
        r += src[i] * aa; g += src[i + 1] * aa; b += src[i + 2] * aa; a += aa; n++
      }
      const o = (dy * dw + dx) * 4
      if (a > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); out[o + 3] = Math.round(a / n) }
    }
  }
  return out
}

const png256 = encodePng(rgba, W, H)
fs.writeFileSync(path.join(__dirname, 'icon.png'), png256)

const sizes = [256, 48, 32, 16]
const pngs = sizes.map((s) => ({ size: s, data: s === 256 ? png256 : encodePng(downsample(rgba, W, H, s, s), s, s) }))
fs.writeFileSync(path.join(__dirname, 'icon.ico'), encodeIco(pngs))

console.log('icon.png', png256.length, 'bytes')
console.log('icon.ico', fs.statSync(path.join(__dirname, 'icon.ico')).size, 'bytes,', sizes.join('/'), 'sizes')
