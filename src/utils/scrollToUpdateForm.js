export function scrollToUpdateForm(selector = '.content-stack > .panel:first-of-type') {
  window.requestAnimationFrame(() => {
    const target = document.querySelector(selector);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
