type Props = { onOpenSettings(): void; onRequest(): void }

const BUTTON = 'rounded bg-neutral-700 px-2 py-1 text-[11px] text-neutral-100 hover:bg-neutral-600'

export function PermissionNotice({ onOpenSettings, onRequest }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[11px] text-neutral-300">
      <p>
        타자 수를 세려면 입력 모니터링 권한이 필요합니다.
        <br />
        시스템 설정의 개인정보 보호 및 보안에서 허용해 주세요.
      </p>
      <div className="flex gap-2">
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
