import type { Settings } from '@shared/model/settings'
import type { Adjustment, TodayStats } from '@shared/model/stats'
import type { PermissionStatus } from './events'

// main → renderer
export const PUSH = {
  TODAY: 'push:today',
  SETTINGS: 'push:settings',
  COUNTING: 'push:counting',
  ALERT: 'push:alert',
  ADJUSTMENTS: 'push:adjustments',
  PERMISSION: 'push:permission',
} as const

export interface IPush {
  'push:today': TodayStats
  'push:settings': Settings
  'push:counting': boolean
  'push:alert': { action: 'play'; url: string } | { action: 'stop' }
  'push:adjustments': Adjustment[]
  'push:permission': PermissionStatus
}
