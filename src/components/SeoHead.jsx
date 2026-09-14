import { useEffect } from 'react'

const SITE_URL = 'https://mcu-viewing-order.vercel.app'
const SITE_NAME = 'Incursion'

const pageMeta = {
  home: { title: 'MCU Viewing Order | Marvel, DC, X-Men & Sony Timeline Guide', description: 'Find the best viewing order for Marvel, DC, X-Men, and Sony superhero films and series. Track what you have watched and explore connected timelines.' },
  list: { title: 'Browse Superhero Titles | MCU Viewing Order', description: 'Browse and filter superhero films, series, specials, and one-shots by universe, phase, genre, rating, and viewing status.' },
  analytics: { title: 'Viewing Analytics | MCU Viewing Order', description: 'See your superhero watch progress, completion rate, watch time, and saved titles in one focused dashboard.' },
  watch: { title: 'Now Watching | MCU Viewing Order', description: 'Continue watching your selected superhero title with timeline context and progress tracking.' },
  profile: { title: 'Profile & Watch History | MCU Viewing Order', description: 'Manage your MCU Viewing Order profile, saved titles, and personal watch history.' },
}

function upsertMeta(attribute, value, content) {
  let element = document.head.querySelector(`meta[${attribute}="${value}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, value)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export default function SeoHead({ section = 'home', selectedTitle }) {
  useEffect(() => {
    const meta = pageMeta[section] || pageMeta.home
    const title = selectedTitle ? `${selectedTitle} | ${SITE_NAME}` : meta.title
    const description = selectedTitle ? `Explore ${selectedTitle} in the superhero viewing order, with timeline placement, ratings, and watch progress.` : meta.description
    const canonical = `${SITE_URL}${selectedTitle ? `/#detail/${encodeURIComponent(selectedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}` : `/#${section}`}`
    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:image', `${SITE_URL}/og-image.jpg`)
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', `${SITE_URL}/og-image.jpg`)
    upsertLink('canonical', canonical)

    const existing = document.getElementById('site-structured-data')
    if (existing) existing.remove()
    const script = document.createElement('script')
    script.id = 'site-structured-data'
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: meta.description, potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/#list?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
        { '@type': 'LocalBusiness', '@id': `${SITE_URL}/#business`, name: SITE_NAME, url: SITE_URL, image: `${SITE_URL}/og-image.jpg`, description: 'Independent superhero viewing-order guide and watch tracker.', areaServed: 'Worldwide', priceRange: 'Free' },
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: meta.title.split(' | ')[0], item: canonical }] },
      ],
    })
    document.head.appendChild(script)
    return () => script.remove()
  }, [section, selectedTitle])

  return null
}
