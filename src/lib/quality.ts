// How much the 3D museum asks of the device. Phones and tablets get a lighter
// museum: their browsers allow a page far less memory for 3D, and iOS closes a
// page that goes over ("A problem repeatedly occurred").

const lite =
  typeof window !== "undefined" &&
  (window.matchMedia("(pointer: coarse)").matches || Math.min(window.screen.width, window.screen.height) < 700);

export const QUALITY = lite
  ? {
      lite: true,
      /** Most pixels drawn per screen pixel. */
      dpr: 1.25,
      /** Mirror-like floors (they draw the scene twice). */
      reflect: false,
      /** Pictures within this distance (m) have their image loaded... */
      near: 14,
      /** ...and within this one are built at all; further away they're let go. */
      keep: 30,
      /** Wall texts within this distance (m) are lettered. */
      texts: 22,
      /** Most texture pixels per metre of wall text. */
      ppm: 420,
      /** The painting image size to ask Wikimedia for. */
      image: "/960px-",
    }
  : { lite: false, dpr: 2, reflect: true, near: 30, keep: 60, texts: 40, ppm: 760, image: "/1920px-" };
