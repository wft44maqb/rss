const route = require('./src/utils/router')
const debug = false
addEventListener('fetch', event => {
  try {
    return event.respondWith(handleRequest(event))
  } catch (e) {
    return event.respondWith(new Response('Error thrown ' + e.message))
  }
})

/**
 * handleRequest wrapper data to json
 * width cache feature
 * */
async function handleRequest(event) {
  const request = event.request
  const cacheUrl = new URL(request.url)

  // Construct the cache key from the cache URL
  const cacheKey = new Request(cacheUrl.toString(), request)
  const cache = caches.default

  // Check whether the value is already available in the cache
  // if not, you will need to fetch it from origin, and store it in the cache
  // for future access
  let response = await cache.match(cacheKey)
  // console.log("============debugger=============")
  // console.log(response)
  // console.log("============debugger=============")
  if (!response || debug) {
    const data = await route(event)
    let init = {
      headers: {
        'content-type': 'application/xml;charset=UTF-8',
      },
    }

    response = new Response(data, init)

    // Cache API respects Cache-Control headers. Setting s-max-age to 10
    // will limit the response to be in cache for 10 seconds max

    // Any changes made to the response here will be reflected in the cached value
    response.headers.append('Cache-Control', 's-maxage=' + debug ? 0 : '300')

    // Store the fetched response as cacheKey
    // Use waitUntil so you can return the response without blocking on
    // writing to cache
    event.waitUntil(cache.put(cacheKey, response.clone()))
  }
  return response
}
