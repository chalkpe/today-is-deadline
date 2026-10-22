import { DEFAULT_SETTINGS, type Settings } from '@shared/model/settings'
import { describe, expect, it, vi } from 'vitest'
import { createAppearanceApplier } from './appearance'

const withAppearance = (appearance: Settings['general']['appearance']): Settings => ({
  ...DEFAULT_SETTINGS,
  general: { ...DEFAULT_SETTINGS.general, appearance },
})

describe('createAppearanceApplier', () => {
  it('첫 apply는 항상 적용하고, 같은 값은 다시 적용하지 않으며, 바뀌면 적용한다', () => {
    const setThemeSource = vi.fn()
    const { apply } = createAppearanceApplier({ setThemeSource })
    apply(withAppearance('system'))
    expect(setThemeSource).toHaveBeenCalledTimes(1)
    expect(setThemeSource).toHaveBeenLastCalledWith('system')
    apply(withAppearance('system'))
    expect(setThemeSource).toHaveBeenCalledTimes(1)
    apply(withAppearance('dark'))
    expect(setThemeSource).toHaveBeenCalledTimes(2)
    expect(setThemeSource).toHaveBeenLastCalledWith('dark')
    apply(withAppearance('system'))
    expect(setThemeSource).toHaveBeenCalledTimes(3)
    expect(setThemeSource).toHaveBeenLastCalledWith('system')
  })
})
