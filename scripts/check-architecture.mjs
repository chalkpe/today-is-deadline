import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

// steiger는 없는 경로를 받으면 대화형 프롬프트를 띄우다 비대화형 셸에서 ERR_TTY_INIT_FAILED로 죽으므로 있는 루트만 검사한다.
const roots = ['src/renderer', 'src/main'].filter((root) => existsSync(root))

let failed = false
for (const root of roots) {
  // Windows에서는 steiger가 .cmd 실행 파일이라 셸을 거쳐야 실행된다.
  const result = spawnSync(`steiger ${root} --fail-on-warnings`, { shell: true, stdio: 'inherit' })
  if (result.status !== 0) failed = true
}

process.exit(failed ? 1 : 0)
