const cheerio = require('cheerio')

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
  if (!response) {
    const data = await route(request)
    const json = JSON.stringify(data)
    let init = {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    }

    console.log("url: ", request.url);
    response = new Response(json, init)
    // Cache API respects Cache-Control headers. Setting s-max-age to 10
    // will limit the response to be in cache for 10 seconds max

    // Any changes made to the response here will be reflected in the cached value
    response.headers.append('Cache-Control', 's-maxage=60')

    // Store the fetched response as cacheKey
    // Use waitUntil so you can return the response without blocking on
    // writing to cache
    event.waitUntil(cache.put(cacheKey, response.clone()))
  }
  console.log("response: ", JSON.stringify(response));
  return response
}

/**
 * get html content by url
 * @param url
 * @param init config
 *
 * doc:
 * https://developers.cloudflare.com/workers/runtime-apis/request#requestinit
 * @return text
 * */
async function got(
  url,
  init = {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
  },
) {
  const response = await fetch(url, init)
  const { headers } = response
  const contentType = headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return JSON.stringify(await response.json())
  } else {
    return await response.text()
  }
}

/**
 * apply spec rules for spec web
 * @return object
 * {
      title: `煎蛋 - 首页`,
      link: `http://jandan.net/`,
      description: '煎蛋 - 地球上没有新鲜事',
      item: items,
   }
 * */
async function setData() {
  const url = 'http://jandan.net'
  const results = await got(url)
  const $ = cheerio.load(results)
  const list = $('div.list-post').get()

  const items = await Promise.all(
    list.map(async li => {
      let $ = cheerio.load(li)
      const link = $('a')
        .first()
        .attr('href')
      const title = $('a')[1].children[0].data
      const summary = $('div.indexs')
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim()
      const author = $('div.time_s > a')
        .first()
        .text()
      let imgUrl =
        'http:' + ($('img').attr('src') || $('img').attr('data-original'))
      if (imgUrl.slice(-7) === '!square') {
        imgUrl = imgUrl.slice(0, -7)
      }

      // get fulltext
      const txtRes = await got(link)
      $ = cheerio.load(txtRes)
      const [, year, month, day, hour, minute] = $('div.time_s')
        .text()
        .match(/.+@\s+(\d+)\.(\d+)\.(\d+)\s,\s(\d+):(\d+)/)
      const time = new Date(
        `${year}-${month}-${day}T${hour}:${minute}:00+0800`,
      ).toUTCString()

      const content = $('.f.post').first()
      content
        .find('h1')
        .prevAll()
        .remove()
        .end()
        .remove()
      content
        .find('div')
        .nextAll()
        .remove()
        .end()
        .remove()
      content.contents().each(function() {
        if (this.nodeType === 8) {
          $(this).remove()
        }
      })
      const text = content.html().trim()

      const description = `<blockquote><p>${summary}</p></blockquote><img src="${imgUrl}">${text}`

      const single = {
        title: title,
        description: description,
        link: link,
        pubDate: time,
        author: author,
      }
      return Promise.resolve(single)
    }),
  )
  return {
    title: `煎蛋 - 首页`,
    link: `http://jandan.net/`,
    description: '煎蛋 - 地球上没有新鲜事',
    item: items,
  }
}

async function route(request) {
  let url = new URL(request.url)
  if (url.pathname.startsWith('/jandan/article')) {
    return await setData()
  } else {
    return {
      title: 'default',
    }
  }
}
