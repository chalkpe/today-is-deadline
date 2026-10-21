export type Debounced = {
  call(): void
  /** 대기 중인 실행이 있으면 지금 실행한다(종료 직전 저장용). */
  flush(): void
  cancel(): void
}

/** 마지막 호출 뒤 ms 동안 조용하면 fn을 한 번 실행한다. 인자 없이 실행 시점의 상태를 읽는 fn에 쓴다. */
export function debounce(fn: () => void, ms: number): Debounced {
  let timer: ReturnType<typeof setTimeout> | undefined
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  return {
    call() {
      cancel()
      timer = setTimeout(() => {
        timer = undefined
        fn()
      }, ms)
    },
    flush() {
      if (timer === undefined) return
      cancel()
      fn()
    },
    cancel,
  }
}

export type Throttled = { call(): void; cancel(): void }

/** 첫 호출은 바로 실행하고, ms 창 안의 나머지 호출은 창 끝에 한 번으로 묶는다(앞·끝 실행). */
export function throttle(fn: () => void, ms: number): Throttled {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending = false

  const open = () => {
    timer = setTimeout(() => {
      timer = undefined
      if (!pending) return
      pending = false
      fn()
      open()
    }, ms)
  }

  return {
    call() {
      if (timer !== undefined) {
        pending = true
        return
      }
      fn()
      open()
    },
    cancel() {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      pending = false
    },
  }
}
