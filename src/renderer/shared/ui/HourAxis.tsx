import { cn } from 'cn'

const MARKS = [0, 6, 12, 18, 24]

/**
 * 하루(0~24시)를 가로로 채운 그림 아래의 0시·6시·12시·18시·24시 눈금.
 * 폭 0인 칸을 양 끝까지 고르게 벌려 0·25·50·75·100% 지점에 글자를 둔다(양 끝 글자는 안쪽으로 붙인다).
 */
export function HourAxis() {
  return (
    <div className="flex justify-between text-[10px] leading-none text-fg-muted">
      {MARKS.map((hour, i) => (
        <span
          key={hour}
          className={cn(
            'flex w-0 whitespace-nowrap',
            i === 0 ? 'justify-start' : i === MARKS.length - 1 ? 'justify-end' : 'justify-center',
          )}
        >
          {`${hour}시`}
        </span>
      ))}
    </div>
  )
}
