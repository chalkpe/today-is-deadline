import { WIDGET_BACKGROUND } from '@renderer/shared/lib/color'
import { type ReactNode, useEffect } from 'react'

/** windowTitle은 창 제목 막대에 보이는 document.title이다 */
type Props = { windowTitle: string; children: ReactNode }

/** 프레임 있는 일반 창(설정·가감 등)의 바탕. body는 위젯 때문에 투명하므로 배경을 직접 칠한다. */
export function Page({ windowTitle, children }: Props) {
  useEffect(() => {
    document.title = windowTitle
  }, [windowTitle])
  return (
    // color-scheme이 날짜·숫자 입력과 스크롤 막대 같은 기본 컨트롤도 어둡게 그린다
    <div className="min-h-screen p-6 text-sm text-neutral-200 [color-scheme:dark]" style={{ background: WIDGET_BACKGROUND }}>
      <div className="mx-auto flex max-w-xl flex-col gap-6">{children}</div>
    </div>
  )
}
