import type { SetSlice } from './setSlice'
import type { SimSlice } from './simSlice'
import type { UISlice } from './uiSlice'
import type { FolderSlice } from './folderSlice'

export type AppState = SetSlice & SimSlice & UISlice & FolderSlice
