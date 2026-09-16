// Store info for SGH.
//
// The locale comes from the `lang` attribute on the <html> tag: "en-US" on /us,
// "en-CA" on /ca-en, "fr-CA" on /ca-fr. It is server-rendered — it is already
// in the markup before any script runs — so this resolves on the first tick.
//
// This replaces the previous ct_data / wcs_config polling: those globals are
// deprecated, and they land several seconds after navigation on a cold load, so
// the module used to wait on them before it could render. Nothing here reads
// them any more.
//
// NOTE: verified on sunglasshut.com only. Every other brand still detects the
// locale its own way — check the html lang attribute on that storefront before
// porting this approach across (see README, "How content flows").

// MOCK STORE INFO,
const infoStoreLocal = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let info_store = {
        brand: "SGH",
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
  brand: "SGH",
  lang: locale.split("-")[0].toLowerCase(), // en | fr
  country: locale.toLowerCase(), // en-us | en-ca | fr-ca
});

const infoStoreProd = () => {
  return new Promise((resolve) => {
    const locale = document.documentElement.getAttribute("lang");

    if (locale) {
      resolve(fromHtmlLang(locale));
    } else {
      // Should not happen on sunglasshut.com. Rendering the English copy beats
      // rendering nothing, but say so in the console: on a non-English market
      // it means the page is showing the wrong language.
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
