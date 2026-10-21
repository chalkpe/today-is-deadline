# today-is-deadline

시스템에 상주하면서 키를 누른 횟수를 세고, GitHub 컨트리뷰션 그래프처럼 생긴 히트맵 위젯으로 늘 화면 위에 띄워 두는 데스크톱 앱이다.

- 히트맵 칸을 누르면 그날 어떤 앱에서 얼마나 입력했는지 펼쳐 보여 준다.
- 통계 창에서 일·주·월 단위로 시간대별 타수, 앱별 누적, 요일×시간 패턴, 달력을 본다.
- 입력이 멈추면 정해 둔 시간 뒤부터 소리로 알린다.
- 트레이 메뉴에서 카운트·알림·위젯 표시·위치 잠금을 켜고 끄고, 통계·가감·설정 창을 연다.
- macOS(arm64·x64)와 Windows 11(x64)을 지원한다.

## 개인정보: 키로깅을 하지 않는다

어떤 키를 눌렀는지는 디스크, IPC, 로그 어디에도 남기지 않는다. 네이티브 애드온은 키코드를 자동 반복과 수식키를 거르는 데에만 쓰고 바로 버린다. JS 쪽으로 넘어오는 것은 "키를 한 번 눌렀다"는 사실과 그때 활성 앱(번들 ID·이름·경로)뿐이고, 저장되는 것은 "분 × 앱"별 횟수다. macOS에서 보안 입력 모드(비밀번호 칸 등)일 때 누른 키는 아예 세지 않는다.

## 요구 사항

- Node.js 24
- pnpm 12 (`package.json`의 `packageManager`를 따른다. `corepack enable` 또는 `npm i -g pnpm@12`)
- Rust stable ([rustup](https://rustup.rs)). Windows는 MSVC 툴체인과 Visual Studio C++ 빌드 도구가 필요하다.
- macOS: 입력 모니터링 권한. 처음 실행하면 위젯에 안내가 뜨고, **시스템 설정 → 개인정보 보호 및 보안 → 입력 모니터링**에서 허용하면 카운트를 시작한다. 개발 중(`pnpm dev`)에는 권한이 Electron 개발 바이너리에, 패키징한 앱에서는 `today-is-deadline`에 붙는다.
- Windows는 따로 권한이 필요 없다.

## 개발

```sh
pnpm install
pnpm native:build   # Rust 애드온(native/index.<플랫폼>.node) 빌드
pnpm dev            # electron-vite 개발 서버로 실행
```

`pnpm native:build`를 하지 않으면 앱이 키 훅을 불러오지 못하고, 애드온을 불러오는 테스트는 건너뛴다.

## 검사

```sh
pnpm check          # Biome(포맷·린트) + steiger(FSD 구조)
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest
pnpm native:test    # Rust 단위 테스트
```

## 패키징

```sh
pnpm package        # macOS: 지금 머신 아키텍처의 dmg → release/today-is-deadline-<버전>-<arch>.dmg
pnpm package:win    # Windows: x64 NSIS 설치 파일 → release/today-is-deadline Setup <버전>.exe
```

- 설정은 `electron-builder.yml`에 있다. 애드온(`native/index.js`, `native/*.node`), 알림음, 아이콘은 `extraResources`로 앱의 `resources/` 아래 `native/`·`sounds/`·`icons/`에 들어간다.
- 패키징 전에 `pnpm native:build`로 그 플랫폼·아키텍처의 애드온을 먼저 만들어야 한다. macOS x64 앱까지 만들려면 `rustup target add x86_64-apple-darwin` 뒤 `pnpm native:build --target x86_64-apple-darwin`도 실행하고 `pnpm build && pnpm exec electron-builder --mac --arm64 --x64 --publish never`로 묶는다.
- 코드 서명·공증은 하지 않는다. `pnpm package`는 `CSC_IDENTITY_AUTO_DISCOVERY=false`로 키체인 인증서 자동 탐색을 끈다. electron-builder를 직접 부를 때도 이 환경 변수를 넣는다.
- 서명하지 않은 앱이라 내려받은 dmg를 macOS가 "손상되었다"며 막으면 `xattr -cr /Applications/today-is-deadline.app`로 격리 속성을 지운다. Windows SmartScreen 경고는 "추가 정보 → 실행"으로 넘긴다.

## CI

GitHub Actions(`.github/workflows/ci.yml`)가 푸시와 PR마다 `macos-latest`, `windows-latest`에서 Rust 애드온 빌드·테스트, `pnpm check`, `pnpm typecheck`, `pnpm test`, 패키징(배포 없음)을 돌리고, macOS dmg(arm64·x64)와 Windows 설치 파일을 산출물로 올린다.

## 데이터 위치

모두 Electron `userData` 폴더에 있다. macOS는 `~/Library/Application Support/today-is-deadline/`, Windows는 `%APPDATA%\today-is-deadline\`이다.

| 파일 | 내용 |
| --- | --- |
| `data.sqlite` | 분·앱별 타수, 앱 정보, 날짜별 가감 기록 (SQLite, WAL) |
| `settings.json` | 설정 (위젯 위치·크기, 색, 알림 등) |
| `logs/main.log` | main 프로세스 로그 (키코드는 남기지 않는다) |
