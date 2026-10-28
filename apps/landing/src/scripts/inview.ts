// Plays each [data-scene] only while it is on screen, so off-screen loops
// don't burn battery and each scene starts from its first frame when you reach it.
const scenes = document.querySelectorAll<HTMLElement>("[data-scene]");

if ("IntersectionObserver" in window && scenes.length) {
  document.documentElement.classList.add("js");
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("is-inview", entry.isIntersecting);
      }
    },
    { threshold: 0.25 },
  );
  scenes.forEach((scene) => io.observe(scene));
}
