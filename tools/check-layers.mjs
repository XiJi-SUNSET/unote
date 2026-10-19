#!/usr/bin/env node
/**
 * 架构红线的机器检查（零依赖，CI 里跑）。
 *
 * 1. src/core/** 只能依赖 core 自己：不许碰 react / dexie / @capacitor，
 *    也不许 import 到 infra / stores / screens / components / app。
 * 2. src/styles/app.css 不许出现字面量颜色，颜色只能来自 tokens.css。
 *
 * 规则出处见 AGENTS.md「架构红线」。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const CORE = join(SRC, 'core')
const APP_CSS = join(SRC, 'styles', 'app.css')

const FORBIDDEN_PACKAGES = [/^react$/, /^react-dom$/, /^react\//, /^dexie$/, /^@capacitor\//]
const FORBIDDEN_LAYERS = ['infra', 'stores', 'screens', 'components', 'app']

/** 收集 import / export ... from 的模块说明符，跳过注释掉的假阳性。 */
function specifiersOf(code) {
  const found = []
  const re = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g
  for (const match of code.matchAll(re)) found.push(match[1])
  const bare = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g
  for (const match of code.matchAll(bare)) found.push(match[1])
  return found
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [full] : []
  })
}

const problems = []

function rel(file) {
  return relative(ROOT, file).split(sep).join('/')
}

for (const file of walk(CORE)) {
  for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
    if (FORBIDDEN_PACKAGES.some((pattern) => pattern.test(spec))) {
      problems.push(`${rel(file)}: core 层不能 import "${spec}"`)
      continue
    }
    if (!spec.startsWith('.')) continue

    const target = resolve(dirname(file), spec)
    const insideCore = target === CORE || target.startsWith(CORE + sep)
    if (insideCore) continue

    const layer = FORBIDDEN_LAYERS.find((name) => target.startsWith(join(SRC, name) + sep))
    problems.push(
      layer
        ? `${rel(file)}: core 层不能反向依赖 ${layer} 层（"${spec}"）`
        : `${rel(file)}: core 层不能依赖 core 之外的模块（"${spec}"）`,
    )
  }
}

const css = readFileSync(APP_CSS, 'utf8')
css.split('\n').forEach((line, index) => {
  const literal = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/.exec(line)
  if (!literal) return
  problems.push(`${rel(APP_CSS)}:${index + 1}: 字面量颜色 "${literal[0]}"，请改用 tokens.css 里的变量`)
})

if (problems.length > 0) {
  console.error('架构红线检查未通过：\n')
  for (const problem of problems) console.error(`  ✗ ${problem}`)
  console.error('\n规则见 AGENTS.md「架构红线」。')
  process.exit(1)
}

console.log('架构红线检查通过：core 层依赖干净，样式里没有字面量颜色。')
