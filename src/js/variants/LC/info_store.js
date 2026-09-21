// Store info for LC.
//
// Copied from the SGH variant, which reads the locale off the `lang` attribute
// on the <html> tag — server-rendered, so it resolves on the first tick without
// waiting on any global.
//
// NOTE: that approach is verified on sunglasshut.com ONLY. It has NOT been
// checked on lenscrafters.com. Confirm the storefront server-renders <html lang>
// before trusting this on a live LC page; if it does not, the module falls back
// to English everywhere and says so in the console.
//
// The same caveat applies to the product call, which is a separate thing: it
// reads window.storeId / window.langId (src/js/modules/productApi.js) and is
// documented for SGH only. If LC does not publish those two globals, the table
// renders its authored copy with no packshot, price or CTA link.

// MOCK STORE INFO,
const infoStoreLocal = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let info_store = {
        brand: "LC",
        lang: document.querySelector("#ct_lang").getAttribute("lang"),
        storeId: "12001",
        currency: "$",
        catalog: "",
        country: document.querySelector("#ct_lang").getAttribute("country"),
        langID: "-1",
      };

      resolve(info_store);
    }, 1000);
  });
};

// "en-US" -> { lang: "en", country: "en-us" } — the two fields getTrad() reads.
// A bare "en" is tolerated: country falls back to the language alone, which
// getTrad() still matches against the "en" key in the content json.
const fromHtmlLang = (locale) => ({
  brand: "LC",
  lang: locale.split("-")[0].toLowerCase(), // en | fr
  country: locale.toLowerCase(), // en-us | en-ca | fr-ca
});

const infoStoreProd = () => {
  return new Promise((resolve) => {
    const locale = document.documentElement.getAttribute("lang");

    if (locale) {
      resolve(fromHtmlLang(locale));
    } else {
      console.warn("[@projectName@] no lang attribute on <html>, falling back to en-us");
      resolve(fromHtmlLang("en-US"));
    }
  });
};

var infoStore;

if ("@env@" === "development") {
  infoStore = infoStoreLocal;
} else {
  infoStore = infoStoreProd;
}

export default infoStore;
