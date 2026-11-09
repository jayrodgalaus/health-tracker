/**
 * Reproducible build-time vendoring of on-device OCR, not a runtime CDN.
 * Pinned npm archives are copied into this PWA's own origin and precached.
 * Run by predev/prebuild; does not persist images or any user data.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const target = resolve('public/ocr')
const required = ['tesseract.min.js','worker.min.js','lang/eng.traineddata.gz']
const ready = required.every(file => existsSync(join(target,file))) &&
  existsSync(join(target,'core/tesseract-core-lstm.wasm')) &&
  existsSync(join(target,'core/tesseract-core-lstm.wasm.js'))
if (ready) process.exit(0)

const scratch = mkdtempSync(join(tmpdir(),'health-tracker-ocr-'))
function extract(spec, name) {
  const packDir = join(scratch,name)
  mkdirSync(packDir,{recursive:true})
  const tarball = execFileSync('npm', [
    'pack','--silent','--ignore-scripts','--pack-destination',packDir,spec
  ],{encoding:'utf8'}).trim().split('\n').at(-1)
  if (!tarball?.endsWith('.tgz')) throw new Error('Could not retrieve pinned OCR archive: ' + name)
  execFileSync('tar',['-xzf',join(packDir,tarball),'-C',packDir])
  return join(packDir,'package')
}
try {
  const ui = extract('tesseract.js@7.0.0','ui')
  const core = extract('tesseract.js-core@7.0.0','core')
  const lang = extract('@tesseract.js-data/eng@1.0.0','lang')
  const next = join(scratch,'output')
  mkdirSync(join(next,'core'),{recursive:true})
  mkdirSync(join(next,'lang'),{recursive:true})
  copyFileSync(join(ui,'dist/tesseract.min.js'),join(next,'tesseract.min.js'))
  copyFileSync(join(ui,'dist/worker.min.js'),join(next,'worker.min.js'))
  for (const file of readdirSync(core)) {
    if (/^tesseract-core-.*\.(?:wasm|wasm\.js)$/.test(file) ||
        /^tesseract-core\.(?:wasm|wasm\.js)$/.test(file)) {
      copyFileSync(join(core,file),join(next,'core',file))
    }
  }
  copyFileSync(join(lang,'4.0.0_best_int/eng.traineddata.gz'),join(next,'lang/eng.traineddata.gz'))
  mkdirSync(target,{recursive:true})
  cpSync(next,target,{recursive:true,force:true})
  console.log('On-device OCR resources prepared for same-origin offline use.')
} finally {
  rmSync(scratch,{recursive:true,force:true})
}
