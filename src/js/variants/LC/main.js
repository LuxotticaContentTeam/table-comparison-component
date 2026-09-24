import infoStore from "./info_store";
import productService from "./product_service";

// The variant says where the locale comes from and which product service to
// talk to. main.js imports this module as "@currentVariant@" and the bundler
// inlines the whole thing, so only the brand being built ships.
export { infoStore, productService };
