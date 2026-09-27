self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (self.caches) {
        const keys = await self.caches.keys()
        await Promise.all(keys.map((key) => self.caches.delete(key)))
      }
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      await Promise.all(clients.map((client) => client.navigate(client.url)))
    })(),
  )
})
