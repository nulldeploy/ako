export const Slider = () => {
  new Swiper(".__slider", {
    // Main
    slidesPerView: "auto",
    centeredSlides: true,
    loop: true,
    mouseWheel: {
      forceToAxis: true,
    },

    // Pagination
    pagination: {
      el: ".swiper-pagination",
    },

    // Navigation
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },

    // Scrollbar
    scrollbar: {
      el: ".swiper-scrollbar",
    },
  });
};
