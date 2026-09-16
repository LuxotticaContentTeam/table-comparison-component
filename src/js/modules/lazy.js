import { customLog, eventDispatch } from "./utils";

const Lazy = ({ offset = 0, selector }) => {
  let options = {
    rootMargin: `${offset}px`,
    threshold: [0],
  };

  // INTERSECTION OBSERVER
  const getIntersect = (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        eventDispatch(`${selector}__loadData`);
        observer.unobserve(document.querySelector(selector));
      }
    });
  };

  if (!document.querySelector(selector)) return;

  let observer = new IntersectionObserver(getIntersect, options);
  observer.observe(document.querySelector(selector));

  // BACKUP SCROLL LAZY
  const scrollBackupLazy = () => {
    if (document.querySelector(selector)) {
      if (document.querySelector(selector).dataset.loaded) {
        window.removeEventListener("scroll", scrollBackupLazy);
      } else {
        if (document.querySelector(selector).getBoundingClientRect().top < window.innerHeight * 0.8) {
          customLog("[LAZY] - Loaded with backup lazy", "", "warn");
          eventDispatch(`${selector}__loadData`);
          if (!!observer) observer.unobserve(document.querySelector(selector));
        }
      }
    }
  };
  window.addEventListener("scroll", scrollBackupLazy);
  setTimeout(scrollBackupLazy, 100);
};

export default Lazy;
