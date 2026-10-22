import { cn } from 'cn'
import { type ReactNode, useEffect } from 'react'

/** windowTitle은 창 제목 막대에 보이는 document.title이다. wide면 내용 폭을 제한하지 않고 창 너비를 채운다. */
type Props = { windowTitle: string; wide?: boolean; children: ReactNode }

/** 프레임 있는 일반 창(설정·가감 등)의 바탕. body는 위젯 때문에 투명하므로 배경을 직접 칠한다. */
export function Page({ windowTitle, wide = false, children }: Props) {
  useEffect(() => {
    document.title = windowTitle
  }, [windowTitle])
  return (
    // 기본 컨트롤(날짜·숫자 입력, 스크롤 막대)의 색은 루트의 color-scheme이 테마에 맞춘다
    <div className="min-h-screen bg-page p-6 text-sm text-fg">
      <div className={cn('mx-auto flex flex-col gap-6', !wide && 'max-w-xl')}>{children}</div>
    </div>
  )
}
