const getRss = require('./template')
const { match, pathToRegexp } = require('path-to-regexp')

async function route(event) {
  const url = new URL(event.request.url)
  let data = await to(
    event,
    '/jandan/article',
    url.pathname,
    require('../routes/jandan/article'),
  )
  if (data) return data
  data = await to(
    event,
    '/jandan/:sub_model',
    url.pathname,
    require('../routes/jandan/pic'),
  )
  if (data) return data

  return 'not match'
}

async function to(event, patten, pathname, handler) {
  let params = {}
  const regexp = pathToRegexp(patten)
  if (regexp.test(pathname)) {
    const fn = match(patten, { decode: decodeURIComponent })
    params = fn(pathname).params

    // console.log('===============debugger start ===============')
    // console.log(handler, params, pathname)
    // console.log('===============debugger end ===============')
    let data = await handler(params)
    return await getRss(event, data)
  }

  return ''
}

module.exports = route
