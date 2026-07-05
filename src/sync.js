// Wires the local store to Supabase when someone is signed in:
//  - on sign-in: pull cloud follows/progress, merge (union follows, newest
//    progress wins), then push anything that only exists locally
//  - afterwards: every local mutation writes through to the cloud
import { store, setMutationHook } from './store.js'
import {
  cloudEnabled, initAuth, subscribeAuth,
  fetchCloudState, cloudSetFollow, cloudSaveProgress, cloudClearProgress,
} from './social.js'

async function fullSync() {
  const cloud = await fetchCloudState()
  if (!cloud) return
  const localOnly = store.mergeCloud(cloud)
  for (const [titleId, entry] of localOnly.follows) await cloudSetFollow(titleId, entry)
  for (const [titleId, entry] of localOnly.progress) await cloudSaveProgress(titleId, entry)
}

export function initSync() {
  if (!cloudEnabled) return

  setMutationHook((type, titleId, entry) => {
    if (type === 'follow') cloudSetFollow(titleId, entry)
    else if (type === 'progress') cloudSaveProgress(titleId, entry)
    else if (type === 'clearProgress') cloudClearProgress()
  })

  let lastUserId = null
  subscribeAuth((user) => {
    if (user && user.id !== lastUserId) {
      lastUserId = user.id
      fullSync()
    }
    if (!user) lastUserId = null
  })
  initAuth()
}
