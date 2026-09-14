/// <reference types="vite/client" />

// Allow importing image files
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.jpeg" {
  const src: string;
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.webp" {
  const src: string;
  export default src;
}
declare module "*.svg" {
  const src: string;
  export default src;
}

// Allow importing CSS as URL
declare module "*.css?url" {
  const url: string;
  export default url;
}
