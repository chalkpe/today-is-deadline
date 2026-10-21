import { cellColor } from '@renderer/shared/lib/color'
import { WEEKDAYS_KO } from '@shared/model/calendar'
import { Fragment } from 'react'
import { gridIntensities } from './charts'

const HOUR_MARKS = [0, 6, 12, 18]

type Props = {
  /** 월요일부터 7행 × 0~23시 24열의 타수 */
  grid: number[][]
  baseColor: string
}

/** 요일 × 시간 히트맵. 강도는 격자 안의 최댓값 기준 상대 모드. 열은 창 너비를 나눠 채운다. */
export function DowHourGrid({ grid, baseColor }: Props) {
  const intensities = gridIntensities(grid)
  const rows = WEEKDAYS_KO.map((label, day) => ({
    label,
    cells: (intensities[day] ?? []).map((intensity, hour) => ({ hour, intensity })),
  }))
  return (
    <div className="grid grid-cols-[auto_repeat(24,minmax(0,1fr))] gap-0.5 text-[10px] leading-none text-neutral-500">
      <span />
      {HOUR_MARKS.map((hour) => (
        // 6시간 묶음의 왼쪽 끝 = 그 시각의 칸
        <span key={hour} className="col-span-6 pb-1">{`${hour}시`}</span>
      ))}
      {rows.map((row) => (
        <Fragment key={row.label}>
          <span className="flex items-center pr-2">{row.label}</span>
          {row.cells.map((cell) => (
            <div key={cell.hour} className="h-4 rounded-[2px]" style={{ background: cellColor(baseColor, cell.intensity) }} />
          ))}
        </Fragment>
      ))}
    </div>
  )
}
