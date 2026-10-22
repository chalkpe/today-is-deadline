import { api } from '@renderer/shared/lib/ipc'
import { NO_DRAG_REGION } from '@renderer/shared/ui/region'
import { WIDGET_MIN_WIDTH } from '@shared/model/settings'
import { cn } from 'cn'
import { type PointerEvent, useEffect, useRef, useState } from 'react'

const SEND_INTERVAL_MS = 60

/** 마지막 값만 남기는 앞·끝 스로틀. 끌기가 끝나면 flush로 남은 값을 바로 보낸다. */
function throttleLatest(send: (value: number) => void, ms: number) {
  let last = Number.NEGATIVE_INFINITY
  let pending: number | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    if (pending === null) return
    send(pending)
    pending = null
    last = Date.now()
  }
  return {
    push(value: number) {
      pending = value
      if (timer !== undefined) return
      const wait = ms - (Date.now() - last)
      if (wait <= 0) flush()
      else timer = setTimeout(flush, wait)
    },
    flush,
    cancel() {
      clearTimeout(timer)
      timer = undefined
      pending = null
    },
  }
}

type Props = { maxWidth: number }

/**
 * 오른쪽 가장자리 6px를 끌어 위젯 너비를 바꾼다. 창이 끌리는 동안 크기가 바뀌므로 화면 좌표(screenX)로 계산한다.
 * 잠금 중에는 부모가 그리지 않는다(main도 잠금 중 너비 요청을 무시한다).
 */
export function ResizeHandle({ maxWidth }: Props) {
  const [sender] = useState(() => throttleLatest((width) => api.invoke('widget:resize', { width }), SEND_INTERVAL_MS))
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => () => sender.cancel(), [sender])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.screenX, startWidth: window.innerWidth }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const width = Math.round(drag.current.startWidth + event.screenX - drag.current.startX)
    sender.push(Math.min(maxWidth, Math.max(WIDGET_MIN_WIDTH, width)))
  }
  const onPointerEnd = () => {
    if (!drag.current) return
    drag.current = null
    sender.flush()
  }

  return (
    <div
      className={cn('absolute inset-y-0 right-0 w-1.5 cursor-ew-resize hover:bg-control-border/60', NO_DRAG_REGION)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
    />
  )
}
