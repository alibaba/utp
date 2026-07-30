(function () {
  'use strict';

  // 导航树、面包屑、前后页、页面元信息均由构建脚本（scripts/build-docs.mjs）
  // 根据 manifest.json 在构建时静态写入 html（SEO 可直接抓取）；
  // 本脚本只负责运行时交互：移动端抽屉、页内目录高亮、代码复制。
  var root = document.documentElement;
  root.classList.add('js');

  function closeMenu() {
    document.body.classList.remove('nav-open');
    var menuButton = document.querySelector('[data-menu-toggle]');
    if (menuButton) {
      menuButton.setAttribute('aria-expanded', 'false');
    }
  }

  function bindMenu() {
    var menuButton = document.querySelector('[data-menu-toggle]');
    if (!menuButton) {
      return;
    }
    menuButton.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });
  }

  // 导航树为构建时静态生成；这里只负责移动端点击叶子后收起抽屉
  function bindNavigation() {
    var navigation = document.querySelector('[data-site-nav]');
    if (!navigation) {
      return;
    }
    navigation.addEventListener('click', function (event) {
      var target = event.target;
      var link = target && target.closest ? target.closest('a') : null;
      if (link && window.matchMedia('(max-width: 767px)').matches) {
        closeMenu();
      }
    });
  }

  function renderToc() {
    var article = document.querySelector('.spec-content');
    var toc = document.querySelector('[data-page-toc]');
    if (!article || !toc) {
      return;
    }

    var headings = Array.from(article.querySelectorAll('h2[id], h3[id], h4[id]'));
    if (!headings.length) {
      toc.hidden = true;
      return;
    }

    var links = new Map();
    headings.forEach(function (heading) {
      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.dataset.level = heading.tagName.slice(1);
      link.textContent = heading.textContent;
      links.set(heading.id, link);
      toc.appendChild(link);
    });

    function activate(heading) {
      links.forEach(function (link) {
        link.removeAttribute('aria-current');
      });
      var activeLink = heading && links.get(heading.id);
      if (activeLink) {
        activeLink.setAttribute('aria-current', 'location');
      }
    }

    var ticking = false;
    function updateActiveHeading() {
      var active = headings[0];
      headings.forEach(function (heading) {
        if (heading.getBoundingClientRect().top <= 88) {
          active = heading;
        }
      });
      activate(active);
      ticking = false;
    }

    function scheduleUpdate() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateActiveHeading);
      }
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(scheduleUpdate, {
        rootMargin: '-48px 0px -70% 0px',
      });
      headings.forEach(function (heading) {
        observer.observe(heading);
      });
    }
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('hashchange', scheduleUpdate);
    updateActiveHeading();
  }

  function addCopyButtons() {
    document.querySelectorAll('pre').forEach(function (block) {
      // pre 自身是滚动容器，按钮不能挂在其内部（会随内容滚动）；
      // 包一层定位容器，按钮相对容器固定在右上角
      var wrapper = document.createElement('div');
      wrapper.className = 'code-block';
      block.parentNode.insertBefore(wrapper, block);
      wrapper.appendChild(block);

      var button = document.createElement('button');
      button.className = 'copy-button';
      button.type = 'button';
      button.textContent = '复制';
      button.addEventListener('click', function () {
        var code = block.querySelector('code');
        var text = code ? code.textContent : block.textContent;
        if (!navigator.clipboard) {
          return;
        }
        navigator.clipboard.writeText(text).then(function () {
          button.textContent = '已复制';
          window.setTimeout(function () {
            button.textContent = '复制';
          }, 1200);
        });
      });
      wrapper.appendChild(button);
    });
  }

  bindMenu();
  bindNavigation();
  renderToc();
  addCopyButtons();
})();
