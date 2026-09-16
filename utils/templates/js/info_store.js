// MOCK STORE INFO,
const infoStoreLocal = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      let info_store = {
        brand: "BRAND",
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
const infoStoreProd = () => {
  //TODO: TO CHANGE WITH BRAND FUNCTION
  return new Promise((resolve, reject) => {
    if (window.lang) {
      let info_store = {
        lang: ct_data.lang.split("_")[0], // EN
        storeId: ct_data.storeId, // 12001
        catalog: ct_data.catalogID, // 241241
        country: ct_data.lang.replace("_", "-").toLowerCase(), // EN-US
        langID: ct_data.langID, // -1
      };

      resolve(info_store);
    } else {
      setTimeout(() => {
        infoStoreProd().then(resolve).catch(reject);
      }, 300);
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
