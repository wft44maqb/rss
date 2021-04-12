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
const cheerio = require('cheerio')
const got = require('@/utils/got')

module.exports = async () => {
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
