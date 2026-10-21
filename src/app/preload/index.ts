import { createElectronApi } from '@shared/ipc'
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', createElectronApi(ipcRenderer))
