import { cellColor } from '@renderer/shared/lib/color'
import { stripIntensities } from './charts'

type Props = {
  /** 10분 버킷 144개의 타수 */
  values: number[]
  baseColor: string
}

/** 하루를 10분 칸으로 나눈 가느다란 띠. 강도는 띠 안의 최댓값 기준 상대 모드 */
export function Strip({ values, baseColor }: Props) {
  const cells = stripIntensities(values).map((intensity, i) => ({ minute: i * 10, intensity }))
  return (
    <div className="flex h-4 gap-px">
      {cells.map((cell) => (
        <div key={cell.minute} className="min-w-0 flex-1 rounded-[1px]" style={{ background: cellColor(baseColor, cell.intensity) }} />
      ))}
    </div>
  )
}
