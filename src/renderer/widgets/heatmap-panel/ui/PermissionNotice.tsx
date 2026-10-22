type Props = { onOpenSettings(): void; onRequest(): void }

const BUTTON = 'w-full rounded bg-control-border/60 px-2 py-1 text-[11px] text-fg hover:bg-control-border'

/** 높이는 PERMISSION_NOTICE_HEIGHT로 고정이다. 최소 너비(140)에서도 넘치지 않게 버튼은 세로로 쌓는다. */
export function PermissionNotice({ onOpenSettings, onRequest }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 break-keep text-center text-[11px] text-fg leading-snug">
      <p>
        타자 수를 세려면 입력 모니터링 권한이 필요합니다.
        <br />
        시스템 설정의 개인정보 보호 및 보안에서 허용해 주세요.
      </p>
      <div className="flex w-full max-w-36 flex-col gap-1">
        <button type="button" className={BUTTON} onClick={onOpenSettings}>
          시스템 설정 열기
        </button>
        <button type="button" className={BUTTON} onClick={onRequest}>
          권한 요청
        </button>
      </div>
    </div>
  )
}
