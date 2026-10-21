import { useRef } from 'react'
import { useAlertAudio } from '../model/useAlertAudio'

/** 화면에 보이지 않는 알림음 재생기. 위젯 창은 숨겨져도 살아 있으므로 여기서 울린다. */
export function AlertAudio() {
  const ref = useRef<HTMLAudioElement>(null)
  useAlertAudio(ref)
  return <audio ref={ref} className="hidden" />
}
