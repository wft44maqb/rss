const Router = require('@/utils/router')
const getRss = require('@/utils/template')

const r = new Router()
r.get(WK_PRE + '/jiandan/article', compose(require('@/routes/jandan/article')))
r.get(WK_PRE + '/jiandan/:sub_model', compose(require('@/routes/jandan/pic')))

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

  if (!response || WK_DEBUG == 'on') {
    response = await handleRoute(event.request)

    // Cache API respects Cache-Control headers. Setting s-max-age to 10
    // will limit the response to be in cache for 10 seconds max

    // Any changes made to the response here will be reflected in the cached value
    response.headers.append(
      'Cache-Control',
      's-maxage=' + (WK_DEBUG == 'on' ? 0 : '60'), // eslint-disable-line
    )

    // Store the fetched response as cacheKey
    // Use waitUntil so you can return the response without blocking on
    // writing to cache
    //
    event.waitUntil(cache.put(cacheKey, response.clone()))
  }
  return response
}

function compose(fn) {
  return async function(req, params) {
    let data = await fn(params)

    data = getRss(req, data)
    let init = {
      headers: {
        'content-type': 'application/xml;charset=utf-8',
      },
    }

    return new Response(data, init)
  }
}

// set routes needed
async function handleRoute(request) {
  return await r.route(request)
}
