const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const root = path.resolve(__dirname, '..');
  const source = path.join(root, 'images', 'mg-browser-icon.svg');
  const out = path.join(root, 'build', 'icons');
  const iconset = path.join(out, 'icon.iconset');
  fs.mkdirSync(iconset, { recursive: true });
  const svg = fs.readFileSync(source);
  const sizes = [16, 32, 64, 128, 256, 512, 1024];
  const pngs = {};
  for (const size of sizes) {
    pngs[size] = await sharp(svg).resize(size, size).png().toBuffer();
  }
  fs.writeFileSync(path.join(out, 'icon.png'), pngs[512]);
  fs.writeFileSync(path.join(out, 'icon-256.png'), pngs[256]);

  // ICO supports PNG-compressed entries; a 256x256 entry is valid for modern Windows.
  const png = pngs[256];
  const ico = Buffer.alloc(22 + png.length);
  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(1, 4);
  ico.writeUInt8(0, 6); ico.writeUInt8(0, 7);
  ico.writeUInt8(0, 8); ico.writeUInt8(0, 9);
  ico.writeUInt16LE(1, 10);
  ico.writeUInt16LE(32, 12);
  ico.writeUInt32LE(png.length, 14);
  ico.writeUInt32LE(22, 18);
  png.copy(ico, 22);
  fs.writeFileSync(path.join(out, 'icon.ico'), ico);

  const names = [
    [16, 'icon_16x16.png'], [32, 'icon_16x16@2x.png'],
    [32, 'icon_32x32.png'], [64, 'icon_32x32@2x.png'],
    [128, 'icon_128x128.png'], [256, 'icon_128x128@2x.png'],
    [256, 'icon_256x256.png'], [512, 'icon_256x256@2x.png'],
    [512, 'icon_512x512.png'], [1024, 'icon_512x512@2x.png']
  ];
  for (const [size, name] of names) {
    const pngSize = name.includes('@2x') ? size : size;
    fs.writeFileSync(path.join(iconset, name), pngs[pngSize]);
  }
  console.log('Generated PNG, ICO, and macOS iconset assets.');
}
main().catch(error => { console.error(error); process.exit(1); });
