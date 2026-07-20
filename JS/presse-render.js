(function () {
  'use strict';

  const newsMain = document.querySelector('.page-presse .news-main');
  if (!newsMain) return;

  const staticSections = Array.from(newsMain.querySelectorAll('.news-feature-section'));
  const contactSection = newsMain.querySelector('.press-cta-section');
  const stylesheetHref = 'css/subpages/presse-dynamic.css';
  const idPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/i;
  const imagePattern = /^assets\/IMG\/news\/(?:managed\/)?[A-Za-z0-9._-]+\.(?:webp|jpe?g|png)$/i;

  function ensureStylesheet() {
    if (document.querySelector('link[href="' + stylesheetHref + '"]')) return;

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = stylesheetHref;
    document.head.append(stylesheet);
  }

  function validArticle(article) {
    return article && typeof article === 'object'
      && typeof article.id === 'string' && idPattern.test(article.id)
      && typeof article.date === 'string' && (article.date === '' || /^\d{4}-\d{2}-\d{2}$/.test(article.date))
      && typeof article.title === 'string' && article.title.trim() !== '' && article.title.length <= 240
      && typeof article.subtitle === 'string' && article.subtitle.length <= 240
      && typeof article.image === 'string' && imagePattern.test(article.image)
      && typeof article.text === 'string' && article.text.trim() !== '' && article.text.length <= 20000
      && typeof article.managedUpload === 'boolean';
  }

  function createTitle(article, titleId) {
    const title = document.createElement('h2');
    title.className = 'news-feature__title';
    title.id = titleId;
    title.lang = document.documentElement.lang || 'de';

    const mainLine = document.createElement('span');
    mainLine.textContent = article.title.trim();
    title.append(mainLine);

    const subtitle = article.subtitle.trim();
    if (subtitle !== '') {
      const detail = document.createElement('small');
      detail.textContent = subtitle;
      title.append(detail);
    }

    return title;
  }

  function createArticleSection(article, index) {
    const titleId = 'news-' + article.id + '-title';
    const section = document.createElement('section');
    section.className = 'section news-feature-section';
    section.setAttribute('aria-labelledby', titleId);

    const container = document.createElement('div');
    container.className = 'container';

    const articleElement = document.createElement('article');
    articleElement.className = 'news-feature' + (index % 2 === 1 ? ' news-feature--red' : '');
    articleElement.dataset.aos = 'fade-up';

    const header = document.createElement('div');
    header.className = 'news-feature__header';

    const titleBlock = document.createElement('div');
    titleBlock.className = 'news-feature__title-block';

    if (article.date !== '') {
      const time = document.createElement('time');
      time.className = 'news-feature__date';
      time.dateTime = article.date;
      time.textContent = article.date;
      titleBlock.append(time);
    }

    titleBlock.append(createTitle(article, titleId));

    const figure = document.createElement('figure');
    figure.className = 'news-feature__media';

    const imageWrap = document.createElement('div');
    imageWrap.className = 'news-feature__image-placeholder';

    const image = document.createElement('img');
    image.src = article.image;
    image.alt = [article.title, article.subtitle].filter((part) => part.trim() !== '').join(' ');
    image.loading = index === 0 ? 'eager' : 'lazy';
    image.decoding = 'async';
    imageWrap.append(image);
    figure.append(imageWrap);

    header.append(titleBlock, figure);

    const body = document.createElement('div');
    body.className = 'news-feature__body';
    article.text
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
      .filter(Boolean)
      .forEach((paragraphText) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = paragraphText;
        body.append(paragraph);
      });

    articleElement.append(header, body);
    container.append(articleElement);
    section.append(container);
    return section;
  }

  ensureStylesheet();

  fetch('data/presse.json', { credentials: 'same-origin', cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('News-Daten nicht verfügbar')))
    .then((articles) => {
      if (!Array.isArray(articles) || !articles.every(validArticle)) throw new Error('Ungültige News-Daten');
      if (new Set(articles.map((article) => article.id)).size !== articles.length) throw new Error('Doppelte News-ID');

      const fragment = document.createDocumentFragment();
      articles.forEach((article, index) => fragment.append(createArticleSection(article, index)));

      const insertionPoint = contactSection || staticSections[0] || null;
      newsMain.insertBefore(fragment, insertionPoint);
      staticSections.forEach((section) => section.remove());

      if (window.AOS && typeof window.AOS.refreshHard === 'function') {
        window.AOS.refreshHard();
      } else if (window.AOS && typeof window.AOS.refresh === 'function') {
        window.AOS.refresh();
      }
    })
    .catch(() => {
      // The two static articles in presse.html remain available as a fallback.
    });
}());
