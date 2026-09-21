import infoStore from "./info_store";

// The variant's only job is to say where the locale comes from. main.js imports
// this module as "@currentVariant@" and takes `infoStore` from it; the bundler
// inlines the whole thing, so nothing else here is reachable.
export { infoStore };
